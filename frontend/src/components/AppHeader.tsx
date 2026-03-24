import { ModeToggle } from "./ModeToggle";
import { Menu, LogIn, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";

interface AppHeaderProps {
  onToggleSidebar: () => void;
}

export function AppHeader({ onToggleSidebar }: AppHeaderProps) {
  const { isLoggedIn, userEmail, logout } = useAuth();

  return (
    <header
      className="sticky top-0 z-50 glass-header border-b border-border/50"
      role="banner"
    >
      <div className="flex items-center justify-between h-14 px-4 lg:px-6">
        <div className="flex items-center gap-3">
          {isLoggedIn && (
            <button
              onClick={onToggleSidebar}
              className="p-2 rounded-lg hover:bg-secondary transition-colors"
              aria-label="Toggle chat history"
            >
              <Menu className="h-5 w-5 text-foreground" />
            </button>
          )}
          <Link to="/" className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight text-primary" aria-label="LegalHub home">
              Legal<span className="text-accent">Hub</span>
            </span>
            <span className="hidden sm:inline text-xs font-medium text-muted-foreground bg-secondary px-2 py-0.5 rounded">
              KE
            </span>
          </Link>
        </div>

        <ModeToggle />

        <div className="flex items-center gap-2">
          {isLoggedIn ? (
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center justify-center h-7 w-7 rounded-full bg-accent/10 text-accent text-xs font-bold">
                {userEmail?.charAt(0).toUpperCase()}
              </div>
              <span className="hidden md:inline text-xs text-muted-foreground truncate max-w-[120px]">
                {userEmail}
              </span>
              <button
                onClick={logout}
                className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                aria-label="Log out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
              aria-label="Log in to save your conversations"
            >
              <LogIn className="h-3.5 w-3.5" />
              Log In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
