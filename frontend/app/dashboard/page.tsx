"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { api } from "@/lib/api";

export default function Dashboard() {
  const router = useRouter();
  const [voices, setVoices] = useState<unknown[]>([]);
  const [generations, setGenerations] = useState<unknown[]>([]);
  const [credits, setCredits] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("voxuz_token");
    if (!token) { router.push("/login"); return; }

    const c = localStorage.getItem("voxuz_credits");
    if (c) setCredits(Number(c));

    // Voices
    api.myVoices()
      .then((v) => setVoices(v))
      .catch(() => setVoices([]));

    // Generations  
    api.myGenerations()
      .then((g) => setGenerations(g))
      .catch(() => setGenerations([]));

    setLoading(false);
  }, [router]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-indigo-400 text-xl animate-pulse">Yuklanmoqda...</div>
    </div>
  );

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-6xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-gray-400 mb-8">Xush kelibsiz! Platformangizni boshqaring.</p>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { label: "Kreditlar", value: credits, icon: "💳", color: "text-indigo-400" },
            { label: "Ovozlar", value: voices.length, icon: "🎙", color: "text-purple-400" },
            { label: "Generatsiyalar", value: generations.length, icon: "🔊", color: "text-green-400" },
            { label: "Tarif", value: "Bepul", icon: "⭐", color: "text-yellow-400" },
          ].map((s) => (
            <div key={s.label} className="card text-center">
              <div className="text-3xl mb-2">{s.icon}</div>
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-gray-400 text-sm mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div className="grid md:grid-cols-3 gap-4 mb-10">
          <Link href="/clone" className="card hover:border-indigo-500/50 transition-colors group cursor-pointer">
            <div className="text-3xl mb-3">🎙</div>
            <h3 className="font-semibold text-lg mb-1 group-hover:text-indigo-400 transition-colors">
              Ovoz klonlash
            </h3>
            <p className="text-gray-400 text-sm">Yangi ovoz qo'shing</p>
            <div className="text-indigo-400 text-sm mt-3">→ Boshlash</div>
          </Link>

          <Link href="/generate" className="card hover:border-purple-500/50 transition-colors group cursor-pointer">
            <div className="text-3xl mb-3">🔊</div>
            <h3 className="font-semibold text-lg mb-1 group-hover:text-purple-400 transition-colors">
              Audio yaratish
            </h3>
            <p className="text-gray-400 text-sm">Matnni ovozga aylantiring</p>
            <div className="text-purple-400 text-sm mt-3">→ Boshlash</div>
          </Link>

          <Link href="/explore" className="card hover:border-green-500/50 transition-colors group cursor-pointer">
            <div className="text-3xl mb-3">🌐</div>
            <h3 className="font-semibold text-lg mb-1 group-hover:text-green-400 transition-colors">
              Explore
            </h3>
            <p className="text-gray-400 text-sm">Ommaviy ovozlarni ko'ring</p>
            <div className="text-green-400 text-sm mt-3">→ Ko'rish</div>
          </Link>
        </div>

        {/* My voices */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Mening ovozlarim</h2>
            <Link href="/clone" className="text-indigo-400 text-sm hover:underline">+ Yangi ovoz</Link>
          </div>

          {voices.length === 0 ? (
            <div className="card text-center py-10 text-gray-400">
              <div className="text-4xl mb-3">🎙</div>
              <p>Hali ovoz yo'q.</p>
              <Link href="/clone" className="btn-primary inline-block mt-4 py-2 px-6 text-sm">
                Birinchi ovozni qo'shing
              </Link>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(voices as Array<{id: string; name: string; is_public: boolean; created_at: string}>).map((v) => (
                <div key={v.id} className="card hover:border-white/20 transition-colors">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">{v.name}</h3>
                      <p className="text-gray-400 text-xs mt-1">{v.created_at?.slice(0, 10)}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${v.is_public ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"}`}>
                      {v.is_public ? "🌐 Ommaviy" : "🔒 Shaxsiy"}
                    </span>
                  </div>
                  <Link href={`/generate?voice=${v.id}`} className="btn-primary text-sm py-2 px-4 mt-4 inline-block">
                    Audio yaratish
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent generations */}
        <div>
          <h2 className="text-xl font-semibold mb-4">So'nggi generatsiyalar</h2>
          {generations.length === 0 ? (
            <div className="card text-center py-8 text-gray-400">
              <div className="text-4xl mb-3">🔊</div>
              <p>Hali generatsiya yo'q.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(generations as Array<{id: string; status: string; text_preview: string; output_url: string; created_at: string}>).slice(0, 5).map((g) => (
                <div key={g.id} className="card flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{g.text_preview}</p>
                    <p className="text-gray-400 text-xs mt-1">{g.created_at?.slice(0, 10)}</p>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      g.status === "done" ? "bg-green-500/20 text-green-400" :
                      g.status === "failed" ? "bg-red-500/20 text-red-400" :
                      "bg-yellow-500/20 text-yellow-400"
                    }`}>
                      {g.status === "done" ? "✅ Tayyor" : g.status === "failed" ? "❌ Xato" : "⏳ Kutilmoqda"}
                    </span>
                    {g.output_url && (
                      <a href={g.output_url} target="_blank" className="text-indigo-400 text-sm hover:underline">
                        🎧 Tinglash
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
