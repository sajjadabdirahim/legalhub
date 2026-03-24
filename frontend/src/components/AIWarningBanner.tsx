import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";

export function AIWarningBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div
      className="mx-4 mt-3 flex items-center gap-3 rounded-xl border border-warning/30 bg-warning/5 px-4 py-2.5 animate-fade-in"
      role="alert"
    >
      <AlertTriangle className="h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
      <p className="text-sm text-foreground/80 flex-1">
        <strong>LegalHub is an AI assistant, not a licensed attorney.</strong>{" "}
        Verify all outputs with qualified legal counsel.
      </p>
      <button
        onClick={() => setDismissed(true)}
        className="p-1 rounded hover:bg-secondary transition-colors shrink-0"
        aria-label="Dismiss AI disclaimer"
      >
        <X className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
    </div>
  );
}
