import { ConfirmDialog } from "@/components/dl";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TimeExportDialog({ open, onOpenChange }: Props) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Preview approved-hours export?"
      description="Shows a CSV preview for the week of 18 – 24 May 2026 (Europe/London). Preview only — no file is downloaded."
      confirmLabel="Preview CSV"
      onConfirm={() => onOpenChange(false)}
    />
  );
}
