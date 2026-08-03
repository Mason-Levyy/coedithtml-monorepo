import type { ReadingProfile } from "@/lib/bridge-messages";
import { Button } from "@/components/ui/button";
import {
  PROFILE_LABEL,
  ReadingProfilePicker,
} from "@/components/ReadingProfilePicker";

type ArtifactStatusBarProps = {
  title: string;
  profile: ReadingProfile;
  activeIndex: number;
  slideCount: number;
  stageMode: boolean;
  onToggleStage: () => void;
  onChangeProfile?: (profile: ReadingProfile) => void;
  profilePending?: boolean;
};

export function ArtifactStatusBar({
  title,
  profile,
  activeIndex,
  slideCount,
  stageMode,
  onToggleStage,
  onChangeProfile,
  profilePending = false,
}: ArtifactStatusBarProps) {
  return (
    <div className="flex items-center gap-2 border-b border-ink bg-card px-3 py-1.5">
      <span className="text-sm font-semibold text-foreground">{title}</span>
      {onChangeProfile ? (
        <ReadingProfilePicker
          profile={profile}
          onChange={onChangeProfile}
          disabled={profilePending}
        />
      ) : (
        <span className="bg-primary px-1.5 py-0.5 font-mono text-[10px] tracking-wide text-primary-foreground uppercase">
          {PROFILE_LABEL[profile]}
        </span>
      )}
      {slideCount > 1 && (
        <span className="font-mono text-xs text-muted-foreground">
          {activeIndex + 1} of {slideCount}
        </span>
      )}
      {slideCount > 1 && (
        <Button
          variant={stageMode ? "default" : "outline"}
          size="sm"
          className="ml-auto"
          onClick={onToggleStage}
        >
          Stage {stageMode ? "on" : "off"}
        </Button>
      )}
    </div>
  );
}
