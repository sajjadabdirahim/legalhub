import { useState } from "react";
import { useMode } from "@/contexts/ModeContext";
import { useAuth } from "@/contexts/AuthContext";
import { Scale, User, LogIn } from "lucide-react";
import { Link } from "react-router-dom";

export function ModeToggle() {
  const { mode, toggleMode, isCitizen } = useMode();
  const { isLoggedIn } = useAuth();
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  const handleToggle = () => {
    if (isCitizen && !isLoggedIn) {
      setShowLoginPrompt(true);
      return;
    }
    toggleMode();
  };

  return (
    <div className="relative">
      <button
        onClick={handleToggle}
        className="relative flex items-center h-10 rounded-full bg-secondary border border-border p-1 gap-0 transition-spring"
        role="switch"
        aria-checked={mode === "professional"}
        aria-label={`Switch to ${isCitizen ? "Professional" : "Citizen"} mode`}
      >
        <span
          className={`relative z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-spring ${
            isCitizen ? "text-primary-foreground" : "text-muted-foreground"
          }`}
        >
          <User className="h-3.5 w-3.5" aria-hidden="true" />
          Citizen
        </span>
        <span
          className={`relative z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-spring ${
            !isCitizen ? "text-primary-foreground" : "text-muted-foreground"
          }`}
        >
          <Scale className="h-3.5 w-3.5" aria-hidden="true" />
          Professional
        </span>
        {/* Sliding thumb */}
        <span
          className={`absolute top-1 h-8 rounded-full bg-primary transition-mode ${
            isCitizen ? "left-1 w-[5.5rem]" : "left-[5.75rem] w-[6.75rem]"
          }`}
          aria-hidden="true"
        />
      </button>

      {/* Login prompt popover */}
      {showLoginPrompt && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowLoginPrompt(false)} />
          <div className="absolute top-12 left-1/2 -translate-x-1/2 z-50 w-64 rounded-xl border border-border bg-card shadow-lg p-4 animate-fade-in">
            <p className="text-sm font-medium text-foreground mb-1">Login Required</p>
            <p className="text-sm text-muted-foreground mb-3">
              Professional mode is available to logged-in users only. Please log in to access advanced legal insights, knowledge graphs, and feedback tools.
            </p>
            <Link
              to="/login"
              onClick={() => setShowLoginPrompt(false)}
              className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
            >
              <LogIn className="h-3.5 w-3.5" />
              Log In to Continue
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
