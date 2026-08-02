import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// Registers jest-dom's matchers on vitest's `expect` AND augments its Assertion
// type, so `toBeInTheDocument()` type-checks under `globals: false`.
import "@testing-library/jest-dom/vitest";

// jsdom does not implement these, and Radix's dialog primitives touch all of them
// while mounting. Without the shims the component throws before any assertion runs.
if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
}
if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = () => {};
}
if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = () => {};
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
if (!globalThis.matchMedia) {
  globalThis.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof matchMedia;
}

// Each test renders into a fresh document; without this the dialog from one case
// is still mounted for the next and queries match two nodes.
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
