import { READING_PROFILES, type ReadingProfile } from "@/lib/bridge-messages";

export const PROFILE_LABEL: Record<ReadingProfile, string> = {
  slides: "Slides",
  pages: "Pages",
  app: "App",
};

type ReadingProfilePickerProps = {
  profile: ReadingProfile;
  onChange: (profile: ReadingProfile) => void;
  disabled?: boolean;
};

export function ReadingProfilePicker({
  profile,
  onChange,
  disabled = false,
}: ReadingProfilePickerProps) {
  return (
    <label className="flex items-center gap-1.5 font-mono text-[10px] tracking-wide text-muted-foreground uppercase">
      Reading as
      <select
        value={profile}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value as ReadingProfile)}
        className="border border-line bg-paper-2 px-1.5 py-0.5 font-mono text-[10px] tracking-wide text-foreground uppercase focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
      >
        {READING_PROFILES.map((candidate) => (
          <option key={candidate} value={candidate}>
            {PROFILE_LABEL[candidate]}
          </option>
        ))}
      </select>
    </label>
  );
}
