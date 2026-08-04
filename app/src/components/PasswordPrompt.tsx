import { useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";

type PasswordPromptProps = {
  onSubmit: (password: string) => void;
  pending: boolean;
  errorMessage: string | null;
};

export function PasswordPrompt({
  onSubmit,
  pending,
  errorMessage,
}: PasswordPromptProps) {
  const [password, setPassword] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (password.length > 0) {
      onSubmit(password);
    }
  }

  return (
    <div className="flex h-full items-center justify-center p-6">
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-sm flex-col gap-3 border-2 border-ink bg-card p-6"
      >
        <label
          htmlFor="artifact-password"
          className="font-mono text-xs tracking-wide text-muted-foreground uppercase"
        >
          This link needs a password
        </label>
        <input
          id="artifact-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="border border-line bg-paper-2 px-3 py-2 font-mono text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        />
        {errorMessage !== null && (
          <p className="font-mono text-xs text-destructive">{errorMessage}</p>
        )}
        <Button type="submit" disabled={pending || password.length === 0}>
          {pending ? "Checking…" : "Open"}
        </Button>
      </form>
    </div>
  );
}
