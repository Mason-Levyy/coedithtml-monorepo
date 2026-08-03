import { useUploadArtifact } from "@/hooks/useUploadArtifact";
import { ShareLinkResult } from "@/components/ShareLinkResult";
import { UploadDropzone } from "@/components/UploadDropzone";

export function LandingPage() {
  const upload = useUploadArtifact();

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
          viewUrl={upload.data.viewUrl}
          onUploadAnother={() => upload.reset()}
        />
      ) : (
        <UploadDropzone
          disabled={upload.isPending}
          errorMessage={upload.error?.message ?? null}
          onFileSelected={(file) => upload.mutate(file)}
        />
      )}
    </div>
  );
}
