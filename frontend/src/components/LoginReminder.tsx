import { LogIn, X } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

export function LoginReminder() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="mx-4 mt-2 flex items-center gap-3 rounded-xl border border-accent/20 bg-accent/5 px-4 py-2.5 animate-fade-in">
      <LogIn className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
      <p className="text-sm text-foreground/80 flex-1">
        <Link to="/login" className="font-semibold text-accent hover:underline">
          Log in
        </Link>{" "}
        or{" "}
        <Link to="/login" className="font-semibold text-accent hover:underline">
          sign up
        </Link>{" "}
        to save your conversations and access chat history.
      </p>
      <button
        onClick={() => setDismissed(true)}
        className="p-1 rounded hover:bg-secondary transition-colors shrink-0"
        aria-label="Dismiss login reminder"
      >
        <X className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
    </div>
  );
}
