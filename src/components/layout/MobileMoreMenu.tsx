import { useState, useEffect, useRef } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { MoreHorizontal } from "lucide-react";

interface MobileMoreItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}

/**
 * Phone-only overflow control for the bottom nav. At ≤767px the sidebar
 * collapses to a five-item bottom bar showing the Workspace group only, so the
 * Communication + Admin routes (Team, Ops, Reports, Settings) need a visible
 * affordance. Rendered as the sixth bottom-nav item; hidden on desktop/tablet
 * via CSS (`.sidebar .nav-item-more`), where the full sidebar already exposes
 * every route.
 */
export function MobileMoreMenu({ items }: { items: ReadonlyArray<MobileMoreItem> }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLElement>(null);
  const firstItemRef = useRef<HTMLAnchorElement>(null);

  const active = items.some((item) => path.startsWith(item.to));

  useEffect(() => {
    if (!open) return;
    firstItemRef.current?.focus();
    const clickHandler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        sheetRef.current &&
        !sheetRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("click", clickHandler);
    document.addEventListener("keydown", keyHandler);
    return () => {
      document.removeEventListener("click", clickHandler);
      document.removeEventListener("keydown", keyHandler);
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`nav-item nav-item-more ${active ? "active" : ""}`}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls="mobile-more-menu"
        aria-label="More navigation"
        onClick={() => setOpen((prev) => !prev)}
      >
        <MoreHorizontal
          className="h-[17px] w-[17px]"
          strokeWidth={active ? 2.2 : 1.8}
          aria-hidden="true"
        />
        <span>More</span>
      </button>

      {open && (
        <>
          <div className="mobile-more-scrim" aria-hidden="true" onClick={() => setOpen(false)} />
          <nav
            ref={sheetRef}
            id="mobile-more-menu"
            aria-label="More manager routes"
            className="popover mobile-more-sheet"
          >
            <div className="menu-label">More</div>
            {items.map((item, index) => {
              const Icon = item.icon;
              const isActive = path.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  ref={index === 0 ? firstItemRef : undefined}
                  aria-current={isActive ? "page" : undefined}
                  className="menu-item"
                  onClick={() => setOpen(false)}
                >
                  <Icon className="ico h-[17px] w-[17px]" aria-hidden="true" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </>
      )}
    </>
  );
}
