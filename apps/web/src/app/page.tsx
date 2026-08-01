import Link from "next/link";

const AGENTS = [
  {
    title: "CEO AI",
    desc: "Menggabungkan wawasan seluruh divisi menjadi satu rekomendasi strategis yang jelas.",
  },
  {
    title: "Finance AI",
    desc: "Analisis arus kas, forecasting pendapatan, dan optimasi biaya berbasis data nyata.",
  },
  {
    title: "HR AI",
    desc: "Rekrutmen, evaluasi kinerja, dan kebijakan SDM — tanpa menunggu tim HR penuh waktu.",
  },
  {
    title: "Marketing AI",
    desc: "Strategi kampanye dan konten yang merespons cepat saat data performa berubah.",
  },
  {
    title: "Operations AI",
    desc: "Ubah proses berulang jadi SOP dan alur kerja otomatis yang efisien.",
  },
];

const FEATURES = [
  {
    title: "Chat dengan tiap AI co-worker",
    desc: "Antarmuka chat seperti ChatGPT, dengan memori percakapan per pengguna dan riwayat lengkap per agent.",
  },
  {
    title: "Manajemen tugas",
    desc: "Buat tugas, tugaskan ke AI atau manusia, lalu pantau statusnya — atau biarkan AI langsung mengerjakannya.",
  },
  {
    title: "Automasi berbasis trigger",
    desc: 'Contoh: "JIKA pendapatan turun → Marketing AI otomatis membuat kampanye." Atur aturan Anda sendiri di Settings.',
  },
  {
    title: "Laporan & analitik",
    desc: "Insight otomatis dan grafik performa bisnis, dihasilkan langsung dari data yang tercatat di sistem.",
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="text-xl font-bold tracking-tight">
          Linqkeun<span className="text-brand-400">AI</span>
        </div>
        <nav className="hidden gap-8 text-sm text-white/70 md:flex">
          <a href="#agents" className="hover:text-white">
            AI Co-Workers
          </a>
          <a href="#features" className="hover:text-white">
            Fitur
          </a>
          <a href="#faq" className="hover:text-white">
            FAQ
          </a>
        </nav>
        <div className="flex gap-3">
          <Link href="/login" className="btn-secondary">
            Masuk
          </Link>
          <Link href="/register" className="btn-primary">
            Mulai Gratis
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-6 py-20 text-center">
        <p className="mb-4 inline-block rounded-full border border-brand-400/30 bg-brand-400/10 px-4 py-1 text-sm text-brand-300">
          ERP + AI Co-Workers + Automation Engine
        </p>
        <h1 className="text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">
          Jalankan bisnis Anda bersama{" "}
          <span className="text-brand-400">tim AI co-worker</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-white/70">
          Linqkeun AI adalah platform ERP di mana setiap fungsi bisnis diwakili
          oleh AI: CEO, Finance, HR, Marketing, dan Operations. Chat dengan
          mereka, delegasikan pekerjaan, otomatiskan alur kerja, dan dapatkan
          insight — semua dari satu dashboard.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link href="/register" className="btn-primary text-base">
            Amankan Akses Sekarang
          </Link>
          <Link href="/login" className="btn-secondary text-base">
            Saya sudah punya akun
          </Link>
        </div>
      </section>

      <section id="agents" className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="mb-2 text-center text-3xl font-bold">
          5 AI Co-Worker, satu tim eksekutif virtual
        </h2>
        <p className="mb-10 text-center text-white/60">
          Setiap agent punya identitas peran, memori, dan tools sendiri — dan
          bisa saling berkolaborasi.
        </p>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {AGENTS.map((a) => (
            <div key={a.title} className="card">
              <h3 className="mb-2 text-xl font-semibold text-brand-300">{a.title}</h3>
              <p className="text-white/70">{a.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="mb-10 text-center text-3xl font-bold">
          Lebih dari sekadar chatbot
        </h2>
        <div className="grid gap-6 md:grid-cols-2">
          {FEATURES.map((f) => (
            <div key={f.title} className="card">
              <h3 className="mb-2 text-xl font-semibold text-brand-300">{f.title}</h3>
              <p className="text-white/70">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="faq" className="mx-auto max-w-3xl px-6 py-16">
        <h2 className="mb-8 text-center text-3xl font-bold">Pertanyaan Umum</h2>
        <div className="space-y-4">
          <div className="card">
            <h4 className="font-semibold">Apakah AI ini bisa benar-benar mengerjakan tugas?</h4>
            <p className="mt-1 text-white/70">
              Ya. Setiap agent bisa ditugaskan pekerjaan lewat modul Tasks, dan
              akan mengerjakannya menggunakan tools nyata (data bisnis,
              knowledge base perusahaan) sebelum menuliskan hasilnya.
            </p>
          </div>
          <div className="card">
            <h4 className="font-semibold">Bagaimana cara kerja automasi workflow?</h4>
            <p className="mt-1 text-white/70">
              Anda membuat aturan "JIKA (kondisi) MAKA (aksi)" di Settings —
              misalnya memicu Marketing AI membuat tugas kampanye saat
              pendapatan turun lebih dari 10%.
            </p>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 py-8 text-center text-sm text-white/50">
        © {new Date().getFullYear()} Linqkeun AI. Semua hak dilindungi.
      </footer>
    </main>
  );
}
