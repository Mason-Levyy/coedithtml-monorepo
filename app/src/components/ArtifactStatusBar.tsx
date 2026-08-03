import type { ReadingProfile } from "@/lib/bridge-messages";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const PROFILE_LABEL: Record<ReadingProfile, string> = {
  slides: "Slides",
  pages: "Pages",
  app: "App",
};

type ArtifactStatusBarProps = {
  title: string;
  profile: ReadingProfile;
  activeIndex: number;
  slideCount: number;
  stageMode: boolean;
  onToggleStage: () => void;
};

export function ArtifactStatusBar({
  title,
  profile,
  activeIndex,
  slideCount,
  stageMode,
  onToggleStage,
}: ArtifactStatusBarProps) {
  return (
    <div className="flex items-center gap-2 border-b border-ink bg-card px-3 py-1.5">
      <span className="text-sm font-semibold text-foreground">{title}</span>
      <span className="bg-primary px-1.5 py-0.5 font-mono text-[10px] tracking-wide text-primary-foreground uppercase">
        {PROFILE_LABEL[profile]}
      </span>
      {slideCount > 1 && (
        <span className="font-mono text-xs text-muted-foreground">
          {activeIndex + 1} of {slideCount}
        </span>
      )}
      {slideCount > 1 && (
        <Button
          variant={stageMode ? "default" : "outline"}
          size="sm"
          className={cn("ml-auto")}
          onClick={onToggleStage}
        >
          Stage {stageMode ? "on" : "off"}
        </Button>
      )}
    </div>
  );
}
