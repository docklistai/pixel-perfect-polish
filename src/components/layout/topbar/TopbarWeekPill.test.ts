import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { WorkspaceStoreProvider } from "@/features/demo/store/WorkspaceStoreProvider";
import { TopbarWeekPill } from "./TopbarWeekPill";

function renderWeekPill(displayedWeekLabel?: string): string {
  return renderToStaticMarkup(
    React.createElement(
      WorkspaceStoreProvider,
      null,
      React.createElement(TopbarWeekPill, { displayedWeekLabel }),
    ),
  );
}

describe("TopbarWeekPill", () => {
  it("uses the authoritative displayed week when the Rota route provides one", () => {
    const markup = renderWeekPill("15–21 Jun");

    expect(markup).toContain("15–21 Jun");
    expect(markup).not.toContain("8–14 Jun 2026");
  });

  it("renders a mobile-accessible trigger for the existing week picker", () => {
    const markup = renderWeekPill();

    expect(markup).toContain('aria-label="Choose rota week"');
    expect(markup).toContain("md:hidden");
  });
});
