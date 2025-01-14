import { createClient } from "@/utils/supabase/server";
import { GameState, GameAction } from "@/app/protected/play/game-engine/types";
import { ServerGameEngine } from "./server-game-engine";
import { Database } from "@/types/database.types";
import { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { Json } from "@/types/database.types";

interface GameSession {
  gameId: string;
  player1Id: string;
  player2Id: string;
  gameEngine: ServerGameEngine;
  lastActivity: number;
  player1Connected: boolean;
  player2Connected: boolean;
  channel: RealtimeChannel;
}

interface PresenceState {
  [key: string]: {
    user_id: string;
    online_at: string;
  }[];
}

interface PresenceEvent {
  key: string;
  newPresences?: { user_id: string; online_at: string }[];
  leftPresences?: { user_id: string; online_at: string }[];
}

// Helper function to serialize GameState to database-compatible format
function serializeGameState(state: GameState): Json {
  return JSON.parse(JSON.stringify(state)) as Json;
}

export class GameCoordinator {
  private activeSessions: Map<string, GameSession> = new Map();
  private readonly INACTIVE_TIMEOUT = 60000; // 1 minute
  private readonly SETUP_TIMEOUT = 30000; // 30 seconds
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Cleanup inactive sessions periodically
    this.cleanupInterval = setInterval(() => this.cleanupInactiveSessions(), 30000);
  }

  async initializeGame(
    supabase: SupabaseClient<Database>,
    player1Id: string,
    player2Id: string,
    player1Cards: any[],
    player2Cards: any[]
  ) {
    const gameId = this.generateGameId();
    const gameEngine = new ServerGameEngine(player1Cards, player2Cards);

    // Create real-time channel for the game
    const channel = supabase.channel(`game:${gameId}`)
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<{ user_id: string; online_at: string }>();
        this.updatePlayerPresence(gameId, state);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }: PresenceEvent) => {
        console.log('Player joined:', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }: PresenceEvent) => {
        console.log('Player left:', key, leftPresences);
      });

    await channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        // Track presence for both players
        await channel.track({
          user_id: player1Id,
          online_at: new Date().toISOString(),
        });
      }
    });

    // Create game session
    const session: GameSession = {
      gameId,
      player1Id,
      player2Id,
      gameEngine,
      lastActivity: Date.now(),
      player1Connected: false,
      player2Connected: false,
      channel,
    };

    this.activeSessions.set(gameId, session);

    // Create game record in database
    await supabase.from('active_games').insert({
      id: gameId,
      player1_id: player1Id,
      player2_id: player2Id,
      status: 'setup',
      game_state: serializeGameState(gameEngine.getGameState()),
    } as Database['public']['Tables']['active_games']['Insert']);

    return { gameId, initialState: this.getPlayerGameState(gameId, player1Id) };
  }

  async processGameAction(
    supabase: SupabaseClient<Database>,
    gameId: string,
    playerId: string,
    action: GameAction
  ) {
    const session = this.activeSessions.get(gameId);
    if (!session) {
      throw new Error('Game session not found');
    }

    // Verify player belongs to this game
    if (playerId !== session.player1Id && playerId !== session.player2Id) {
      throw new Error('Player not in this game');
    }

    // Update last activity
    session.lastActivity = Date.now();

    // Process the action
    const actionResult = session.gameEngine.processAction(action);
    if (!actionResult.success) {
      return { success: false, error: actionResult.error };
    }

    // Get appropriate game state for each player
    const player1State = this.getPlayerGameState(gameId, session.player1Id);
    const player2State = this.getPlayerGameState(gameId, session.player2Id);

    // Update game state in database
    await supabase
      .from('active_games')
      .update({
        game_state: serializeGameState(session.gameEngine.getGameState()),
        updated_at: new Date().toISOString(),
      } as Database['public']['Tables']['active_games']['Update'])
      .eq('id', gameId);

    // Send appropriate state to each player
    await session.channel.send({
      type: 'broadcast',
      event: 'game_state',
      payload: {
        [session.player1Id]: player1State,
        [session.player2Id]: player2State,
      },
    });

    // Return appropriate state for the requesting player
    return {
      success: true,
      state: playerId === session.player1Id ? player1State : player2State,
    };
  }

  private getPlayerGameState(gameId: string, playerId: string): GameState {
    const session = this.activeSessions.get(gameId);
    if (!session) throw new Error('Game session not found');

    const fullState = session.gameEngine.getGameState();
    const isPlayer1 = playerId === session.player1Id;

    // Return state with appropriate visible cards
    return {
      ...fullState,
      // Player 1 sees full player1Cards and visible player2Cards
      player1Cards: isPlayer1 ? fullState.player1Cards : [],
      player2Cards: isPlayer1 ? [] : fullState.player2Cards,
      // Each player sees their opponent's visible cards
      player1VisibleCards: fullState.player1VisibleCards,
      player2VisibleCards: fullState.player2VisibleCards,
    };
  }

  private updatePlayerPresence(gameId: string, presenceState: PresenceState) {
    const session = this.activeSessions.get(gameId);
    if (!session) return;

    const player1Present = Object.values(presenceState).some(
      presences => presences.some(presence => presence.user_id === session.player1Id)
    );
    const player2Present = Object.values(presenceState).some(
      presences => presences.some(presence => presence.user_id === session.player2Id)
    );

    session.player1Connected = player1Present;
    session.player2Connected = player2Present;

    // Handle disconnections
    if (!player1Present || !player2Present) {
      this.handlePlayerDisconnection(gameId);
    }
  }

  private async handlePlayerDisconnection(gameId: string) {
    const session = this.activeSessions.get(gameId);
    if (!session) return;

    // Start a timeout to end the game if player doesn't reconnect
    setTimeout(async () => {
      const currentSession = this.activeSessions.get(gameId);
      if (!currentSession) return;

      if (!currentSession.player1Connected || !currentSession.player2Connected) {
        // End the game due to disconnection
        await this.endGame(gameId, 'disconnection');
      }
    }, this.INACTIVE_TIMEOUT);
  }

  async endGame(gameId: string, reason: string) {
    const session = this.activeSessions.get(gameId);
    if (!session) return;

    // Clean up the session
    this.activeSessions.delete(gameId);

    // Update game status in database
    const supabase = await createClient();
    await supabase
      .from('active_games')
      .update({
        status: 'completed',
        winner_id: reason === 'disconnection' 
          ? (session.player1Connected ? session.player1Id : session.player2Id)
          : null,
      } as Database['public']['Tables']['active_games']['Update'])
      .eq('id', gameId);

    // Notify players
    await session.channel.send({
      type: 'broadcast',
      event: 'game_end',
      payload: { reason },
    });

    // Clean up channel
    await session.channel.unsubscribe();
  }

  private cleanupInactiveSessions() {
    const now = Date.now();
    // Convert Map entries to array before iterating
    Array.from(this.activeSessions.entries()).forEach(([gameId, session]) => {
      if (now - session.lastActivity > this.INACTIVE_TIMEOUT) {
        this.endGame(gameId, 'timeout').catch(console.error);
      }
    });
  }

  private generateGameId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  // Clean up when shutting down
  destroy() {
    clearInterval(this.cleanupInterval);
    // Clean up all active sessions
    Array.from(this.activeSessions.entries()).forEach(([gameId]) => {
      this.endGame(gameId, 'shutdown').catch(console.error);
    });
  }
}

// Create a singleton instance
export const gameCoordinator = new GameCoordinator();
