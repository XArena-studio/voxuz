"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import { api } from "@/lib/api";

function GenerateContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [voices, setVoices] = useState<Array<{id: string; name: string}>>([]);
  const [publicVoices, setPublicVoices] = useState<Array<{id: string; name: string; owner: string}>>([]);
  const [selectedVoice, setSelectedVoice] = useState(params.get("voice") || "");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [genId, setGenId] = useState("");
  const [status, setStatus] = useState("");
  const [outputUrl, setOutputUrl] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("voxuz_token");
    if (!token) { router.push("/login"); return; }
    Promise.all([api.myVoices(), api.publicVoices()]).then(([v, p]) => {
      setVoices(v);
      setPublicVoices(p);
    });
  }, [router]);

  const generate = async () => {
    if (!text || !selectedVoice) return;
    setLoading(true);
    setError("");
    setOutputUrl("");
    setStatus("queued");
    try {
      const data = await api.generate(text, selectedVoice);
      setGenId(data.generation_id);
      localStorage.setItem("voxuz_credits", data.credits_remaining);
      // Poll status
      const poll = setInterval(async () => {
        const s = await api.getGeneration(data.generation_id);
        setStatus(s.status);
        if (s.status === "done") {
          setOutputUrl(s.output_url);
          clearInterval(poll);
          setLoading(false);
        } else if (s.status === "failed") {
          setError("Audio yaratishda xato yuz berdi");
          clearInterval(poll);
          setLoading(false);
        }
      }, 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Xato");
      setLoading(false);
    }
  };

  const allVoices = [
    ...voices.map((v) => ({ ...v, type: "my" as const })),
    ...publicVoices.map((v) => ({ ...v, type: "public" as const })),
  ];

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold mb-2">🔊 Audio yaratish</h1>
        <p className="text-gray-400 mb-8">Matn kiriting va ovoz tanlang</p>

        <div className="space-y-6">
          {/* Text input */}
          <div className="card">
            <label className="block text-sm text-gray-400 mb-3">Matn (max 500 belgi)</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 500))}
              placeholder="Bu yerga o'zbek tilidagi matn yozing..."
              rows={5}
              className="input-field resize-none"
            />
            <div className="flex justify-between mt-2 text-xs text-gray-500">
              <span>{text.length}/500</span>
              <span>💳 1 kredit</span>
            </div>
          </div>

          {/* Voice selection */}
          <div className="card">
            <label className="block text-sm text-gray-400 mb-3">Ovoz tanlang</label>
            {allVoices.length === 0 ? (
              <div className="text-center py-6 text-gray-400">
                <p>Hali ovoz yo'q.</p>
                <a href="/clone" className="text-indigo-400 text-sm hover:underline mt-2 block">
                  → Ovoz klonlash
                </a>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {allVoices.map((v) => (
                  <div
                    key={v.id}
                    onClick={() => setSelectedVoice(v.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      selectedVoice === v.id
                        ? "border-indigo-500 bg-indigo-600/20"
                        : "border-white/10 hover:border-white/30"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span>{v.type === "my" ? "🔒" : "🌐"}</span>
                      <div>
                        <p className="text-sm font-medium">{v.name}</p>
                        {v.type === "public" && (
                          <p className="text-xs text-gray-400">@{(v as {owner: string}).owner}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
              ❌ {error}
            </div>
          )}

          {/* Status */}
          {status && status !== "done" && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-yellow-300 text-sm text-center">
              ⏳ {status === "queued" ? "Navbatda..." : "Audio yaratilmoqda..."}
            </div>
          )}

          {/* Output */}
          {outputUrl && (
            <div className="card border-green-500/30 space-y-3">
              <p className="text-green-400 font-semibold">✅ Audio tayyor!</p>
              <audio controls src={outputUrl} className="w-full" />
              <a href={outputUrl} download className="btn-secondary text-sm py-2 px-4 inline-block">
                ⬇️ Yuklab olish
              </a>
            </div>
          )}

          <button
            onClick={generate}
            disabled={loading || !text || !selectedVoice}
            className="btn-primary w-full py-4 text-lg"
          >
            {loading ? "Yaratilmoqda..." : "🔊 Audio yaratish"}
          </button>
        </div>
      </main>
    </div>
  );
}

export default function Generate() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-indigo-400">Yuklanmoqda...</div>}>
      <GenerateContent />
    </Suspense>
  );
}
