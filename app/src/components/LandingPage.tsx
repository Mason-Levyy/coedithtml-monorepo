import { useState } from "react";
import { useUploadArtifact } from "@/hooks/useUploadArtifact";
import { ShareLinkResult } from "@/components/ShareLinkResult";
import { UploadDropzone } from "@/components/UploadDropzone";
import type { LinkPermission } from "@/lib/link-permission";

function shareUrlFor(
  permission: LinkPermission,
  data: { viewUrl: string; suggestUrl: string; editUrl: string },
): string {
  if (permission === "view") {
    return data.viewUrl;
  }
  return permission === "edit" ? data.editUrl : data.suggestUrl;
}

export function LandingPage() {
  const upload = useUploadArtifact();
  const [password, setPassword] = useState("");
  const [permission, setPermission] = useState<LinkPermission>("view");

  const shareUrl =
    upload.data === undefined ? null : shareUrlFor(permission, upload.data);

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-8 px-6 py-16">
      <div className="flex flex-col gap-3">
        <h1 className="font-sans text-3xl font-extrabold tracking-tight text-foreground uppercase">
          HTML made collaborative
        </h1>
        <p className="text-sm text-muted-foreground">
          Anyone who opens your link can read, comment, or edit the file,
          depending on the permissions you set. You can also set a password to
          protect the file.
        </p>
      </div>

      {upload.data ? (
        <ShareLinkResult
          shareUrl={shareUrl ?? upload.data.viewUrl}
          permission={permission}
          onUploadAnother={() => {
            setPassword("");
            setPermission("view");
            upload.reset();
          }}
        />
      ) : (
        <div className="flex flex-col gap-4">
          <UploadDropzone
            disabled={upload.isPending}
            errorMessage={upload.error?.message ?? null}
            onFileSelected={(file) => upload.mutate({ file, password })}
          />
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="flex flex-1 flex-col gap-1.5">
              <label
                htmlFor="link-password"
                className="font-mono text-xs tracking-wide text-muted-foreground uppercase"
              >
                Password (optional)
              </label>
              <input
                id="link-password"
                type="password"
                autoComplete="new-password"
                value={password}
                disabled={upload.isPending}
                onChange={(event) => setPassword(event.target.value)}
                className="border border-line bg-paper-2 px-3 py-2 font-mono text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              />
              <p className="text-xs text-muted-foreground">
                Anyone with the link is asked for this before they can read the
                file.
              </p>
            </div>

            <div className="flex flex-col gap-1.5 sm:w-24">
              <label
                htmlFor="link-permission"
                className="font-mono text-xs tracking-wide text-muted-foreground uppercase"
              >
                Permissions
              </label>
              <select
                id="link-permission"
                value={permission}
                disabled={upload.isPending}
                onChange={(event) =>
                  setPermission(event.target.value as LinkPermission)
                }
                className="border border-line bg-paper-2 px-2 py-2 font-mono text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <option value="view">View</option>
                <option value="suggest">Suggest</option>
                <option value="edit">Edit</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
