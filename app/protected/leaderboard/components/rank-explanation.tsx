"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RankBadge } from "@/components/rank-badge";
import { Trophy } from "lucide-react";

export default function RankExplanation() {
  const ranks = [
    { tier: "Unranked", points: null, description: "New players who haven't completed any ranked matches" },
    { tier: "Bronze", points: "0-999", description: "Beginning of your ranked journey" },
    { tier: "Silver", points: "1000-1499", description: "Developing skills and strategies" },
    { tier: "Gold", points: "1500-1999", description: "Experienced players with solid gameplay" },
    { tier: "Platinum", points: "2000-2499", description: "Advanced players with strong strategies" },
    { tier: "Diamond", points: "2500-2999", description: "Elite players with exceptional skill" },
    { tier: "Master", points: "3000+", description: "The highest tier of competitive play" }
  ];

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Ranking System
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">How Ranks Work</h3>
            <p className="text-sm text-muted-foreground">
              Your rank is determined by your rank points. Win matches to gain points and climb the ranks!
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Points earned or lost depend on your current rank tier. Higher ranks earn fewer points for wins and lose more for losses:
            </p>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div>
                <h4 className="text-sm font-medium">Bronze</h4>
                <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
                  <li>Win: <span className="text-green-500 font-medium">+25 points</span></li>
                  <li>Lose: <span className="text-red-500 font-medium">-15 points</span></li>
                  <li>Draw: <span className="text-blue-500 font-medium">+5 points</span></li>
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-medium">Silver</h4>
                <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
                  <li>Win: <span className="text-green-500 font-medium">+20 points</span></li>
                  <li>Lose: <span className="text-red-500 font-medium">-18 points</span></li>
                  <li>Draw: <span className="text-blue-500 font-medium">+5 points</span></li>
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-medium">Gold</h4>
                <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
                  <li>Win: <span className="text-green-500 font-medium">+18 points</span></li>
                  <li>Lose: <span className="text-red-500 font-medium">-20 points</span></li>
                  <li>Draw: <span className="text-blue-500 font-medium">+5 points</span></li>
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-medium">Platinum</h4>
                <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
                  <li>Win: <span className="text-green-500 font-medium">+15 points</span></li>
                  <li>Lose: <span className="text-red-500 font-medium">-22 points</span></li>
                  <li>Draw: <span className="text-blue-500 font-medium">+5 points</span></li>
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-medium">Diamond</h4>
                <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
                  <li>Win: <span className="text-green-500 font-medium">+12 points</span></li>
                  <li>Lose: <span className="text-red-500 font-medium">-25 points</span></li>
                  <li>Draw: <span className="text-blue-500 font-medium">+5 points</span></li>
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-medium">Master</h4>
                <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
                  <li>Win: <span className="text-green-500 font-medium">+10 points</span></li>
                  <li>Lose: <span className="text-red-500 font-medium">-30 points</span></li>
                  <li>Draw: <span className="text-blue-500 font-medium">+5 points</span></li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Rank Tiers</h3>
            <div className="space-y-3 mt-3">
              {ranks.map((rank) => (
                <div key={rank.tier} className="flex items-center gap-3">
                  <div className="w-24">
                    <RankBadge tier={rank.tier} showPoints={false} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{rank.tier}</span>
                      {rank.points && (
                        <span className="text-xs text-muted-foreground">
                          ({rank.points} points)
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{rank.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Matchmaking</h3>
            <p className="text-sm text-muted-foreground">
              The system attempts to match you with players of similar rank (within 300 points).
              If no suitable opponent is found, it will match you with any available player.
            </p>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Season Rewards</h3>
            <p className="text-sm text-muted-foreground">
              At the end of each season, players will receive rewards based on their highest achieved rank.
              Higher ranks earn more valuable rewards!
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
