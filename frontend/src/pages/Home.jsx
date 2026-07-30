import { useAuth } from "../context/AuthContext.jsx";
import Navbar from "../components/Navbar.jsx";

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white flex flex-col">
      <Navbar />
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6">
        <span className="text-4xl mb-4">🍹</span>
        <h1 className="text-3xl font-black mb-2">
          Welcome back, {user?.fullName?.split(" ")[0] || user?.username}!
        </h1>
        <p className="text-white/40 text-sm max-w-sm">
          Your personalised recommendations are on the way. This page will be fully built out next.
        </p>
      </main>
    </div>
  );
}
