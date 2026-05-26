import { SearchField } from "@/components/dl";
import { useOverlays } from "@/components/AppShortcuts";

export function TopbarSearch({ searchPlaceholder }: { searchPlaceholder: string }) {
  const { openPalette } = useOverlays();

  return (
    <button
      type="button"
      onClick={openPalette}
      className="search-input hidden md:flex"
      aria-label="Search Docklist (Ctrl or Cmd K)"
    >
      <SearchField
        placeholder={searchPlaceholder}
        variant="inline"
        containerClassName="border-0 bg-transparent px-0 py-0 shadow-none pointer-events-none flex-1 min-w-0"
        tabIndex={-1}
        readOnly
      />
      <span className="hidden lg:inline-flex items-center gap-1">
        <kbd>⌘</kbd>
        <kbd>K</kbd>
      </span>
    </button>
  );
}
