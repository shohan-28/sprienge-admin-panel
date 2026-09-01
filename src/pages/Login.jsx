import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Store, Eye, EyeOff, ArrowRight } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { ADMINS } from "../config/admins.js";

const Login = () => {
  const { login, isAuthed } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");

  if (isAuthed) return <Navigate to="/dashboard" replace />;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    const ok = login(username.trim(), password);
    if (ok) {
      navigate("/dashboard");
    } else {
      setError("ইউজারনেম অথবা পাসওয়ার্ড সঠিক নয়।");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-900 px-4">
      <div className="pointer-events-none fixed left-1/2 top-0 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-brand-600/20 blur-[120px]" />

      <div className="animate-in relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 shadow-lg shadow-brand-600/40">
            <Store size={22} className="text-white" strokeWidth={2.4} />
          </div>
          <h1 className="font-display text-xl font-bold text-white">
            BDMart Admin
          </h1>
          <p className="mt-1 text-sm text-mist-100/50">
            অর্ডার ম্যানেজ করতে লগইন করুন
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-white/10 bg-white/[0.03] p-7 shadow-panel backdrop-blur"
        >
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-mist-100/50">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
                placeholder="admin"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none transition placeholder:text-mist-100/30 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-mist-100/50">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 pr-10 text-sm text-white outline-none transition placeholder:text-mist-100/30 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-mist-100/40 hover:text-mist-100"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-400">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="group flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 active:scale-[0.98]"
            >
              Log In
              <ArrowRight
                size={16}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </button>
          </div>
        </form>

        <p className="mt-6 text-center text-xs text-mist-100/30">
          BDMart © 2026 — Internal use only · {ADMINS.length} admin accounts configured
        </p>
      </div>
    </div>
  );
};

export default Login;
