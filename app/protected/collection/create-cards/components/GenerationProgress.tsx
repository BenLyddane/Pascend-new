import { Progress } from "@/components/ui/progress";

interface GenerationProgressProps {
  isLoading: boolean;
  progress: number;
}

export function GenerationProgress({ isLoading, progress }: GenerationProgressProps) {
  if (!isLoading) return null;

  const getProgressMessage = () => {
    if (progress < 10) return "Initializing...";
    if (progress < 30) return "Generating first card...";
    if (progress < 60) return "Generating second card...";
    if (progress < 90) return "Generating third card...";
    return "Processing and saving...";
  };

  return (
    <div className="space-y-2">
      <Progress value={progress} className="w-full" />
      <p className="text-sm text-center text-muted-foreground">
        {getProgressMessage()}
        {" " + Math.round(progress)}%
      </p>
    </div>
  );
}
