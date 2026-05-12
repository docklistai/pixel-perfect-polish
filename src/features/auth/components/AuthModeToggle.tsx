interface AuthModeToggleProps {
  isSignUp: boolean;
  onSwitchMode: () => void;
}

export function AuthModeToggle({ isSignUp, onSwitchMode }: AuthModeToggleProps) {
  return (
    <div className="inline-flex rounded-full border border-border/70 bg-background/80 p-1 shadow-sm">
      <button
        type="button"
        onClick={() => isSignUp && onSwitchMode()}
        aria-pressed={!isSignUp}
        className={
          !isSignUp
            ? "rounded-full bg-brand px-4 py-2 text-sm font-medium text-brand-foreground shadow-sm transition-colors duration-200"
            : "rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground"
        }
      >
        Sign in
      </button>
      <button
        type="button"
        onClick={() => !isSignUp && onSwitchMode()}
        aria-pressed={isSignUp}
        className={
          isSignUp
            ? "rounded-full bg-brand px-4 py-2 text-sm font-medium text-brand-foreground shadow-sm transition-colors duration-200"
            : "rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground"
        }
      >
        Sign up
      </button>
    </div>
  );
}
