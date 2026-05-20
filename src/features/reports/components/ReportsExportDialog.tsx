import { ConfirmDialog } from "@/components/dl";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReportsExportDialog({ open, onOpenChange }: Props) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Export weekly report?"
      description="Frontend example only — no file will be downloaded."
      confirmLabel="Export"
      onConfirm={() => onOpenChange(false)}
    />
  );
}
