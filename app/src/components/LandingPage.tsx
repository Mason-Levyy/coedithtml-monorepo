import { useState } from "react";
import { useUploadArtifact } from "@/hooks/useUploadArtifact";
import { ShareLinkResult } from "@/components/ShareLinkResult";
import { UploadDropzone } from "@/components/UploadDropzone";

export function LandingPage() {
  const upload = useUploadArtifact();
  const [password, setPassword] = useState("");

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-8 px-6 py-16">
      <div className="flex flex-col gap-3">
        <h1 className="font-sans text-3xl font-extrabold tracking-tight text-foreground uppercase">
          Turn an HTML file into a link
        </h1>
        <p className="text-sm text-muted-foreground">
          Upload the single-file artifact a tool like Claude generated. Get a
          link back. Anyone who opens it reads it as a deck — no account, no
          install, no build step.
        </p>
      </div>

      {upload.data ? (
        <ShareLinkResult
          shareUrl={upload.data.editUrl}
          onUploadAnother={() => {
            setPassword("");
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
          <div className="flex flex-col gap-1.5">
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
        </div>
      )}
    </div>
  );
}
