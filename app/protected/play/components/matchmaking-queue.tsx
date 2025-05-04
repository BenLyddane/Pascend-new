"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export function MatchmakingQueue() {
  const [dots, setDots] = useState("");
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [searchTime, setSearchTime] = useState(0);

  // Animate the loading dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => {
        if (prev.length >= 3) return "";
        return prev + ".";
      });
    }, 500);

    return () => clearInterval(interval);
  }, []);

  // Simulate queue position and search time
  useEffect(() => {
    // Start with a random position between 1 and 10
    setQueuePosition(Math.floor(Math.random() * 10) + 1);

    // Decrease queue position over time
    const positionInterval = setInterval(() => {
      setQueuePosition(prev => {
        if (prev === null || prev <= 1) return 1;
        return prev - 1;
      });
    }, 3000);

    // Increase search time
    const timeInterval = setInterval(() => {
      setSearchTime(prev => prev + 1);
    }, 1000);

    return () => {
      clearInterval(positionInterval);
      clearInterval(timeInterval);
    };
  }, []);

  // Format search time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Calculate time until simulated opponent (30 seconds)
  const timeUntilSimulated = Math.max(0, 30 - searchTime);
  const showSimulatedMessage = searchTime >= 20; // Show message when 10 seconds away

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-accent/20 rounded-lg">
      <div className="text-xl font-semibold mb-4">
        Searching for opponent{dots}
      </div>
      
      <div className="w-full max-w-md bg-background rounded-full h-4 mb-4 overflow-hidden">
        <div 
          className="bg-primary h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${Math.min(100, searchTime * 2)}%` }}
        ></div>
      </div>
      
      <div className="grid grid-cols-2 gap-8 w-full max-w-md">
        <div className="text-center">
          <div className="text-sm text-muted-foreground">Queue Position</div>
          {queuePosition === null ? (
            <Skeleton className="h-8 w-16 mx-auto" />
          ) : (
            <div className="text-2xl font-bold">{queuePosition}</div>
          )}
        </div>
        
        <div className="text-center">
          <div className="text-sm text-muted-foreground">Search Time</div>
          <div className="text-2xl font-bold">{formatTime(searchTime)}</div>
        </div>
      </div>
      
      <div className="mt-6 text-sm text-center space-y-2">
        <p className="text-muted-foreground">
          Matching you with players of similar skill level...
        </p>
        
        {showSimulatedMessage && (
          <p className={timeUntilSimulated === 0 ? "text-green-500 font-medium animate-pulse" : "text-amber-500"}>
            {timeUntilSimulated === 0 
              ? "Creating simulated opponent..." 
              : `Creating simulated opponent in ${timeUntilSimulated} seconds`}
          </p>
        )}
        
        <div className="mt-4 p-3 bg-card rounded-md text-xs text-left">
          <h4 className="font-semibold mb-1">How Matchmaking Works:</h4>
          <ul className="list-disc pl-4 space-y-1">
            <li>We match you with players of similar rank points</li>
            <li>Queue position decreases as we find better matches</li>
            <li>After 30 seconds, we'll create a simulated opponent</li>
            <li>Simulated opponents have balanced decks for fair play</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
