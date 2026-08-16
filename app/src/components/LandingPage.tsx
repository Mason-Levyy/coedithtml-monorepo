import { useState } from "react";
import { MyArtifactsList } from "@/components/MyArtifactsList";
import { PublishStep } from "@/components/PublishStep";
import { ShareLinkResult } from "@/components/ShareLinkResult";
import { UploadDropzone } from "@/components/UploadDropzone";
import { useMyArtifacts } from "@/hooks/useMyArtifacts";
import { usePublishArtifact } from "@/hooks/usePublishArtifact";
import { useUploadArtifact } from "@/hooks/useUploadArtifact";
import type { LinkPermission } from "@/lib/link-permission";
import type { MyArtifactItem } from "@/lib/my-artifacts";
import type { PublishedUploadResult } from "@/lib/upload-artifact";

type Tab = "upload" | "my-files";

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
  const [activeTab, setActiveTab] = useState<Tab>("upload");
  const upload = useUploadArtifact();
  const publish = usePublishArtifact();
  const { data: myArtifacts } = useMyArtifacts();

  const [draftFile, setDraftFile] = useState<{
    artifactId: string;
    fileName: string;
    size: number;
  } | null>(null);

  const [publishedResult, setPublishedResult] =
    useState<PublishedUploadResult | null>(null);
  const [activePermission, setActivePermission] =
    useState<LinkPermission>("view");

  const fileCount = myArtifacts?.length ?? 0;

  function handleFileSelected(file: File) {
    upload.mutate(
      { file, draft: true },
      {
        onSuccess: (data) => {
          if ("draft" in data) {
            setDraftFile({
              artifactId: data.artifactId,
              fileName: data.fileName,
              size: data.size,
            });
            return;
          }
          setPublishedResult(data);
        },
      },
    );
  }

  function handlePublishDraft({
    password,
    permission,
  }: {
    password: string | null;
    permission: LinkPermission;
  }) {
    if (!draftFile) return;
    setActivePermission(permission);
    publish.mutate(
      {
        artifactId: draftFile.artifactId,
        password,
      },
      {
        onSuccess: (data) => {
          setPublishedResult(data);
          setDraftFile(null);
        },
      },
    );
  }

  function handlePublishExistingDraft(artifact: MyArtifactItem) {
    setDraftFile({
      artifactId: artifact.artifactId,
      fileName: artifact.fileName,
      size: artifact.size,
    });
    setActiveTab("upload");
  }

  function handleReset() {
    setDraftFile(null);
    setPublishedResult(null);
    setActivePermission("view");
    upload.reset();
    publish.reset();
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-8 px-6 py-16">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="font-sans text-3xl font-extrabold tracking-tight text-foreground uppercase">
            HTML made collaborative
          </h1>
          <div className="flex rounded-lg border border-line bg-paper-2 p-1">
            <button
              type="button"
              onClick={() => setActiveTab("upload")}
              className={`rounded-md px-3 py-1 font-mono text-xs font-semibold whitespace-nowrap uppercase transition-colors ${
                activeTab === "upload"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Upload
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("my-files")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1 font-mono text-xs font-semibold whitespace-nowrap uppercase transition-colors ${
                activeTab === "my-files"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>My Files</span>
              {fileCount > 0 && (
                <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                  {fileCount}
                </span>
              )}
            </button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Anyone who opens your link can read, comment, or edit the file,
          depending on the permissions you set. You can also set a password to
          protect the file.
        </p>
      </div>

      {activeTab === "my-files" ? (
        <MyArtifactsList
          onUploadClick={() => {
            handleReset();
            setActiveTab("upload");
          }}
          onPublishDraft={handlePublishExistingDraft}
        />
      ) : publishedResult ? (
        <ShareLinkResult
          shareUrl={shareUrlFor(activePermission, publishedResult)}
          permission={activePermission}
          onUploadAnother={handleReset}
        />
      ) : draftFile ? (
        <PublishStep
          fileName={draftFile.fileName}
          isPublishing={publish.isPending}
          initialPermission={activePermission}
          onPublish={handlePublishDraft}
          onCancel={handleReset}
        />
      ) : (
        <div className="flex flex-col gap-4">
          <UploadDropzone
            disabled={upload.isPending}
            errorMessage={upload.error?.message ?? null}
            onFileSelected={handleFileSelected}
          />
        </div>
      )}
    </div>
  );
}
