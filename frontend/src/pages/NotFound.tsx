import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Scale, ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 font-sans">
      <div className="text-center animate-fade-in">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent/10 mb-6">
          <Scale className="h-8 w-8 text-accent" />
        </div>
        <h1 className="text-5xl font-bold text-primary mb-2">404</h1>
        <p className="text-base text-muted-foreground mb-6">
          This page doesn't exist in our legal records.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to LegalHub
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
