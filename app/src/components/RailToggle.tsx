type RailToggleProps = {
  unresolved: number;
  onOpen: () => void;
};

export function RailToggle({ unresolved, onOpen }: RailToggleProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      title="Show comments"
      className="fixed top-1/2 right-0 z-20 flex -translate-y-1/2 items-center gap-2 border-2 border-r-0 border-ink bg-paper-2 px-2 py-3 shadow-md hover:bg-paper [writing-mode:vertical-rl]"
    >
      <span className="font-mono text-[10px] tracking-wide uppercase">
        {unresolved} open
      </span>
    </button>
  );
}
