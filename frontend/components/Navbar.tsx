"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Navbar() {
  const router = useRouter();
  const [credits, setCredits] = useState<number | null>(null);

  useEffect(() => {
    const c = localStorage.getItem("voxuz_credits");
    if (c) setCredits(Number(c));
  }, []);

  const logout = () => {
    localStorage.clear();
    router.push("/login");
  };

  return (
    <nav className="border-b border-white/10 px-6 py-4 flex items-center justify-between glass sticky top-0 z-50">
      <Link href="/dashboard" className="text-xl font-bold text-indigo-400">
        🎙 VoxUz
      </Link>

      <div className="flex items-center gap-6 text-sm">
        <Link href="/dashboard" className="text-gray-300 hover:text-white transition-colors">
          Dashboard
        </Link>
        <Link href="/clone" className="text-gray-300 hover:text-white transition-colors">
          Ovoz klonlash
        </Link>
        <Link href="/generate" className="text-gray-300 hover:text-white transition-colors">
          Audio yaratish
        </Link>
        <Link href="/explore" className="text-gray-300 hover:text-white transition-colors">
          Explore
        </Link>
      </div>

      <div className="flex items-center gap-4">
        {credits !== null && (
          <span className="bg-indigo-600/30 border border-indigo-500/30 px-3 py-1 rounded-full text-sm text-indigo-300">
            💳 {credits} kredit
          </span>
        )}
        <button onClick={logout} className="text-gray-400 hover:text-white text-sm transition-colors">
          Chiqish
        </button>
      </div>
    </nav>
  );
}
