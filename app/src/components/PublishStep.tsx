import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LINK_PERMISSIONS, type LinkPermission } from "@/lib/link-permission";

type PublishStepProps = {
  fileName: string;
  initialPermission?: LinkPermission;
  isPublishing?: boolean;
  onPublish: (options: {
    password: string | null;
    permission: LinkPermission;
  }) => void;
  onCancel: () => void;
};

const PERMISSION_LABELS: Record<LinkPermission, string> = {
  view: "View-only",
  suggest: "Comment (Suggest)",
  edit: "Edit directly",
};

export function PublishStep({
  fileName,
  initialPermission = "view",
  isPublishing = false,
  onPublish,
  onCancel,
}: PublishStepProps) {
  const [password, setPassword] = useState("");
  const [permission, setPermission] =
    useState<LinkPermission>(initialPermission);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onPublish({
      password: password.trim().length > 0 ? password.trim() : null,
      permission,
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-6 rounded-xl border border-line bg-card p-6 shadow-md"
    >
      <div className="flex items-center justify-between border-b border-line pb-4">
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mt-1">
            <span className="font-mono text-base font-bold text-foreground">
              {fileName}
            </span>
          </div>
        </div>
        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
          Step 2 of 2
        </span>
      </div>

      <div className="flex flex-col gap-2.5">
        <label
          htmlFor="publish-permission"
          className="font-mono text-xs font-medium tracking-wide text-muted-foreground uppercase"
        >
          Default Link Permissions
        </label>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          {LINK_PERMISSIONS.map((perm) => (
            <button
              key={perm}
              type="button"
              onClick={() => setPermission(perm)}
              className={`flex items-center justify-between gap-2 rounded-lg border p-3.5 text-left transition-all ${
                permission === perm
                  ? "border-primary bg-primary/5 shadow-xs ring-1 ring-primary"
                  : "border-line bg-paper-2 hover:border-ink/40"
              }`}
            >
              <span className="font-semibold text-sm text-foreground">
                {PERMISSION_LABELS[perm]}
              </span>
              <input
                type="radio"
                name="permission"
                checked={permission === perm}
                onChange={() => setPermission(perm)}
                className="accent-primary"
              />
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5 border-t border-line pt-4">
        <label
          htmlFor="publish-password"
          className="font-mono text-xs font-medium tracking-wide text-muted-foreground uppercase"
        >
          Password Protection (Optional)
        </label>
        <input
          id="publish-password"
          type="password"
          autoComplete="new-password"
          placeholder="Leave blank for no password"
          value={password}
          disabled={isPublishing}
          onChange={(e) => setPassword(e.target.value)}
          className="border border-line bg-paper-2 px-3 py-2 font-mono text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring max-w-md rounded-md"
        />
        <p className="text-xs text-muted-foreground">
          Anyone opening the link will be asked for this password before they
          can view the file.
        </p>
      </div>

      <div className="flex items-center justify-between border-t border-line pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isPublishing}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isPublishing}>
          {isPublishing ? "Publishing link…" : "Publish link"}
        </Button>
      </div>
    </form>
  );
}
