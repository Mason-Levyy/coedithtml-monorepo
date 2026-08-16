import { useState } from "react";
import { ArtifactLinkRow } from "@/components/ArtifactLinkRow";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Modal } from "@/components/ui/modal";
import {
  LINK_PERMISSIONS,
  LINK_TOKEN_FIELD,
  LINK_URL_FIELD,
  type LinkPermission,
} from "@/lib/link-permission";
import type { MyArtifactItem } from "@/lib/my-artifacts";

const LINK_LABEL: Record<LinkPermission, string> = {
  view: "View link",
  suggest: "Comment link",
  edit: "Edit link",
};

type ArtifactSettingsModalProps = {
  artifact: MyArtifactItem;
  onClose: () => void;
  onUpdatePassword: (password: string | null) => Promise<unknown>;
  onRevokeToken: (token: string) => Promise<unknown>;
  onRegenerateLink: (kind: LinkPermission) => Promise<unknown>;
  onDeleteArtifact: () => Promise<unknown>;
};

type PendingConfirm =
  { type: "delete" } | { type: "revoke"; kind: LinkPermission; token: string };

export function ArtifactSettingsModal({
  artifact,
  onClose,
  onUpdatePassword,
  onRevokeToken,
  onRegenerateLink,
  onDeleteArtifact,
}: ArtifactSettingsModalProps) {
  const [newPassword, setNewPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [regeneratingKind, setRegeneratingKind] =
    useState<LinkPermission | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(
    null,
  );
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsUpdatingPassword(true);
    setStatusMessage(null);
    try {
      await onUpdatePassword(
        newPassword.trim().length > 0 ? newPassword.trim() : null,
      );
      setStatusMessage("Password settings updated.");
      setNewPassword("");
    } catch {
      setStatusMessage("Failed to update password.");
    } finally {
      setIsUpdatingPassword(false);
    }
  }

  async function handleRegenerate(kind: LinkPermission) {
    setRegeneratingKind(kind);
    setStatusMessage(null);
    try {
      await onRegenerateLink(kind);
    } catch {
      setStatusMessage("Failed to regenerate the link.");
    } finally {
      setRegeneratingKind(null);
    }
  }

  async function handleConfirm() {
    if (!pendingConfirm) return;
    setIsConfirming(true);
    try {
      if (pendingConfirm.type === "delete") {
        await onDeleteArtifact();
        onClose();
        return;
      }
      await onRevokeToken(pendingConfirm.token);
      setPendingConfirm(null);
    } catch {
      setStatusMessage(
        pendingConfirm.type === "delete"
          ? "Failed to delete file."
          : "Failed to revoke the link.",
      );
    } finally {
      setIsConfirming(false);
    }
  }

  return (
    <Modal open className="max-w-lg gap-5 p-6">
      <div className="flex items-center justify-between border-b border-line pb-3">
        <div>
          <h3 className="font-mono text-sm font-bold uppercase tracking-wide text-foreground">
            Manage File Settings
          </h3>
          <p className="text-xs text-muted-foreground truncate max-w-xs mt-0.5">
            {artifact.fileName}
          </p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          ✕
        </Button>
      </div>

      {statusMessage && (
        <p className="rounded bg-paper-2 p-2 text-xs font-medium text-foreground border border-line">
          {statusMessage}
        </p>
      )}

      {!artifact.published && (
        <p className="text-xs text-muted-foreground">
          Publish this file to set a password and get shareable links.
        </p>
      )}

      {artifact.published && (
        <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-2.5">
          <label
            htmlFor="manage-password"
            className="font-mono text-xs font-semibold tracking-wide text-muted-foreground uppercase"
          >
            Password Protection{" "}
            {artifact.hasPassword ? "(Currently Set)" : "(None)"}
          </label>
          <div className="flex gap-2">
            <input
              id="manage-password"
              type="password"
              placeholder={
                artifact.hasPassword
                  ? "Enter new password or leave blank to remove"
                  : "Set a password"
              }
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="flex-1 border border-line bg-paper-2 px-3 py-1.5 font-mono text-xs text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rounded"
            />
            <Button type="submit" size="sm" disabled={isUpdatingPassword}>
              {artifact.hasPassword && newPassword.length === 0
                ? "Remove Password"
                : "Save Password"}
            </Button>
          </div>
        </form>
      )}

      {artifact.published && (
        <div className="flex flex-col gap-2 border-t border-line pt-3">
          <span className="font-mono text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Links
          </span>
          <div className="flex flex-col gap-2">
            {LINK_PERMISSIONS.map((kind) => {
              const token = artifact[LINK_TOKEN_FIELD[kind]];
              return (
                <ArtifactLinkRow
                  key={kind}
                  label={LINK_LABEL[kind]}
                  url={artifact[LINK_URL_FIELD[kind]]}
                  isRegenerating={regeneratingKind === kind}
                  onRegenerate={() => handleRegenerate(kind)}
                  onRevoke={() =>
                    token && setPendingConfirm({ type: "revoke", kind, token })
                  }
                />
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2 border-t border-line pt-3">
        <span className="font-mono text-xs font-semibold tracking-wide text-destructive uppercase">
          Danger Zone
        </span>
        <div className="flex items-center justify-between rounded border border-destructive/20 bg-destructive/5 p-3">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-foreground">
              Delete this file
            </span>
            <span className="text-[11px] text-muted-foreground">
              Permanently delete all revisions and revoke all links.
            </span>
          </div>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => setPendingConfirm({ type: "delete" })}
          >
            Delete File
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={pendingConfirm !== null}
        title={
          pendingConfirm?.type === "delete"
            ? "Delete this file?"
            : `Revoke the ${pendingConfirm?.kind ?? ""} link?`
        }
        description={
          pendingConfirm?.type === "delete"
            ? "This permanently deletes every revision and revokes all links. This can't be undone."
            : "Anyone using this link loses access immediately. You can generate a new one anytime."
        }
        confirmLabel={pendingConfirm?.type === "delete" ? "Delete" : "Revoke"}
        destructive
        isConfirming={isConfirming}
        onConfirm={handleConfirm}
        onCancel={() => setPendingConfirm(null)}
      />
    </Modal>
  );
}
