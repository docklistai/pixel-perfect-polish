/**
 * Deciding where focus goes when a controlled dialog closes.
 *
 * `DialogShell` dialogs are rendered as siblings of their openers rather than
 * wrapped in a Radix `DialogTrigger`, so Radix has no trigger element to hand
 * focus back to and drops it on `<body>`. A keyboard user who opened Add staff,
 * looked, and pressed Escape was returned to the top of the document and had to
 * tab all the way back — the dialog trapped focus correctly on the way in, then
 * lost it on the way out.
 *
 * The component records whatever was focused at open time and asks this
 * predicate whether that element is a sane thing to focus again.
 */

/**
 * Whether `opener` should receive focus when the dialog closes.
 *
 * Rejects `<body>`, which is what the browser reports when a dialog was opened
 * with nothing focused (a programmatic open). Restoring to it would reproduce
 * the exact bug this exists to fix, so in that case the caller stands aside and
 * lets Radix apply its own default instead.
 *
 * Also rejects elements that have been removed from the document since the
 * dialog opened: focusing a detached node silently sends focus to `<body>`.
 */
export function shouldRestoreDialogFocus(
  opener: Element | null | undefined,
  body: Element | null = typeof document === "undefined" ? null : document.body,
): opener is HTMLElement {
  if (!opener) return false;
  if (body && opener === body) return false;
  if (!opener.isConnected) return false;
  return typeof (opener as HTMLElement).focus === "function";
}

/** The part of a close event this contract depends on. */
export interface DialogCloseFocusEvent {
  readonly defaultPrevented: boolean;
  preventDefault: () => void;
}

/**
 * The whole close-time focus contract, in one place so it can be tested without
 * rendering a dialog.
 *
 * Order matters and is deliberate:
 *
 *   1. the stored opener is read and the ref cleared — on *every* path, so a
 *      closed dialog never retains a detached node;
 *   2. the consumer handler runs first, giving it the chance to take over;
 *   3. if it called `preventDefault()`, focus is its business and we stop;
 *   4. otherwise the opener is validated, and only a valid one is focused —
 *      exactly once, with the default prevented so Radix does not also move
 *      focus and produce a visible double jump.
 *
 * An invalid opener (missing, `<body>`, disconnected, non-focusable) is not an
 * error: we simply do not prevent the default, and Radix behaves as it always
 * has.
 */
export function runDialogCloseFocus<E extends DialogCloseFocusEvent>(
  openerRef: { current: Element | null },
  event: E,
  onCloseAutoFocus?: (event: E) => void,
  body: Element | null = typeof document === "undefined" ? null : document.body,
): void {
  const opener = openerRef.current;
  openerRef.current = null;

  onCloseAutoFocus?.(event);
  if (event.defaultPrevented) return;

  if (!shouldRestoreDialogFocus(opener, body)) return;
  event.preventDefault();
  opener.focus();
}
