import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tables } from "@/types/database.types";
import { Button } from "@/components/ui/button";
import { ArrowUpDown } from "lucide-react";

type PlayerProfile = Tables<"player_profiles">;

export type SortField = "rank_points" | "wins" | "losses" | "current_streak" | "win_rate";
export type SortDirection = "asc" | "desc";

interface LeaderboardFiltersProps {
  onSearchChange: (search: string) => void;
  onTierFilter: (tier: string | "all") => void;
  onSort: (field: SortField, direction: SortDirection) => void;
  currentSort: { field: SortField; direction: SortDirection } | null;
}

const tiers = ["all", "bronze", "silver", "gold", "platinum", "diamond", "master"];

export function LeaderboardFilters({
  onSearchChange,
  onTierFilter,
  onSort,
  currentSort,
}: LeaderboardFiltersProps) {
  const handleSort = (field: SortField) => {
    if (currentSort?.field === field) {
      onSort(field, currentSort.direction === "asc" ? "desc" : "asc");
    } else {
      onSort(field, "desc");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="Search players..."
            onChange={(e) => onSearchChange(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <Select onValueChange={onTierFilter} defaultValue="all">
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by tier" />
          </SelectTrigger>
          <SelectContent>
            {tiers.map((tier) => (
              <SelectItem key={tier} value={tier}>
                {tier.charAt(0).toUpperCase() + tier.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleSort("rank_points")}
          className={currentSort?.field === "rank_points" ? "bg-accent" : ""}
        >
          Rank Points
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleSort("win_rate")}
          className={currentSort?.field === "win_rate" ? "bg-accent" : ""}
        >
          Win Rate
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleSort("wins")}
          className={currentSort?.field === "wins" ? "bg-accent" : ""}
        >
          Wins
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleSort("losses")}
          className={currentSort?.field === "losses" ? "bg-accent" : ""}
        >
          Losses
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleSort("current_streak")}
          className={currentSort?.field === "current_streak" ? "bg-accent" : ""}
        >
          Streak
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
