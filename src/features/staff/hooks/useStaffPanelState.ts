import * as React from "react";

const STORAGE_KEY = "docklist.staff.profilePanelOpen";

// Module-level cache prevents a brief open flash on remount before the effect fires.
let cachedPanelOpen: boolean | null = null;

function readStoredPanelState(defaultValue = true): boolean {
  if (typeof window === "undefined") {
    return cachedPanelOpen ?? defaultValue;
  }
  try {
    const stored = window.sessionStorage.getItem(STORAGE_KEY);
    if (stored === "false") return false;
    if (stored === "true") return true;
    return cachedPanelOpen ?? defaultValue;
  } catch {
    return cachedPanelOpen ?? defaultValue;
  }
}

function writeStoredPanelState(next: boolean): void {
  cachedPanelOpen = next;
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, String(next));
  } catch {
    // Storage unavailable in restricted/private environments — silent fallback.
  }
}

export function useStaffPanelState(): readonly [boolean, (next: boolean) => void] {
  const [isOpen, setIsOpen] = React.useState<boolean>(() => cachedPanelOpen ?? true);

  React.useEffect(() => {
    const stored = readStoredPanelState(true);
    cachedPanelOpen = stored;
    setIsOpen(stored);
  }, []);

  const setPanelOpen = React.useCallback((next: boolean) => {
    writeStoredPanelState(next);
    setIsOpen(next);
  }, []);

  return [isOpen, setPanelOpen] as const;
}
