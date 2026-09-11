import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-950">
      {/* Navbar */}
      <nav className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <span className="text-xl font-bold text-indigo-400">🎙 VoxUz</span>
        <div className="flex gap-4">
          <Link href="/login" className="btn-secondary text-sm py-2 px-4">
            Kirish
          </Link>
          <Link href="/register" className="btn-primary text-sm py-2 px-4">
            Ro'yxatdan o'tish
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-24 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-indigo-600/20 border border-indigo-500/30 rounded-full px-4 py-2 text-indigo-300 text-sm mb-8">
          🇺🇿 O'zbek tili uchun AI ovoz platformasi
        </div>

        <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
          O'z ovozingizni
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
            {" "}klonlang
          </span>
        </h1>

        <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
          O'zbek tilidagi birinchi AI ovoz klonlash platformasi.
          Ovozingizni klonlang va istalgan matnni o'z ovozingizda eshiting.
        </p>

        <div className="flex gap-4 justify-center flex-wrap">
          <Link href="/register" className="btn-primary text-lg py-4 px-8">
            Bepul boshlang →
          </Link>
          <Link href="/explore" className="btn-secondary text-lg py-4 px-8">
            Ovozlarni tinglang 🎧
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-8 mt-20 max-w-2xl mx-auto">
          {[
            { n: "100", label: "Bepul kredit" },
            { n: "XTTS v2", label: "AI Model" },
            { n: "O'zbek", label: "Til" },
          ].map((s) => (
            <div key={s.label} className="card text-center">
              <div className="text-3xl font-bold text-indigo-400">{s.n}</div>
              <div className="text-gray-400 text-sm mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">Imkoniyatlar</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: "🎙",
              title: "Ovoz klonlash",
              desc: "Faqat 10-30 soniyalik audio namuna bilan ovozingizni klonlang",
            },
            {
              icon: "🔊",
              title: "Text-to-Speech",
              desc: "Istalgan matnni o'z ovozingizda audio faylga aylantiring",
            },
            {
              icon: "🌐",
              title: "Ommaviy kutubxona",
              desc: "Boshqa foydalanuvchilarning ovozlaridan foydalaning",
            },
            {
              icon: "🤖",
              title: "Telegram Bot",
              desc: "Telegram orqali ovoz yarating va boshqaring",
            },
            {
              icon: "🔒",
              title: "Xavfsiz",
              desc: "Faqat live recording — MP3 yuklab bo'lmaydi",
            },
            {
              icon: "💳",
              title: "Kredit tizimi",
              desc: "Ommaviy ovoz qo'shib bonus kredit oling",
            },
          ].map((f) => (
            <div key={f.title} className="card hover:border-indigo-500/50 transition-colors">
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-gray-400 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-6 py-16 text-center">
        <div className="card border-indigo-500/30">
          <h2 className="text-3xl font-bold mb-4">Hoziroq boshlang</h2>
          <p className="text-gray-400 mb-6">Ro'yxatdan o'tsangiz 100 kredit sovg'a!</p>
          <Link href="/register" className="btn-primary inline-block text-lg py-4 px-10">
            Bepul ro'yxatdan o'ting →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 px-6 py-8 text-center text-gray-500 text-sm">
        © 2024 VoxUz — O'zbek AI Ovoz Platformasi
      </footer>
    </main>
  );
}
