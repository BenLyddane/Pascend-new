import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GameCard } from "@/components/game-card";
import type { Card } from "@/types/game.types";

interface CardModalProps {
  card: Card | null;
  isOpen: boolean;
  onClose: () => void;
}

export function CardModal({ card, isOpen, onClose }: CardModalProps) {
  if (!card) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl overflow-visible relative z-50">
        <div className="overflow-visible relative">
        <DialogHeader>
          <DialogTitle>Card Details</DialogTitle>
        </DialogHeader>
        <div className="flex justify-center p-4">
          <GameCard card={card} />
        </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
