import { cn } from "@/lib/utils";

interface PasswordChecklistProps {
  password: string;
}

const rules = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "One number", test: (p: string) => /\d/.test(p) },
];

export function PasswordChecklist({ password }: PasswordChecklistProps) {
  return (
    <ul className="space-y-1 text-xs text-muted-foreground" aria-label="Password requirements">
      {rules.map((rule) => {
        const met = rule.test(password);
        return (
          <li key={rule.label} className="flex items-center gap-2">
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                met ? "bg-brand" : "bg-muted-foreground/50",
              )}
              aria-hidden="true"
            />
            <span className={met ? "text-foreground" : undefined}>{rule.label}</span>
          </li>
        );
      })}
    </ul>
  );
}
