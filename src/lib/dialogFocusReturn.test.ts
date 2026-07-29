import { describe, expect, it, vi } from "vitest";
import {
  runDialogCloseFocus,
  shouldRestoreDialogFocus,
  type DialogCloseFocusEvent,
} from "./dialogFocusReturn";

/**
 * Minimal stand-ins. The suite has no DOM environment, so these model only the
 * three properties the predicate actually reads.
 */
function fakeElement({
  connected = true,
  focusable = true,
}: { connected?: boolean; focusable?: boolean } = {}) {
  return {
    isConnected: connected,
    ...(focusable ? { focus: () => {} } : {}),
  } as unknown as Element;
}

describe("shouldRestoreDialogFocus", () => {
  const body = fakeElement();

  it("restores focus to a connected, focusable opener", () => {
    expect(shouldRestoreDialogFocus(fakeElement(), body)).toBe(true);
  });

  it("refuses <body> — restoring to it is the bug being fixed", () => {
    // Radix already drops focus on <body>; handing it back there deliberately
    // would strand a keyboard user at the top of the page all the same.
    expect(shouldRestoreDialogFocus(body, body)).toBe(false);
  });

  it("refuses an opener that was removed while the dialog was open", () => {
    // Focusing a detached node silently sends focus to <body>.
    expect(shouldRestoreDialogFocus(fakeElement({ connected: false }), body)).toBe(false);
  });

  it("refuses null and undefined openers", () => {
    expect(shouldRestoreDialogFocus(null, body)).toBe(false);
    expect(shouldRestoreDialogFocus(undefined, body)).toBe(false);
  });

  it("refuses an element with no focus method", () => {
    expect(shouldRestoreDialogFocus(fakeElement({ focusable: false }), body)).toBe(false);
  });

  it("still accepts a valid opener when no body reference is supplied", () => {
    expect(shouldRestoreDialogFocus(fakeElement(), null)).toBe(true);
  });
});

/** A close event carrying only what the contract reads. */
function fakeEvent(): DialogCloseFocusEvent & { preventDefault: ReturnType<typeof vi.fn> } {
  const event = {
    defaultPrevented: false,
    preventDefault: vi.fn(() => {
      (event as { defaultPrevented: boolean }).defaultPrevented = true;
    }),
  };
  return event as DialogCloseFocusEvent & { preventDefault: ReturnType<typeof vi.fn> };
}

function focusableElement() {
  const focus = vi.fn();
  return { element: { isConnected: true, focus } as unknown as Element, focus };
}

describe("runDialogCloseFocus", () => {
  const body = { isConnected: true, focus: () => {} } as unknown as Element;

  it("restores the opener exactly once and prevents the Radix default", () => {
    const { element, focus } = focusableElement();
    const ref = { current: element };
    const event = fakeEvent();

    runDialogCloseFocus(ref, event, undefined, body);

    // Exactly one focus move — a second would be visible as a double jump.
    expect(focus).toHaveBeenCalledTimes(1);
    expect(event.preventDefault).toHaveBeenCalledTimes(1);
  });

  it("stands down when the consumer handler prevents default", () => {
    const { element, focus } = focusableElement();
    const ref = { current: element };
    const event = fakeEvent();

    runDialogCloseFocus(ref, event, (e) => e.preventDefault(), body);

    // The consumer owns focus; the shared restoration must not also move it.
    expect(focus).not.toHaveBeenCalled();
    expect(event.preventDefault).toHaveBeenCalledTimes(1);
  });

  it("proceeds when the consumer handler runs without preventing default", () => {
    const { element, focus } = focusableElement();
    const ref = { current: element };
    const event = fakeEvent();
    const consumer = vi.fn();

    runDialogCloseFocus(ref, event, consumer, body);

    expect(consumer).toHaveBeenCalledTimes(1);
    expect(focus).toHaveBeenCalledTimes(1);
  });

  it("runs the consumer handler before restoring", () => {
    const order: string[] = [];
    const focus = vi.fn(() => void order.push("restore"));
    const ref = { current: { isConnected: true, focus } as unknown as Element };

    runDialogCloseFocus(ref, fakeEvent(), () => void order.push("consumer"), body);

    expect(order).toEqual(["consumer", "restore"]);
  });

  it("clears the stored opener after handling — restore path", () => {
    const { element } = focusableElement();
    const ref = { current: element };
    runDialogCloseFocus(ref, fakeEvent(), undefined, body);
    expect(ref.current).toBeNull();
  });

  it("clears the stored opener after handling — consumer-override path", () => {
    const { element } = focusableElement();
    const ref = { current: element };
    runDialogCloseFocus(ref, fakeEvent(), (e) => e.preventDefault(), body);
    expect(ref.current).toBeNull();
  });

  it("clears the stored opener after handling — rejected-target path", () => {
    // A detached opener must not be retained once the dialog has closed.
    const ref = { current: { isConnected: false, focus: vi.fn() } as unknown as Element };
    const event = fakeEvent();

    runDialogCloseFocus(ref, event, undefined, body);

    expect(ref.current).toBeNull();
    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  // The Offboard dialog's shape: a success unmounts the opener, so the consumer
  // redirects focus to a parent-supplied fallback instead.
  describe("consumer-supplied fallback destination", () => {
    function fallbackConsumer(fallback: Element | null, succeeded: boolean) {
      return (event: DialogCloseFocusEvent) => {
        if (!succeeded) return;
        if (!shouldRestoreDialogFocus(fallback, body)) return;
        event.preventDefault();
        fallback.focus();
      };
    }

    it("focuses the fallback exactly once and suppresses opener restoration", () => {
      const opener = focusableElement();
      const fallback = focusableElement();
      const ref = { current: opener.element };
      const event = fakeEvent();

      runDialogCloseFocus(ref, event, fallbackConsumer(fallback.element, true), body);

      expect(fallback.focus).toHaveBeenCalledTimes(1);
      expect(opener.focus).not.toHaveBeenCalled();
      expect(event.preventDefault).toHaveBeenCalledTimes(1);
      expect(ref.current).toBeNull();
    });

    it("restores the opener normally when the close was not a success", () => {
      const opener = focusableElement();
      const fallback = focusableElement();
      const ref = { current: opener.element };

      runDialogCloseFocus(ref, fakeEvent(), fallbackConsumer(fallback.element, false), body);

      expect(opener.focus).toHaveBeenCalledTimes(1);
      expect(fallback.focus).not.toHaveBeenCalled();
    });

    it("does not throw when the fallback is missing or disconnected", () => {
      // The opener is gone (offboard succeeded) and the fallback is invalid:
      // nothing is focused, nothing is prevented, Radix decides.
      for (const fallback of [
        null,
        { isConnected: false, focus: vi.fn() } as unknown as Element,
        { isConnected: true } as unknown as Element,
      ]) {
        const ref = { current: { isConnected: false, focus: vi.fn() } as unknown as Element };
        const event = fakeEvent();
        expect(() =>
          runDialogCloseFocus(ref, event, fallbackConsumer(fallback, true), body),
        ).not.toThrow();
        expect(event.preventDefault).not.toHaveBeenCalled();
        expect(ref.current).toBeNull();
      }
    });
  });

  it("leaves Radix alone for <body>, disconnected and non-focusable targets", () => {
    for (const target of [
      null,
      body,
      { isConnected: false, focus: vi.fn() } as unknown as Element,
      { isConnected: true } as unknown as Element,
    ]) {
      const event = fakeEvent();
      expect(() => runDialogCloseFocus({ current: target }, event, undefined, body)).not.toThrow();
      expect(event.preventDefault).not.toHaveBeenCalled();
    }
  });
});
