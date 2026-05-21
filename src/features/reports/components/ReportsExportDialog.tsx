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
      description="Preview export only. File download will be available once export is live."
      confirmLabel="Export"
      onConfirm={() => onOpenChange(false)}
    />
  );
}
