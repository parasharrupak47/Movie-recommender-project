import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../services/api.js";
import Navbar from "../components/Navbar.jsx";
import Sidebar from "../components/Sidebar.jsx";
import AvatarViewer from "../components/AvatarViewer.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { fileToSquareDataUrl } from "../utils/image.js";

function FieldError({ message }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-400">{message}</p>;
}

/** Initials shown when the user has no avatar image. */
function initialsOf(user) {
  if (user?.fullName) return user.fullName[0].toUpperCase();
  if (user?.username) return user.username[0].toUpperCase();
  return "M";
}

export default function Profile() {
  const { user, updateUser } = useAuth();
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    fullName: "",
    username: "",
    email:    "",
  });
  const [avatar, setAvatar]           = useState("");   // data URL or remote URL
  const [errors, setErrors]           = useState({});
  const [serverError, setServerError] = useState("");
  const [success, setSuccess]         = useState("");
  const [saving, setSaving]           = useState(false);
  const [processing, setProcessing]   = useState(false);
  const [viewerOpen, setViewerOpen]   = useState(false);

  // Seed the form once the user object is available
  useEffect(() => {
    if (!user) return;
    setForm({
      fullName: user.fullName ?? "",
      username: user.username ?? "",
      email:    user.email ?? "",
    });
    setAvatar(user.avatar ?? "");
  }, [user]);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const validate = () => {
    const e = {};
    if (!form.fullName.trim()) e.fullName = "Full name is required.";
    if (!form.username.trim()) e.username = "Username is required.";
    else if (!/^[a-zA-Z0-9_.]{3,20}$/.test(form.username.trim()))
      e.username = "3–20 characters: letters, numbers, underscore or dot.";
    if (!form.email.trim()) e.email = "Email is required.";
    else if (!emailRegex.test(form.email.trim())) e.email = "Enter a valid email address.";
    return e;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    if (errors[name]) setErrors((p) => ({ ...p, [name]: "" }));
    setServerError("");
    setSuccess("");
  };

  const handlePickImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProcessing(true);
    setServerError("");
    setSuccess("");

    try {
      // Resize in the browser so the upload stays small
      const dataUrl = await fileToSquareDataUrl(file);
      setAvatar(dataUrl);
    } catch (err) {
      setServerError(err.message || "Could not process that image.");
    } finally {
      setProcessing(false);
      // Reset so picking the same file again still fires onChange
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccess("");
    setServerError("");

    const fieldErrors = validate();
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    setSaving(true);
    try {
      const { data } = await api.patch("/api/user/profile", {
        fullName: form.fullName.trim(),
        username: form.username.trim().toLowerCase(),
        email:    form.email.trim().toLowerCase(),
        avatar,
      });

      updateUser(data.user);       // navbar avatar updates immediately
      setSuccess("Profile updated.");
    } catch (err) {
      const msg = err.response?.data?.message || "Could not save changes. Try again.";
      // Surface conflicts on the specific field so the user knows what to change
      if (/username/i.test(msg))   setErrors((p) => ({ ...p, username: msg }));
      else if (/email/i.test(msg)) setErrors((p) => ({ ...p, email: msg }));
      else setServerError(msg);
    } finally {
      setSaving(false);
    }
  };

  const isDirty =
    user &&
    (form.fullName !== (user.fullName ?? "") ||
      form.username !== (user.username ?? "") ||
      form.email !== (user.email ?? "") ||
      avatar !== (user.avatar ?? ""));

  const inputClass = (field) =>
    `w-full bg-white/5 border ${
      errors[field] ? "border-red-500/50" : "border-white/10"
    } rounded-xl px-4 py-3 text-sm text-white placeholder-white/20
     focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition`;

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white flex">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />

        <main
          className="flex-1 overflow-y-auto px-6 py-6"
          style={{ background: "radial-gradient(ellipse 60% 40% at 10% 0%, rgba(109,40,217,0.1) 0%, transparent 70%)" }}
        >
          <div className="max-w-lg mx-auto">
            {/* Header */}
            <div className="flex items-baseline justify-between mb-6">
              <div>
                <h1 className="text-2xl font-black flex items-center gap-2">
                  <span>⚙</span> Edit Profile
                </h1>
                <p className="text-sm text-white/35 mt-1">
                  Update your photo and personal details.
                </p>
              </div>
              <Link
                to="/"
                className="text-xs text-violet-400 hover:text-violet-300 font-medium no-underline transition-colors whitespace-nowrap"
              >
                ← Back
              </Link>
            </div>

            <div className="bg-[#141414] border border-white/10 rounded-2xl shadow-2xl p-6 sm:p-8">
              {/* Alerts */}
              {serverError && (
                <div className="mb-5 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-400">
                  {serverError}
                </div>
              )}
              {success && (
                <div className="mb-5 px-4 py-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-sm text-emerald-400">
                  {success}
                </div>
              )}

              {/* ── Avatar ─────────────────────────────── */}
              <div className="flex items-center gap-5 mb-7">
                <div className="relative flex-shrink-0">
                  {/* Click to open the full-screen viewer */}
                  <button
                    type="button"
                    onClick={() => setViewerOpen(true)}
                    aria-label="View profile picture"
                    title="Click to view"
                    className="group relative block w-20 h-20 rounded-full overflow-hidden
                               bg-gradient-to-br from-violet-500 to-purple-700
                               flex items-center justify-center text-2xl font-bold text-white
                               ring-2 ring-white/10 hover:ring-violet-400/60
                               transition-all duration-200 hover:scale-105 active:scale-95
                               focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
                  >
                    {avatar ? (
                      <img src={avatar} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      initialsOf(user)
                    )}

                    {/* Magnify hint on hover */}
                    <span
                      aria-hidden="true"
                      className="absolute inset-0 flex items-center justify-center
                                 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24">
                        <circle cx="11" cy="11" r="6.5" fill="none" stroke="white" strokeWidth="2" />
                        <path d="M16 16l4.5 4.5" stroke="white" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </span>
                  </button>

                  {processing && (
                    <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center pointer-events-none">
                      <div className="w-5 h-5 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={processing}
                      className="bg-white/8 hover:bg-white/15 border border-white/10 text-white
                                 text-xs font-semibold px-4 py-2 rounded-xl transition-all disabled:opacity-50"
                    >
                      {avatar ? "Change photo" : "Upload photo"}
                    </button>

                    {avatar && (
                      <button
                        type="button"
                        onClick={() => { setAvatar(""); setSuccess(""); }}
                        className="text-xs font-semibold px-4 py-2 rounded-xl transition-all
                                   text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-transparent"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <p className="text-[11px] text-white/30 mt-2 leading-relaxed">
                    JPG, PNG or GIF. Cropped to a square and resized automatically.
                  </p>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePickImage}
                    className="hidden"
                    aria-label="Upload profile photo"
                  />
                </div>
              </div>

              <div className="border-t border-white/5 mb-6" />

              {/* ── Details ────────────────────────────── */}
              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                <div>
                  <label htmlFor="fullName" className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">
                    Full Name
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    name="fullName"
                    value={form.fullName}
                    onChange={handleChange}
                    placeholder="John Doe"
                    className={inputClass("fullName")}
                  />
                  <FieldError message={errors.fullName} />
                </div>

                <div>
                  <label htmlFor="username" className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">
                    Username
                  </label>
                  <input
                    id="username"
                    type="text"
                    name="username"
                    value={form.username}
                    onChange={handleChange}
                    placeholder="mojito_fan"
                    className={inputClass("username")}
                  />
                  <FieldError message={errors.username} />
                  <p className="text-[11px] text-white/25 mt-1">
                    You sign in with this, so remember it if you change it.
                  </p>
                </div>

                <div>
                  <label htmlFor="email" className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    className={inputClass("email")}
                  />
                  <FieldError message={errors.email} />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={saving || processing || !isDirty}
                    className="flex-1 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed
                               text-white font-semibold py-3 rounded-xl transition-all
                               shadow-lg shadow-violet-500/20"
                  >
                    {saving ? "Saving…" : "Save changes"}
                  </button>

                  {isDirty && !saving && (
                    <button
                      type="button"
                      onClick={() => {
                        setForm({
                          fullName: user.fullName ?? "",
                          username: user.username ?? "",
                          email:    user.email ?? "",
                        });
                        setAvatar(user.avatar ?? "");
                        setErrors({});
                        setServerError("");
                        setSuccess("");
                      }}
                      className="px-5 py-3 rounded-xl text-sm font-semibold text-white/50
                                 hover:text-white hover:bg-white/5 transition-all"
                    >
                      Reset
                    </button>
                  )}
                </div>

                {!isDirty && (
                  <p className="text-center text-[11px] text-white/25">
                    Make a change to enable saving.
                  </p>
                )}
              </form>
            </div>
          </div>
        </main>
      </div>

      {/* ── Full-screen avatar viewer ─────────────────── */}
      <AvatarViewer
        open={viewerOpen}
        src={avatar}
        initials={initialsOf(user)}
        name={user?.fullName}
        username={user?.username}
        onClose={() => setViewerOpen(false)}
        onChange={() => {
          setViewerOpen(false);
          fileInputRef.current?.click();
        }}
        onRemove={() => {
          setAvatar("");
          setSuccess("");
          setViewerOpen(false);
        }}
      />
    </div>
  );
}
