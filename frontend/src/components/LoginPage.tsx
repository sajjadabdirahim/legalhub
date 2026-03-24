import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Scale, Mail, Lock, ArrowRight, Loader2, KeyRound } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function LoginPage() {
  const { login, signup, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const [isSignup, setIsSignup] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!googleClientId || isForgotPassword) return;
    let cancelled = false;
    const timer = window.setInterval(() => {
      if (cancelled || !window.google?.accounts?.id || !googleBtnRef.current) return;
      window.clearInterval(timer);
      if (cancelled) return;
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (response: { credential: string }) => {
          setLoading(true);
          setError("");
          const res = await loginWithGoogle(response.credential);
          setLoading(false);
          if (res.ok === false) {
            setError(res.message);
            return;
          }
          navigate("/");
        },
      });
      googleBtnRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: "outline",
        size: "large",
        width: 320,
        text: "continue_with",
        locale: "en",
      });
    }, 50);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [googleClientId, isForgotPassword, loginWithGoogle, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (isForgotPassword) {
      if (!email) {
        setError("Please enter your email address.");
        return;
      }
      setLoading(true);
      // Mock password reset
      setTimeout(() => {
        setLoading(false);
        setSuccess("If an account exists for that email, a reset link has been sent.");
      }, 1000);
      return;
    }

    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    const res = isSignup ? await signup(email, password) : await login(email, password);
    setLoading(false);
    if (res.ok === false) {
      setError(res.message);
      return;
    }
    navigate("/");
  };

  const handleGoogleDev = async () => {
    setError("");
    setLoading(true);
    const res = await loginWithGoogle(undefined, email.trim() || undefined);
    setLoading(false);
    if (res.ok === false) {
      setError(res.message);
      return;
    }
    navigate("/");
  };

  const heading = isForgotPassword
    ? "Reset your password"
    : isSignup
    ? "Create your account"
    : "Welcome back";

  const subtext = isForgotPassword
    ? "Enter your email and we'll send you a reset link"
    : isSignup
    ? "Sign up to save your research history"
    : "Log in to access your past conversations";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-accent/10 mb-4">
            <Scale className="h-7 w-7 text-accent" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">
            Legal<span className="text-accent">Hub</span>
          </h1>
          <p className="text-base text-muted-foreground mt-1">
            AI-powered legal research for Kenyan law
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-card shadow-card p-6">
          <h2 className="text-lg font-semibold text-foreground mb-1">{heading}</h2>
          <p className="text-xs text-muted-foreground mb-5">{subtext}</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-foreground mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full h-10 pl-9 pr-3 rounded-xl border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            {/* Password (hidden for forgot password) */}
            {!isForgotPassword && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="password" className="block text-xs font-medium text-foreground">
                    Password
                  </label>
                  {!isSignup && (
                    <button
                      type="button"
                      onClick={() => { setIsForgotPassword(true); setError(""); setSuccess(""); }}
                      className="text-[11px] text-accent hover:underline font-medium"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-10 pl-9 pr-3 rounded-xl border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
                    autoComplete={isSignup ? "new-password" : "current-password"}
                    required
                    minLength={6}
                  />
                </div>
              </div>
            )}

            {error && (
              <p className="text-xs text-destructive font-medium" role="alert">{error}</p>
            )}
            {success && (
              <p className="text-xs text-accent font-medium" role="status">{success}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 rounded-xl bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin-slow" />
              ) : isForgotPassword ? (
                <>
                  <KeyRound className="h-4 w-4" />
                  Send Reset Link
                </>
              ) : (
                <>
                  {isSignup ? "Create Account" : "Log In"}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Divider + Google — only on login/signup */}
          {!isForgotPassword && (
            <>
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-border" />
                <span className="text-[10px] text-muted-foreground font-medium uppercase">or</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {googleClientId ? (
                <div ref={googleBtnRef} className="w-full flex justify-center min-h-[40px]" />
              ) : (
                <button
                  type="button"
                  onClick={handleGoogleDev}
                  disabled={loading}
                  className="w-full h-10 rounded-xl border border-border bg-card text-sm font-medium text-foreground flex items-center justify-center gap-2.5 hover:bg-secondary disabled:opacity-50 transition-colors"
                  aria-label="Continue with Google (development)"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Continue with Google (dev)
                </button>
              )}
              {!googleClientId && (
                <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
                  For real Google sign-in, set VITE_GOOGLE_CLIENT_ID and GOOGLE_CLIENT_ID (same OAuth client) in your
                  environment. The dev button uses your email field when the server has no Google client id.
                </p>
              )}
            </>
          )}

          {/* Footer links */}
          <div className="mt-5 text-center">
            {isForgotPassword ? (
              <button
                onClick={() => { setIsForgotPassword(false); setError(""); setSuccess(""); }}
                className="text-xs text-accent hover:underline font-medium"
              >
                ← Back to login
              </button>
            ) : (
              <button
                onClick={() => { setIsSignup(!isSignup); setError(""); setSuccess(""); }}
                className="text-xs text-accent hover:underline font-medium"
              >
                {isSignup ? "Already have an account? Log in" : "Don't have an account? Sign up"}
              </button>
            )}
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-4">
          Accounts are stored in your configured database. Use a strong password in production.
        </p>
      </div>
    </div>
  );
}
