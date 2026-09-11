"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";

export default function Register() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError("Parol kamida 8 ta belgi bo'lishi kerak");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await api.register(email, password);
      localStorage.setItem("voxuz_token", data.access_token);
      localStorage.setItem("voxuz_credits", data.credits);
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Xato yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-bold text-indigo-400">🎙 VoxUz</Link>
          <p className="text-gray-400 mt-2">Yangi hisob yarating — 100 kredit sovg'a!</p>
        </div>

        <div className="card">
          <form onSubmit={submit} className="space-y-5">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@gmail.com"
                className="input-field"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Parol (kamida 8 belgi)</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-field"
                required
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">
                ❌ {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? "Yaratilmoqda..." : "Ro'yxatdan o'tish →"}
            </button>
          </form>

          <div className="mt-4 bg-indigo-600/10 border border-indigo-500/20 rounded-xl p-3 text-indigo-300 text-sm text-center">
            🎁 Ro'yxatdan o'tganda 100 kredit sovg'a!
          </div>

          <p className="text-center text-gray-400 text-sm mt-4">
            Hisobingiz bormi?{" "}
            <Link href="/login" className="text-indigo-400 hover:underline">
              Kiring
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
