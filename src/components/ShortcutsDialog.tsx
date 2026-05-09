/**
 * Keyboard shortcuts help dialog. Frontend-only reference.
 */
import * as React from "react";
import { DialogShell, Kbd } from "@/components/dl";

interface Shortcut {
  keys: React.ReactNode;
  label: string;
}

const GENERAL: Shortcut[] = [
  { keys: <><Kbd>Ctrl</Kbd><span className="mx-1 text-muted-foreground">/</span><Kbd>⌘</Kbd> <Kbd>K</Kbd></>, label: "Open command palette" },
  { keys: <Kbd>?</Kbd>, label: "Open this shortcuts panel" },
  { keys: <Kbd>Esc</Kbd>, label: "Close any open drawer or dialog" },
];

const NAV: Shortcut[] = [
  { keys: <><Kbd>G</Kbd> <Kbd>H</Kbd></>, label: "Go to Home" },
  { keys: <><Kbd>G</Kbd> <Kbd>R</Kbd></>, label: "Go to Rota" },
  { keys: <><Kbd>G</Kbd> <Kbd>S</Kbd></>, label: "Go to Staff" },
  { keys: <><Kbd>G</Kbd> <Kbd>T</Kbd></>, label: "Go to Time & Attendance" },
];

function Section({ title, items }: { title: string; items: Shortcut[] }) {
  return (
    <div className="space-y-2">
      <h3 className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
        {title}
      </h3>
      <ul className="divide-y divide-border rounded-xl border border-border">
        {items.map((s, i) => (
          <li key={i} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
            <span className="text-foreground">{s.label}</span>
            <span className="flex items-center gap-1">{s.keys}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ShortcutsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <DialogShell
      open={open}
      onOpenChange={onOpenChange}
      title="Keyboard shortcuts"
      description="Move around Docklist without taking your hands off the keyboard."
      size="md"
    >
      <Section title="General" items={GENERAL} />
      <Section title="Navigation" items={NAV} />
      <p className="text-[11px] text-muted-foreground">
        Tip: type <Kbd>G</Kbd> followed by another key within a second to jump between sections.
      </p>
    </DialogShell>
  );
}
