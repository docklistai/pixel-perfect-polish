import { Link } from "@tanstack/react-router";
import { Checkbox } from "@/components/ui/checkbox";

interface SignupConsentSectionProps {
  accepted: boolean;
  onAcceptedChange: (accepted: boolean) => void;
}

/**
 * Signup consent: links to the real /terms and /privacy pages. Links open in
 * a new tab so the half-filled signup form isn't lost. The accepted document
 * versions are recorded in signup metadata by the caller.
 */
export function SignupConsentSection({ accepted, onAcceptedChange }: SignupConsentSectionProps) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
      <div className="flex items-start gap-3">
        <Checkbox
          id="signup-consent"
          checked={accepted}
          onCheckedChange={(checked) => onAcceptedChange(Boolean(checked))}
          aria-required="true"
        />
        <label
          htmlFor="signup-consent"
          className="cursor-pointer text-xs leading-relaxed text-muted-foreground"
        >
          I agree to the{" "}
          <Link
            to="/terms"
            target="_blank"
            rel="noreferrer"
            className="text-brand underline-offset-4 hover:underline"
          >
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link
            to="/privacy"
            target="_blank"
            rel="noreferrer"
            className="text-brand underline-offset-4 hover:underline"
          >
            Privacy Policy
          </Link>
          .
        </label>
      </div>
    </div>
  );
}
