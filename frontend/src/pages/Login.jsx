import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";

function FieldError({ message }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-400">{message}</p>;
}

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm]               = useState({ username: "", password: "" });
  const [errors, setErrors]           = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]         = useState(false);
  const [serverError, setServerError] = useState("");

  const validate = () => {
    const e = {};
    if (!form.username.trim()) e.username = "Username is required.";
    if (!form.password)        e.password = "Password is required.";
    return e;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    if (errors[name]) setErrors((p) => ({ ...p, [name]: "" }));
    setServerError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fieldErrors = validate();
    if (Object.keys(fieldErrors).length > 0) { setErrors(fieldErrors); return; }

    setLoading(true);
    try {
      const { data } = await api.post("/api/auth/login", form);
      login(data.user);   // update AuthContext — token is now in httpOnly cookie
      navigate("/home");
    } catch (err) {
      const msg = err.response?.data?.message || "Login failed. Try again.";
      setServerError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center px-4"
      style={{ background: "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(109,40,217,0.15) 0%, #0d0d0d 70%)" }}
    >
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <span className="text-2xl">🍹</span>
          <span className="text-lg font-bold tracking-wide text-white">MOVIE MOJITO</span>
        </div>

        <div className="bg-[#141414] border border-white/10 rounded-2xl shadow-2xl p-8">
          <h1 className="text-2xl font-bold text-white mb-1">Welcome back</h1>
          <p className="text-sm text-white/40 mb-6">Sign in to your account to continue.</p>

          {serverError && (
            <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-400">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Username */}
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">Username</label>
              <input
                type="text" name="username" value={form.username} onChange={handleChange}
                placeholder="your_username"
                className={`w-full bg-white/5 border ${errors.username ? "border-red-500/50" : "border-white/10"} rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition`}
              />
              <FieldError message={errors.username} />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"} name="password" value={form.password} onChange={handleChange}
                  placeholder="Your password"
                  className={`w-full bg-white/5 border ${errors.password ? "border-red-500/50" : "border-white/10"} rounded-xl px-4 py-3 pr-14 text-sm text-white placeholder-white/20 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition`}
                />
                <button
                  type="button" onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 text-xs font-semibold transition"
                >
                  {showPassword ? "HIDE" : "SHOW"}
                </button>
              </div>
              <FieldError message={errors.password} />
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-violet-500/20 mt-1"
            >
              {loading ? "Signing in…" : "Sign in →"}
            </button>
          </form>

          <p className="text-center text-xs text-white/30 mt-5">
            Don&apos;t have an account?{" "}
            <Link to="/" className="text-violet-400 hover:text-violet-300 font-medium transition-colors">
              Register free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
