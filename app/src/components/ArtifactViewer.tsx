import { useState } from "react";
import {
  scrollToSlideCommand,
  setProfileCommand,
  setStageSlideCommand,
  type ReadingProfile,
} from "@/lib/bridge-messages";
import { useArtifactBridge } from "@/hooks/useArtifactBridge";
import { ArtifactFrame } from "@/components/ArtifactFrame";
import { ArtifactStatusBar } from "@/components/ArtifactStatusBar";
import { Filmstrip } from "@/components/Filmstrip";
import { StickyWarning } from "@/components/StickyWarning";

type ArtifactViewerProps = {
  src: string;
  sandboxOrigin: string;
  title: string;
  onChangeProfile?: (profile: ReadingProfile) => void;
  profilePending?: boolean;
};

export function ArtifactViewer({
  src,
  sandboxOrigin,
  title,
  onChangeProfile,
  profilePending,
}: ArtifactViewerProps) {
  const { state, frameRef, sendCommand } = useArtifactBridge(sandboxOrigin);
  const [stageMode, setStageMode] = useState(false);

  const activeIndex = state.status === "ready" ? state.activeSlideIndex : 0;

  function handleSelectSlide(index: number): void {
    sendCommand(
      stageMode ? setStageSlideCommand(index) : scrollToSlideCommand(index),
    );
  }

  function handleChangeProfile(profile: ReadingProfile): void {
    sendCommand(setProfileCommand(profile));
    onChangeProfile?.(profile);
  }

  function handleToggleStage(): void {
    const next = !stageMode;
    setStageMode(next);
    sendCommand(setStageSlideCommand(next ? activeIndex : null));
  }

  return (
    <div className="flex h-full flex-col border-2 border-ink bg-card">
      {state.status === "ready" && (
        <ArtifactStatusBar
          title={title}
          profile={state.profile}
          activeIndex={activeIndex}
          slideCount={state.slides.length}
          stageMode={stageMode}
          onToggleStage={handleToggleStage}
          onChangeProfile={
            onChangeProfile === undefined ? undefined : handleChangeProfile
          }
          profilePending={profilePending}
        />
      )}
      {state.status === "ready" &&
        state.hasStickyOrFixed &&
        state.slides.length > 1 && <StickyWarning />}
      <div className="min-h-0 flex-1">
        <ArtifactFrame ref={frameRef} src={src} title={title} />
      </div>
      {state.status === "ready" && state.slides.length > 1 && (
        <Filmstrip
          slides={state.slides}
          activeIndex={activeIndex}
          onSelectSlide={handleSelectSlide}
        />
      )}
      {state.status === "ready" && state.slides.length <= 1 && (
        <div className="border-t border-ink bg-paper-2 px-3 py-1.5 font-mono text-[11px] text-muted-foreground">
          This reads as one continuous view, not a slide deck.
        </div>
      )}
    </div>
  );
}
