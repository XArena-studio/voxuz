"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { api } from "@/lib/api";

type Step = "verify" | "record" | "clone" | "done";

export default function Clone() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("verify");
  const [verifyText, setVerifyText] = useState("");
  const [verifyId, setVerifyId] = useState("");
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [verifyBlob, setVerifyBlob] = useState<Blob | null>(null);
  const [voiceName, setVoiceName] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [timer, setTimer] = useState(60);

  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("voxuz_token");
    if (!token) router.push("/login");
  }, [router]);

  // Get verification text
  const getVerifyText = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.getVerificationText();
      setVerifyText(data.text);
      setStep("verify");
      // Countdown
      setTimer(60);
      timerRef.current = setInterval(() => {
        setTimer((t) => {
          if (t <= 1) { clearInterval(timerRef.current!); return 0; }
          return t - 1;
        });
      }, 1000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Xato");
    } finally {
      setLoading(false);
    }
  };

  // Record verification audio
  const startVerifyRecording = async () => {
    chunksRef.current = [];
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mr = new MediaRecorder(stream);
    mediaRef.current = mr;
    mr.ondataavailable = (e) => chunksRef.current.push(e.data);
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      setVerifyBlob(blob);
    };
    mr.start();
    setRecording(true);
  };

  const stopVerifyRecording = () => {
    mediaRef.current?.stop();
    setRecording(false);
  };

  // Submit verification
  const submitVerify = async () => {
    if (!verifyBlob) return;
    setLoading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("audio", verifyBlob, "verify.webm");
      const token = localStorage.getItem("voxuz_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/verification/verify`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      setVerifyId(data.verification_id);
      clearInterval(timerRef.current!);
      setStep("record");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Xato");
    } finally {
      setLoading(false);
    }
  };

  // Record voice sample
  const startRecording = async () => {
    chunksRef.current = [];
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mr = new MediaRecorder(stream);
    mediaRef.current = mr;
    mr.ondataavailable = (e) => chunksRef.current.push(e.data);
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      setAudioBlob(blob);
    };
    mr.start();
    setRecording(true);
  };

  const stopRecording = () => {
    mediaRef.current?.stop();
    setRecording(false);
  };

  // Clone voice
  const cloneVoice = async () => {
    if (!audioBlob || !voiceName) return;
    setLoading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("name", voiceName);
      form.append("is_public", String(isPublic));
      form.append("verification_id", verifyId);
      form.append("audio", audioBlob, "voice.webm");
      const token = localStorage.getItem("voxuz_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/voices/clone`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      if (data.credits_remaining) localStorage.setItem("voxuz_credits", data.credits_remaining);
      setStep("done");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Xato");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-2xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold mb-2">🎙 Ovoz klonlash</h1>
        <p className="text-gray-400 mb-8">3 ta oddiy qadam bilan ovozingizni klonlang</p>

        {/* Steps indicator */}
        <div className="flex items-center gap-2 mb-8">
          {["verify", "record", "clone"].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                step === s || (step === "done" && i < 3) ? "bg-indigo-600" : "bg-white/10"
              }`}>{i + 1}</div>
              {i < 2 && <div className="w-12 h-px bg-white/10" />}
            </div>
          ))}
          <span className="ml-2 text-sm text-gray-400">
            {step === "verify" ? "Tasdiqlash" : step === "record" ? "Yozish" : step === "clone" ? "Saqlash" : "✅ Tayyor"}
          </span>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm mb-6">
            ❌ {error}
          </div>
        )}

        {/* Step 1: Verify */}
        {step === "verify" && (
          <div className="card space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">1. Ovozingizni tasdiqlang</h2>
              <p className="text-gray-400 text-sm">Quyidagi matnni o'qib yuboring — bu siz ekanligingizni tasdiqlaydi</p>
            </div>

            {!verifyText ? (
              <button onClick={getVerifyText} disabled={loading} className="btn-primary w-full">
                {loading ? "Yuklanmoqda..." : "Tasdiqlash matni olish →"}
              </button>
            ) : (
              <>
                <div className="bg-indigo-600/10 border border-indigo-500/30 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-indigo-300 text-xs font-semibold">O'QING:</span>
                    <span className={`text-xs ${timer < 15 ? "text-red-400" : "text-gray-400"}`}>
                      ⏱ {timer}s
                    </span>
                  </div>
                  <p className="text-white text-lg leading-relaxed">{verifyText}</p>
                </div>

                <div className="space-y-3">
                  {!verifyBlob ? (
                    <button
                      onClick={recording ? stopVerifyRecording : startVerifyRecording}
                      className={`w-full py-4 rounded-xl font-semibold transition-all ${
                        recording
                          ? "bg-red-600 hover:bg-red-700 animate-pulse"
                          : "bg-indigo-600 hover:bg-indigo-700"
                      }`}
                    >
                      {recording ? "⏹ To'xtatish" : "🎙 Yozishni boshlash"}
                    </button>
                  ) : (
                    <>
                      <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 text-green-400 text-sm text-center">
                        ✅ Audio yozildi! Tasdiqlash uchun yuboring
                      </div>
                      <div className="flex gap-3">
                        <button onClick={() => setVerifyBlob(null)} className="btn-secondary flex-1 py-3">
                          Qayta yozish
                        </button>
                        <button onClick={submitVerify} disabled={loading} className="btn-primary flex-1 py-3">
                          {loading ? "Tekshirilmoqda..." : "Tasdiqlash →"}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Step 2: Record */}
        {step === "record" && (
          <div className="card space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">2. Ovoz namunasini yozing</h2>
              <p className="text-gray-400 text-sm">10-30 soniya aniq va ravshan gapiring. Shovqinsiz joyda bo'ling.</p>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-yellow-300 text-sm">
              💡 Maslahat: Biror matn o'qing yoki o'zingizni tanishtiring — ovoz aniqroq bo'ladi
            </div>

            {!audioBlob ? (
              <button
                onClick={recording ? stopRecording : startRecording}
                className={`w-full py-6 rounded-xl font-semibold text-lg transition-all ${
                  recording
                    ? "bg-red-600 hover:bg-red-700 animate-pulse"
                    : "bg-indigo-600 hover:bg-indigo-700"
                }`}
              >
                {recording ? "⏹ To'xtatish" : "🎙 Yozishni boshlash"}
              </button>
            ) : (
              <>
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 text-green-400 text-sm text-center">
                  ✅ Ovoz namunasi tayyor!
                </div>
                <audio controls src={URL.createObjectURL(audioBlob)} className="w-full" />
                <div className="flex gap-3">
                  <button onClick={() => setAudioBlob(null)} className="btn-secondary flex-1">
                    Qayta yozish
                  </button>
                  <button onClick={() => setStep("clone")} className="btn-primary flex-1">
                    Davom etish →
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Step 3: Clone */}
        {step === "clone" && (
          <div className="card space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">3. Ovozni saqlang</h2>
              <p className="text-gray-400 text-sm">Ovozingizga nom bering va saqlang</p>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Ovoz nomi</label>
              <input
                value={voiceName}
                onChange={(e) => setVoiceName(e.target.value)}
                placeholder="Masalan: Mening ovozim"
                className="input-field"
              />
            </div>

            <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl cursor-pointer" onClick={() => setIsPublic(!isPublic)}>
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${isPublic ? "bg-indigo-600 border-indigo-600" : "border-white/30"}`}>
                {isPublic && <span className="text-white text-xs">✓</span>}
              </div>
              <div>
                <p className="text-sm font-medium">Ommaviy qilish</p>
                <p className="text-gray-400 text-xs">+50 bonus kredit olasiz!</p>
              </div>
            </div>

            <div className="bg-white/5 rounded-xl p-4 text-sm text-gray-400">
              <p>💳 Narx: <span className="text-white font-semibold">{isPublic ? "3" : "10"} kredit</span></p>
              {isPublic && <p className="text-green-400 mt-1">🎁 +50 kredit bonus!</p>}
            </div>

            <button onClick={cloneVoice} disabled={loading || !voiceName} className="btn-primary w-full py-4">
              {loading ? "Klonlanmoqda..." : "🎙 Ovozni klonlash"}
            </button>
          </div>
        )}

        {/* Done */}
        {step === "done" && (
          <div className="card text-center space-y-6">
            <div className="text-6xl">🎉</div>
            <h2 className="text-2xl font-bold">Ovoz muvaffaqiyatli klonlandi!</h2>
            <p className="text-gray-400">Endi bu ovoz bilan audio yaratishingiz mumkin</p>
            <div className="flex gap-3">
              <button onClick={() => { setStep("verify"); setVerifyText(""); setVerifyBlob(null); setAudioBlob(null); setVoiceName(""); }} className="btn-secondary flex-1">
                Yana qo'shish
              </button>
              <a href="/generate" className="btn-primary flex-1 py-3 text-center">
                Audio yaratish →
              </a>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
