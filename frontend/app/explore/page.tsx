"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { api } from "@/lib/api";

export default function Explore() {
  const [voices, setVoices] = useState<Array<{id: string; name: string; owner: string; tags: string; sample_url: string}>>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.publicVoices().then(setVoices).finally(() => setLoading(false));
  }, []);

  const filtered = voices.filter((v) =>
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    v.tags?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-6xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold mb-2">🌐 Ommaviy ovozlar</h1>
        <p className="text-gray-400 mb-8">Hamjamiyat tomonidan qo'shilgan ovozlar</p>

        {/* Search */}
        <div className="mb-8">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 Ovoz nomi yoki tag bo'yicha qidiring..."
            className="input-field max-w-md"
          />
        </div>

        {loading ? (
          <div className="text-center py-20 text-indigo-400 animate-pulse">Yuklanmoqda...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🎙</div>
            <p className="text-gray-400">Hali ommaviy ovozlar yo'q.</p>
            <Link href="/clone" className="btn-primary inline-block mt-4">
              Birinchi bo'lib qo'shing!
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((v) => (
              <div key={v.id} className="card hover:border-indigo-500/50 transition-colors space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">{v.name}</h3>
                    <p className="text-gray-400 text-sm">@{v.owner}</p>
                  </div>
                  <span className="bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded-full">
                    ✅ Tasdiqlangan
                  </span>
                </div>

                {v.tags && (
                  <div className="flex flex-wrap gap-2">
                    {v.tags.split(",").map((t) => (
                      <span key={t} className="bg-white/10 text-gray-300 text-xs px-2 py-1 rounded-full">
                        #{t.trim()}
                      </span>
                    ))}
                  </div>
                )}

                {v.sample_url && (
                  <audio controls src={v.sample_url} className="w-full h-8" />
                )}

                <Link
                  href={`/generate?voice=${v.id}`}
                  className="btn-primary text-sm py-2 px-4 text-center block"
                >
                  Bu ovozda audio yaratish →
                </Link>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
