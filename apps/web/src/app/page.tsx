import Link from "next/link";

const CATEGORIES = [
  {
    title: "Karyawan AI",
    desc: "Fondasi produktivitas harian: prompting, konten, visual, layanan pelanggan, dan automasi tugas rutin.",
  },
  {
    title: "Business AI",
    desc: "Sambungkan AI ke iklan dan channel penjualan Anda, dari Meta Ads sampai produk digital.",
  },
  {
    title: "Manager AI",
    desc: "Satu AI untuk seluruh organisasi — tiap divisi dapat spesialisnya sendiri, terpantau dari satu panel.",
  },
  {
    title: "Vibe Marketing",
    desc: "Konten, materi iklan, sampai landing page dalam hitungan menit — tanpa harus menunggu tim kreatif.",
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="text-xl font-bold tracking-tight">
          linqkeun<span className="text-brand-400">AI</span>
        </div>
        <nav className="hidden gap-8 text-sm text-white/70 md:flex">
          <a href="#karyawan" className="hover:text-white">
            Karyawan AI
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
          20 Karyawan AI, satu platform
        </p>
        <h1 className="text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">
          Delegasikan pekerjaan harian bisnis Anda ke{" "}
          <span className="text-brand-400">tim AI</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-white/70">
          Dari konten sosial, layanan pelanggan, sampai landing page — linqkeunAI
          menghadirkan karyawan AI yang siap kerja untuk setiap bagian bisnis
          Anda, kapan saja dibutuhkan.
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

      <section id="karyawan" className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="mb-10 text-center text-3xl font-bold">
          4 Sesi, 20 Karyawan AI
        </h2>
        <div className="grid gap-6 md:grid-cols-2">
          {CATEGORIES.map((c) => (
            <div key={c.title} className="card">
              <h3 className="mb-2 text-xl font-semibold text-brand-300">
                {c.title}
              </h3>
              <p className="text-white/70">{c.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="faq" className="mx-auto max-w-3xl px-6 py-16">
        <h2 className="mb-8 text-center text-3xl font-bold">
          Pertanyaan Umum
        </h2>
        <div className="space-y-4">
          <div className="card">
            <h4 className="font-semibold">Apakah saya perlu tahu coding?</h4>
            <p className="mt-1 text-white/70">
              Tidak. Setiap karyawan AI di linqkeunAI dipakai lewat form dan
              chat sederhana, baik di web maupun aplikasi mobile.
            </p>
          </div>
          <div className="card">
            <h4 className="font-semibold">
              Bisakah tim saya menggunakan ini bersama?
            </h4>
            <p className="mt-1 text-white/70">
              Ya. Modul Manager AI memungkinkan setiap divisi punya spesialis
              AI-nya sendiri, dengan pemakaian yang bisa dipantau dari satu
              panel admin.
            </p>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 py-8 text-center text-sm text-white/50">
        © {new Date().getFullYear()} linqkeunAI. Semua hak dilindungi.
      </footer>
    </main>
  );
}
