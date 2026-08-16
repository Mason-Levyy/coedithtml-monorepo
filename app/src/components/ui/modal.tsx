import type { ReactNode } from "react";

type ModalProps = {
  open: boolean;
  role?: "dialog" | "alertdialog";
  layer?: "base" | "over";
  className?: string;
  children: ReactNode;
};

export function Modal({
  open,
  role = "dialog",
  layer = "base",
  className = "max-w-lg",
  children,
}: ModalProps) {
  if (!open) return null;

  return (
    <div
      role={role}
      aria-modal="true"
      className={`fixed inset-0 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs ${
        layer === "over" ? "z-[60]" : "z-50"
      }`}
    >
      <div
        className={`flex w-full flex-col rounded-xl border border-line bg-card shadow-xl ${className}`}
      >
        {children}
      </div>
    </div>
  );
}
