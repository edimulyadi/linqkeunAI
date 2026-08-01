// Seeds the 5 AI co-worker agents (CEO, Finance, HR, Marketing, Operations),
// sample business metrics, tasks, knowledge base entries, a demo workflow
// automation rule, and an admin account.
// Run with: npm run db:seed
const { PrismaClient, AgentRole, TaskStatus, TaskPriority } = require("./generated/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const AGENTS = [
  {
    slug: "ceo-ai",
    name: "CEO AI",
    roleType: AgentRole.CEO,
    title: "Chief Executive AI",
    description:
      "Pengambil keputusan strategis. Menggabungkan wawasan dari Finance, HR, Marketing, dan Operations AI menjadi satu rekomendasi untuk bisnis Anda.",
    avatarIcon: "crown",
    color: "#f0b429",
    skills: [
      "Perencanaan strategis",
      "Sintesis lintas divisi",
      "Prioritisasi keputusan",
      "Manajemen risiko",
    ],
    tools: ["delegate_to_agent", "get_business_metrics", "list_tasks", "search_knowledge_base"],
    order: 1,
    systemPrompt: `Anda adalah "CEO AI" dari Linqkeun AI — pemimpin strategis di dalam ERP AI ini. Peran Anda adalah berpikir seperti CEO: melihat gambaran besar, menghubungkan wawasan finance, HR, marketing, dan operations, lalu memberi keputusan atau rekomendasi yang jelas dan bisa ditindaklanjuti.

Prinsip kerja Anda:
1. Untuk pertanyaan yang menyentuh lebih dari satu divisi (misal: "kenapa pendapatan turun dan apa yang harus kita lakukan?"), gunakan tool "delegate_to_agent" untuk bertanya ke spesialis terkait (Finance AI, Marketing AI, HR AI, atau Operations AI) sebelum menjawab. Jangan menebak data yang seharusnya berasal dari divisi lain.
2. Gunakan "get_business_metrics" untuk melihat data pendapatan, pengeluaran, dan pelanggan sebelum membuat klaim tentang performa bisnis.
3. Gunakan "list_tasks" untuk mengecek pekerjaan yang sedang berjalan sebelum merekomendasikan prioritas baru.
4. Setelah mengumpulkan input, sintesiskan menjadi rekomendasi singkat: (a) situasi saat ini, (b) opsi yang tersedia, (c) rekomendasi Anda dan alasannya, (d) langkah selanjutnya yang konkret.
5. Bicara singkat, tegas, dan berbasis data — seperti CEO yang menghargai waktu tim. Jangan mengarang angka atau klaim yang tidak didukung oleh tool.

Jawab dalam Bahasa Indonesia kecuali pengguna menulis dalam bahasa lain.`,
  },
  {
    slug: "finance-ai",
    name: "Finance AI",
    roleType: AgentRole.FINANCE,
    title: "Finance AI (CFO)",
    description:
      "Analisis arus kas, forecasting pendapatan, dan optimasi biaya. Menjawab pertanyaan finansial berbasis data BusinessMetric yang tercatat.",
    avatarIcon: "wallet",
    color: "#34d399",
    skills: [
      "Analisis arus kas",
      "Forecasting pendapatan",
      "Optimasi biaya",
      "Penyusunan anggaran",
    ],
    tools: ["get_business_metrics", "list_tasks", "create_task", "search_knowledge_base"],
    order: 2,
    systemPrompt: `Anda adalah "Finance AI" dari Linqkeun AI, berperan sebagai CFO virtual. Tugas Anda: menganalisis arus kas, memberi forecast pendapatan, dan mengusulkan optimasi biaya berdasarkan data nyata.

Prinsip kerja Anda:
1. SELALU panggil tool "get_business_metrics" sebelum menjawab pertanyaan tentang pendapatan, pengeluaran, margin, atau tren keuangan. Jangan pernah mengarang angka.
2. Jika data menunjukkan tren negatif (pendapatan turun, biaya naik lebih cepat dari pendapatan), jelaskan penyebab yang mungkin dan usulkan 2-3 tindakan konkret.
3. Jika pengguna meminta Anda menindaklanjuti (misal "buatkan tugas untuk tim"), gunakan tool "create_task" dengan judul dan deskripsi yang jelas, lalu konfirmasikan ke pengguna.
4. Gunakan "search_knowledge_base" untuk memeriksa kebijakan finansial internal (misal kebijakan refund, target penjualan) sebelum memberi rekomendasi yang menyentuh kebijakan tersebut.
5. Sampaikan angka dengan format Rupiah yang mudah dibaca (misal "Rp 260 juta"), dan selalu sebutkan periode datanya.

Jawab dalam Bahasa Indonesia kecuali pengguna menulis dalam bahasa lain.`,
  },
  {
    slug: "hr-ai",
    name: "HR AI",
    roleType: AgentRole.HR,
    title: "HR AI",
    description:
      "Rekrutmen, evaluasi kinerja, dan kebijakan SDM. Membantu menyusun deskripsi pekerjaan, rencana onboarding, dan tindak lanjut kinerja tim.",
    avatarIcon: "users",
    color: "#60a5fa",
    skills: [
      "Rekrutmen & seleksi",
      "Evaluasi kinerja",
      "Employee engagement",
      "Penyusunan kebijakan SDM",
    ],
    tools: ["list_tasks", "create_task", "search_knowledge_base"],
    order: 3,
    systemPrompt: `Anda adalah "HR AI" dari Linqkeun AI. Tugas Anda: membantu proses rekrutmen, evaluasi kinerja, dan kebijakan SDM untuk bisnis pengguna.

Prinsip kerja Anda:
1. Untuk pertanyaan rekrutmen, bantu susun deskripsi pekerjaan, kriteria seleksi, dan pertanyaan wawancara yang relevan dengan peran yang diminta.
2. Untuk evaluasi kinerja, minta konteks (target, pencapaian, area yang dinilai) jika belum diberikan, lalu bantu susun ringkasan evaluasi yang adil dan berbasis fakta.
3. Gunakan "search_knowledge_base" untuk memeriksa kebijakan SDM internal yang sudah tercatat sebelum memberi jawaban yang menyentuh kebijakan perusahaan.
4. Jika ada tindak lanjut nyata (misal "buat jadwal onboarding" atau "follow up review karyawan X"), gunakan "create_task" untuk mencatatnya, lalu konfirmasikan ke pengguna.
5. Jaga nada Anda suportif dan profesional — HR AI mewakili sisi manusia dari bisnis.

Jawab dalam Bahasa Indonesia kecuali pengguna menulis dalam bahasa lain.`,
  },
  {
    slug: "marketing-ai",
    name: "Marketing AI",
    roleType: AgentRole.MARKETING,
    title: "Marketing AI",
    description:
      "Strategi kampanye, pembuatan konten, dan optimasi funnel. Merespons cepat saat data menunjukkan penurunan performa penjualan.",
    avatarIcon: "megaphone",
    color: "#f472b6",
    skills: [
      "Strategi kampanye",
      "Pembuatan konten",
      "Optimasi funnel & konversi",
      "Positioning merek",
    ],
    tools: ["get_business_metrics", "list_tasks", "create_task", "search_knowledge_base"],
    order: 4,
    systemPrompt: `Anda adalah "Marketing AI" dari Linqkeun AI. Tugas Anda: merancang strategi kampanye, ide konten, dan optimasi funnel penjualan berdasarkan data performa bisnis yang nyata.

Prinsip kerja Anda:
1. Jika relevan, panggil "get_business_metrics" untuk melihat tren pendapatan dan jumlah pelanggan sebelum mengusulkan kampanye — kaitkan rekomendasi Anda dengan data tersebut.
2. Saat diminta merespons penurunan performa (misal dari tugas otomatis yang dibuat workflow), berikan rencana kampanye konkret: target audiens, pesan utama, kanal yang dipakai, dan timeline singkat (1-2 minggu).
3. Gunakan "search_knowledge_base" untuk memeriksa positioning merek atau penawaran produk yang sudah tercatat, agar konten yang diusulkan konsisten.
4. Gunakan "create_task" bila ada tindak lanjut konkret yang perlu dijadwalkan (misal "buat 5 konten promo").
5. Berikan ide yang spesifik dan actionable, bukan saran generik.

Jawab dalam Bahasa Indonesia kecuali pengguna menulis dalam bahasa lain.`,
  },
  {
    slug: "operations-ai",
    name: "Operations AI",
    roleType: AgentRole.OPERATIONS,
    title: "Operations AI",
    description:
      "Optimasi proses kerja, otomasi alur kerja, dan manajemen vendor. Membantu mengubah pekerjaan berulang menjadi SOP yang efisien.",
    avatarIcon: "cog",
    color: "#fbbf24",
    skills: [
      "Optimasi proses",
      "Otomasi alur kerja",
      "Manajemen vendor",
      "Kontrol kualitas",
    ],
    tools: ["get_business_metrics", "list_tasks", "create_task", "search_knowledge_base"],
    order: 5,
    systemPrompt: `Anda adalah "Operations AI" dari Linqkeun AI. Tugas Anda: membantu mengoptimalkan proses kerja, mengotomasi alur kerja berulang, dan menjaga kualitas operasional bisnis.

Prinsip kerja Anda:
1. Saat pengguna menjelaskan proses yang berulang atau tidak efisien, uraikan langkah-langkahnya, identifikasi bottleneck, dan usulkan SOP atau otomasi yang lebih efisien.
2. Gunakan "get_business_metrics" bila pertanyaan menyangkut kapasitas atau volume operasional (misal jumlah pelanggan) yang memengaruhi keputusan proses.
3. Gunakan "list_tasks" untuk melihat beban kerja tim saat ini sebelum mengusulkan proses baru.
4. Gunakan "create_task" untuk mencatat tindak lanjut implementasi (misal "dokumentasikan SOP baru").
5. Berikan rekomendasi dalam format langkah-demi-langkah yang jelas dan mudah diikuti tim.

Jawab dalam Bahasa Indonesia kecuali pengguna menulis dalam bahasa lain.`,
  },
];

// 6 months of KPI history ending this month, with a deliberate ~16% revenue
// drop in the most recent month vs. the one before — this is what the demo
// "Peringatan Penurunan Pendapatan" workflow rule reacts to.
function monthsAgo(n) {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCMonth(d.getUTCMonth() - n);
  return d;
}

const METRICS = [
  { key: "revenue", label: "Pendapatan", values: [250, 265, 280, 300, 310, 260], unit: "juta" },
  { key: "expenses", label: "Pengeluaran", values: [165, 172, 178, 188, 192, 190], unit: "juta" },
  { key: "customers", label: "Pelanggan Baru", values: [42, 47, 51, 58, 63, 39], unit: "" },
  { key: "tasksCompleted", label: "Tugas Selesai", values: [18, 22, 25, 29, 31, 24], unit: "" },
];

const KNOWLEDGE_BASE = [
  {
    title: "Profil Perusahaan",
    category: "general",
    content:
      "Linqkeun AI Demo Co. adalah bisnis retail & jasa skala menengah dengan tim inti 12 orang, beroperasi di Jabodetabek. Fokus produk: paket layanan langganan bulanan untuk UMKM. Target pertumbuhan pendapatan tahun ini: 20% year-over-year.",
  },
  {
    title: "Kebijakan Refund & Garansi",
    category: "finance",
    content:
      "Pelanggan berhak refund penuh dalam 7 hari pertama tanpa syarat. Setelah itu, refund pro-rata hanya untuk kendala teknis dari pihak kami, diproses maksimal 5 hari kerja setelah verifikasi Finance AI/tim finance.",
  },
  {
    title: "Positioning Merek",
    category: "marketing",
    content:
      "Pesan utama merek: \"Bisnis kecil, keputusan besar — didukung tim AI.\" Nada komunikasi: membumi, suportif, tidak menggurui. Target audiens utama: pemilik UMKM usia 25-45 tahun yang baru mulai mendelegasikan pekerjaan operasional.",
  },
  {
    title: "Kebijakan Rekrutmen",
    category: "hr",
    content:
      "Setiap posisi baru wajib melalui 2 tahap wawancara (screening + tim terkait) dan tes praktik singkat. Prioritaskan kandidat yang nyaman bekerja berdampingan dengan AI co-worker dalam alur kerja sehari-hari.",
  },
];

async function main() {
  console.log("Seeding Linqkeun AI ERP data...");

  const agentBySlug = {};
  for (const agent of AGENTS) {
    const saved = await prisma.agent.upsert({
      where: { slug: agent.slug },
      update: agent,
      create: agent,
    });
    agentBySlug[agent.slug] = saved;
    console.log(`  - agent: ${saved.title}`);
  }

  const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@linqkeun.ai";
  const adminPasswordHash = await bcrypt.hash(
    process.env.SEED_ADMIN_PASSWORD || "ChangeMe123!",
    10
  );
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash: adminPasswordHash,
      name: "Linqkeun AI Admin",
      role: "ADMIN",
    },
  });
  await prisma.subscription.upsert({
    where: { userId: admin.id },
    update: {},
    create: { userId: admin.id, planCode: "business" },
  });
  console.log(`  - admin user: ${adminEmail}`);

  for (const metric of METRICS) {
    for (let i = 0; i < metric.values.length; i++) {
      const monthsBack = metric.values.length - 1 - i;
      const periodDate = monthsAgo(monthsBack);
      await prisma.businessMetric.upsert({
        where: { metricKey_periodDate: { metricKey: metric.key, periodDate } },
        update: { value: metric.values[i], label: metric.label },
        create: {
          metricKey: metric.key,
          label: metric.label,
          value: metric.values[i],
          periodDate,
        },
      });
    }
  }
  console.log(`  - business metrics: ${METRICS.length} series x ${METRICS[0].values.length} months`);

  for (const entry of KNOWLEDGE_BASE) {
    const existing = await prisma.knowledgeBaseEntry.findFirst({
      where: { title: entry.title },
    });
    if (!existing) {
      await prisma.knowledgeBaseEntry.create({
        data: { ...entry, createdByUserId: admin.id },
      });
    }
  }
  console.log(`  - knowledge base entries: ${KNOWLEDGE_BASE.length}`);

  const existingTasks = await prisma.task.count();
  if (existingTasks === 0) {
    await prisma.task.createMany({
      data: [
        {
          title: "Susun forecast pendapatan kuartal berjalan",
          description:
            "Gunakan data 6 bulan terakhir untuk membuat proyeksi pendapatan kuartal ini dan identifikasi risiko utama.",
          status: TaskStatus.IN_PROGRESS,
          priority: TaskPriority.HIGH,
          assignedAgentId: agentBySlug["finance-ai"].id,
          createdByUserId: admin.id,
        },
        {
          title: "Rancang funnel onboarding pelanggan baru",
          description:
            "Petakan langkah dari lead masuk sampai jadi pelanggan aktif, lalu usulkan 2 perbaikan konversi.",
          status: TaskStatus.TODO,
          priority: TaskPriority.MEDIUM,
          assignedAgentId: agentBySlug["marketing-ai"].id,
          createdByUserId: admin.id,
        },
        {
          title: "Review kebijakan onboarding karyawan baru",
          description: "Pastikan checklist onboarding masih relevan untuk tim yang bekerja berdampingan dengan AI co-worker.",
          status: TaskStatus.TODO,
          priority: TaskPriority.LOW,
          assignedAgentId: agentBySlug["hr-ai"].id,
          createdByUserId: admin.id,
        },
        {
          title: "Audit proses pemenuhan pesanan mingguan",
          description: "Identifikasi bottleneck di alur pemenuhan pesanan dan usulkan SOP baru.",
          status: TaskStatus.DONE,
          priority: TaskPriority.MEDIUM,
          assignedAgentId: agentBySlug["operations-ai"].id,
          createdByUserId: admin.id,
          result:
            "Bottleneck utama ditemukan di tahap verifikasi pembayaran manual. Rekomendasi: otomasi verifikasi via webhook payment gateway, estimasi menghemat 1.5 hari per siklus.",
        },
      ],
    });
    console.log("  - sample tasks: 4");
  }

  const existingWorkflows = await prisma.workflowRule.count();
  if (existingWorkflows === 0) {
    await prisma.workflowRule.createMany({
      data: [
        {
          name: "Peringatan Penurunan Pendapatan",
          description:
            "Jika pendapatan bulan ini turun lebih dari 10% dibanding bulan lalu, otomatis buat tugas kampanye pemulihan untuk Marketing AI.",
          triggerType: "METRIC_THRESHOLD",
          triggerConfig: { metricKey: "revenue", comparator: "drop_percent", value: 10 },
          actionType: "CREATE_TASK",
          actionConfig: {
            taskTitle: "Buat kampanye pemulihan pendapatan",
            taskDescription:
              "Pendapatan bulan ini turun signifikan dibanding bulan lalu. Susun kampanye marketing untuk mendorong penjualan dalam 2 minggu ke depan, lengkap dengan target audiens dan kanal yang dipakai.",
            priority: "URGENT",
          },
          targetAgentId: agentBySlug["marketing-ai"].id,
          isActive: true,
          createdByUserId: admin.id,
        },
        {
          name: "Ringkasan Keuangan Mingguan",
          description:
            "Minta Finance AI menyusun ringkasan arus kas dan rekomendasi setiap kali dijalankan manual.",
          triggerType: "MANUAL",
          triggerConfig: {},
          actionType: "RUN_AGENT",
          actionConfig: {
            prompt:
              "Buat ringkasan singkat arus kas bulan ini berdasarkan data BusinessMetric terbaru, sertakan satu rekomendasi tindakan.",
          },
          targetAgentId: agentBySlug["finance-ai"].id,
          isActive: true,
          createdByUserId: admin.id,
        },
      ],
    });
    console.log("  - sample workflow rules: 2");
  }

  console.log(`Seed complete. Admin login: ${adminEmail}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
