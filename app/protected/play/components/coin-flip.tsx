"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";

interface CoinFlipProps {
  onComplete: (player1GoesFirst: boolean) => void;
}

export default function CoinFlip({ onComplete }: CoinFlipProps) {
  const [flipping, setFlipping] = useState(true);
  const [result, setResult] = useState<boolean | null>(null);
  const [flipCount, setFlipCount] = useState(0);
  
  useEffect(() => {
    // Determine the result randomly
    const player1GoesFirst = Math.random() > 0.5;
    
    // Flip the coin for a random number of times (5-10)
    const totalFlips = 5 + Math.floor(Math.random() * 6);
    
    // Start the flipping animation
    const flipInterval = setInterval(() => {
      setFlipCount(prev => {
        const newCount = prev + 1;
        
        // If we've reached the total number of flips, show the result
        if (newCount >= totalFlips) {
          clearInterval(flipInterval);
          setFlipping(false);
          setResult(player1GoesFirst);
          
          // Notify the parent component after a short delay
          setTimeout(() => {
            onComplete(player1GoesFirst);
          }, 1500);
        }
        
        return newCount;
      });
    }, 200);
    
    return () => clearInterval(flipInterval);
  }, [onComplete]);
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="p-8 max-w-md w-full text-center">
        <h2 className="text-2xl font-bold mb-6">Coin Flip</h2>
        <p className="mb-6">Determining who goes first...</p>
        
        <div className="flex justify-center mb-8">
          <div 
            className={`w-32 h-32 relative transition-transform duration-500 ${
              flipping ? 'animate-flip' : ''
            }`}
            style={{
              transformStyle: 'preserve-3d',
              transform: !flipping ? (result ? 'rotateX(0deg)' : 'rotateX(180deg)') : undefined
            }}
          >
            {/* Heads - Player 1 */}
            <div 
              className={`absolute inset-0 rounded-full bg-blue-500 flex items-center justify-center text-white text-2xl font-bold backface-hidden`}
              style={{ backfaceVisibility: 'hidden' }}
            >
              P1
            </div>
            
            {/* Tails - Player 2 */}
            <div 
              className={`absolute inset-0 rounded-full bg-red-500 flex items-center justify-center text-white text-2xl font-bold backface-hidden`}
              style={{ 
                backfaceVisibility: 'hidden',
                transform: 'rotateX(180deg)'
              }}
            >
              P2
            </div>
          </div>
        </div>
        
        {!flipping && (
          <div className="text-xl font-bold">
            {result ? "Player 1" : "Player 2"} goes first!
          </div>
        )}
      </Card>
    </div>
  );
}
