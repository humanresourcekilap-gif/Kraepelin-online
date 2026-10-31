export type CategoryGrade =
  | "BAIK_SEKALI"
  | "BAIK"
  | "SEDANG"
  | "KURANG"
  | "KURANG_SEKALI";

export type KraepelinScoresInput = {
  panker: number | null;
  tianker: number | null;
  janker: number | null;
  hanker: number | null;
  norma?: {
    panker?: { category?: string };
    tianker?: { category?: string };
    janker?: { category?: string };
    hanker?: { category?: string };
  } | null;
  namaKandidat?: string;
  posisiDilamar?: string;
};

export type RekomendasiStatus =
  | "DIREKOMENDASIKAN"
  | "DIPERTIMBANGKAN"
  | "TIDAK_DIREKOMENDASIKAN";

export type AspekDetail = {
  nama: string;
  rawScore: number | null;
  kategori: string;
  labelKategori: string;
  analisis: string;
  indikatorKunci: string;
};

export type InterpretasiPsikologi = {
  statusRekomendasi: RekomendasiStatus;
  labelRekomendasi: string;
  warnaBadge: {
    bg: string;
    text: string;
    border: string;
    dot: string;
  };
  tipeGayaKerja: string;
  ringkasanEksekutif: string;
  aspek: {
    kecepatan: AspekDetail;
    ketelitian: AspekDetail;
    kestabilan: AspekDetail;
    ketahanan: AspekDetail & { trenKurva: "MENANJAK" | "STABIL" | "MENURUN" };
  };
  kekuatanUtama: string[];
  areaPengembangan: string[];
  rekomendasiPenempatan: string[];
  panduanWawancaraHR: string[];
};

function formatCategoryLabel(cat?: string): string {
  switch (cat) {
    case "BAIK_SEKALI":
      return "Sangat Baik";
    case "BAIK":
      return "Baik";
    case "SEDANG":
      return "Cukup / Rata-rata";
    case "KURANG":
      return "Kurang";
    case "KURANG_SEKALI":
      return "Sangat Kurang";
    default:
      return "Belum Terdefinisi";
  }
}

export function hitungInterpretasiKraepelin(
  input: KraepelinScoresInput
): InterpretasiPsikologi {
  const panker = input.panker ?? 0;
  const tianker = input.tianker ?? 0;
  const janker = input.janker ?? 0;
  const hanker = input.hanker ?? 0;

  const catP = (input.norma?.panker?.category as CategoryGrade) || "SEDANG";
  const catT = (input.norma?.tianker?.category as CategoryGrade) || "SEDANG";
  const catJ =
    (input.norma?.janker?.category as CategoryGrade) ||
    ((input.norma as { jankerAverageDeviation?: { category?: string } })?.jankerAverageDeviation?.category as CategoryGrade) ||
    "SEDANG";
  const catH = (input.norma?.hanker?.category as CategoryGrade) || "SEDANG";

  const isHighP = catP === "BAIK" || catP === "BAIK_SEKALI";
  const isLowP = catP === "KURANG" || catP === "KURANG_SEKALI";
  const isHighT = catT === "BAIK" || catT === "BAIK_SEKALI"; // High accuracy = low errors
  const isLowT = catT === "KURANG" || catT === "KURANG_SEKALI"; // Low accuracy = high errors
  const isHighJ = catJ === "BAIK" || catJ === "BAIK_SEKALI"; // High stability
  const isLowJ = catJ === "KURANG" || catJ === "KURANG_SEKALI"; // Unstable rhythm

  // Arah kurva kerja (HANKER)
  let trenKurva: "MENANJAK" | "STABIL" | "MENURUN" = "STABIL";
  if (hanker > 0.8) {
    trenKurva = "MENANJAK";
  } else if (hanker < -0.8) {
    trenKurva = "MENURUN";
  }

  // 1. Tipe Gaya Kerja
  let tipeGayaKerja = "Pekerja Adaptif & Seimbang";
  let ringkasanEksekutif = "";

  if (isHighP && isHighT) {
    tipeGayaKerja = "Efisien & Presisi Tinggi (High Performer)";
    ringkasanEksekutif =
      "Kandidat memperlihatkan kapasitas kerja yang sangat unggul. Memiliki ritme kerja cepat disertai ketelitian prima tanpa mengorbankan kualitas di bawah tekanan batas waktu.";
  } else if (isHighP && isLowT) {
    tipeGayaKerja = "Cepat namun Tergesa-gesa (Kuantitas-Sentris)";
    ringkasanEksekutif =
      "Kandidat berorientasi tinggi pada pemenuhan target output dan memiliki kecepatan tinggi, namun cenderung impulsif dan rentan mengabaikan detail ketika dibebani target ketat.";
  } else if (isLowP && isHighT) {
    tipeGayaKerja = "Cermat & Hati-hati (Perfeksionis / Metodis)";
    ringkasanEksekutif =
      "Kandidat memprioritaskan ketepatan dan nihil kesalahan (zero-defect). Sangat berhati-hati dalam memproses informasi, namun memerlukan waktu lebih panjang untuk merampungkan tugas.";
  } else if (isLowP && isLowT) {
    tipeGayaKerja = "Pasif & Rentan Kesalahan";
    ringkasanEksekutif =
      "Kandidat menunjukkan tempo kerja di bawah standar serta tingkat ketelitian yang masih perlu banyak pembenahan. Membutuhkan bimbingan intensif dan supervisi ketat.";
  } else {
    tipeGayaKerja = "Proporsional & Standar Operasional";
    ringkasanEksekutif =
      "Kandidat memiliki kapasitas kerja yang cukup memadai dalam menyelesaikan rutinitas harian dengan perpaduan kecepatan dan akurasi yang berada pada ambang toleransi standar.";
  }

  // 2. Status Rekomendasi HR
  let statusRekomendasi: RekomendasiStatus = "DIPERTIMBANGKAN";
  let labelRekomendasi = "Dapat Dipertimbangkan";
  let warnaBadge = {
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    dot: "bg-blue-500",
  };

  if (isHighT && (isHighP || catP === "SEDANG") && !isLowJ && catH !== "KURANG_SEKALI") {
    statusRekomendasi = "DIREKOMENDASIKAN";
    labelRekomendasi = "Sangat Direkomendasikan";
    warnaBadge = {
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      border: "border-emerald-200",
      dot: "bg-emerald-500",
    };
  } else if (isLowT && isLowP) {
    statusRekomendasi = "TIDAK_DIREKOMENDASIKAN";
    labelRekomendasi = "Kurang Direkomendasikan";
    warnaBadge = {
      bg: "bg-rose-50",
      text: "text-rose-700",
      border: "border-rose-200",
      dot: "bg-rose-500",
    };
  } else if (catT === "KURANG_SEKALI" || catP === "KURANG_SEKALI") {
    statusRekomendasi = "TIDAK_DIREKOMENDASIKAN";
    labelRekomendasi = "Perlu Evaluasi Lanjut";
    warnaBadge = {
      bg: "bg-rose-50",
      text: "text-rose-700",
      border: "border-rose-200",
      dot: "bg-rose-500",
    };
  }

  // 3. Analisis Spesifik per Aspek
  // Kecepatan
  let narasiP = "Kecepatan kerja tergolong sedang, memenuhi standar minimum tugas operasional.";
  if (catP === "BAIK_SEKALI") {
    narasiP = "Daya tanggap kognitif sangat tinggi. Mampu memproses informasi dan menyelesaikan tugas kuantitatif dalam tempo yang sangat cepat.";
  } else if (catP === "BAIK") {
    narasiP = "Memiliki produktivitas di atas rata-rata. Cekatan dan tanggap dalam merespons instruksi bertarget waktu.";
  } else if (catP === "KURANG") {
    narasiP = "Tempo kerja tergolong lambat. Membutuhkan waktu jeda lebih banyak untuk mengolah informasi numerik/data.";
  } else if (catP === "KURANG_SEKALI") {
    narasiP = "Output kerja berada jauh di bawah rata-rata kohort pendidikan. Berisiko kesulitan dalam lingkungan kerja dengan tenggat waktu padat.";
  }

  // Ketelitian
  let narasiT = "Ketelitian berada pada batas normal, terdapat sedikit kesalahan acak yang masih wajar.";
  if (catT === "BAIK_SEKALI") {
    narasiT = "Akurasi kerja luar biasa prima dengan rasio salah dan terlewat mendekati nol. Menunjukkan konsentrasi tinggi dan disiplin mental kuat.";
  } else if (catT === "BAIK") {
    narasiT = "Tingkat ketelitian sangat baik. Mampu menjaga fokus dan meminimalisir kesalahan meskipun berada di bawah tekanan waktu.";
  } else if (catT === "KURANG") {
    narasiT = "Cenderung ceroboh saat dikejar target. Terdapat pola salah hitung atau item terlewat yang dapat merugikan alur kerja presisi.";
  } else if (catT === "KURANG_SEKALI") {
    narasiT = "Tingkat kesalahan dan soal terlewat sangat tinggi. Sangat rentan melakukan kekeliruan fatal apabila tidak dikontrol secara berlapis.";
  }

  // Kestabilan
  let narasiJ = "Fluktuasi ritme kerja dalam rentang normal, mampu menyesuaikan diri dengan dinamika tugas harian.";
  if (catJ === "BAIK_SEKALI" || catJ === "BAIK") {
    narasiJ = "Ritme kerja sangat konsisten dan stabil. Menandakan kontrol emosi yang matang, ketenangan pikiran, dan ketahanan terhadap distraksi eksternal.";
  } else if (catJ === "KURANG" || catJ === "KURANG_SEKALI") {
    narasiJ = "Grafik kecepatan menunjukkan lompatan naik-turun yang tajam. Menandakan kestabilan konsentrasi yang mudah buyar atau pengaruh suasana hati (*mood-dependent*).";
  }

  // Ketahanan
  let narasiH = "Daya tahan kerja terpelihara secara konstan tanpa indikasi penurunan performa dini.";
  if (trenKurva === "MENANJAK") {
    narasiH = "Kurva kerja memperlihatkan pola menanjak positif. Kandidat memiliki daya adaptasi prima (*positive learning curve*), motivasi membara, dan stamina mental yang kian kuat seiring berjalannya tugas.";
  } else if (trenKurva === "MENURUN") {
    narasiH = "Kurva kerja memperlihatkan kecenderungan menurun di paruh akhir tes. Mengindikasikan kerentanan terhadap kelelahan mental (*cognitive fatigue*), kejenuhan tugas berulang, atau penurunan motivasi bertahap.";
  }

  // 4. Kekuatan & Area Pengembangan
  const kekuatanUtama: string[] = [];
  const areaPengembangan: string[] = [];

  if (isHighT) kekuatanUtama.push("Ketelitian tinggi dengan orientasi kuat pada hasil kerja yang akurat dan rapi.");
  if (isHighP) kekuatanUtama.push("Kecepatan pemrosesan informasi tinggi, tanggap terhadap target dan beban kerja dinamis.");
  if (isHighJ) kekuatanUtama.push("Kestabilan emosional yang matang, tidak mudah panik dalam situasi bertekanan waktu.");
  if (trenKurva === "MENANJAK") kekuatanUtama.push("Daya tahan mental kuat dan kurva pembelajaran cepat saat beradaptasi dengan tugas baru.");

  if (kekuatanUtama.length === 0) {
    kekuatanUtama.push("Dapat menjalankan pekerjaan dengan ritme kerja yang fleksibel sesuai instruksi.");
    kekuatanUtama.push("Memiliki potensi berkembang melalui pelatihan SOP teknis yang terstruktur.");
  }

  if (isLowT) areaPengembangan.push("Perlu membiasakan mekanisme double-check sebelum menyerahkan hasil kerja akhir.");
  if (isLowP) areaPengembangan.push("Perlu melatih kecepatan eksekusi dan manajemen prioritas waktu pada tugas-tugas mendesak.");
  if (isLowJ) areaPengembangan.push("Perlu menjaga stabilitas fokus dan ketenangan agar output tidak bergantung pada kondisi emosi.");
  if (trenKurva === "MENURUN") areaPengembangan.push("Perlu strategi pengelolaan energi mental agar konsentrasi tidak cepat drop pada pekerjaan berdurasi panjang.");

  if (areaPengembangan.length === 0) {
    areaPengembangan.push("Pertahankan performa prima dan perluas tantangan pada lingkup tanggung jawab yang lebih kompleks.");
  }

  // 5. Rekomendasi Penempatan Posisi Kerja
  const rekomendasiPenempatan: string[] = [];
  if (isHighT) {
    rekomendasiPenempatan.push("Accounting / Finance / Payroll (Ketelitian Angka)");
    rekomendasiPenempatan.push("Quality Assurance (QA) / Quality Control (Pemeriksaan Standar)");
    rekomendasiPenempatan.push("Administrasi Dokumen / Legal / Data Verification");
  }
  if (isHighP && !isLowT) {
    rekomendasiPenempatan.push("Operasional Lapangan / Fast-Paced Logistics");
    rekomendasiPenempatan.push("Sales / Business Development / Relationship Officer");
    rekomendasiPenempatan.push("Project Coordination / Tim Reaksi Cepat");
  }
  if (isLowP && isHighT) {
    rekomendasiPenempatan.push("Staf Arsip / Analis Dokumen Kepatuhan (Audit Compliance)");
    rekomendasiPenempatan.push("Data Entry Spesialis Akurasi");
  }
  if (rekomendasiPenempatan.length === 0) {
    rekomendasiPenempatan.push("Staf Operasional Umum / Pendukung Administrasi");
    rekomendasiPenempatan.push("Pelayanan Pelanggan (Customer Service) dengan SOP Jelas");
  }

  // 6. Panduan Pertanyaan Wawancara Mendalam untuk HR (Interview Probing Guide)
  const panduanWawancaraHR: string[] = [];
  if (isLowT) {
    panduanWawancaraHR.push(
      "Gali bagaimana metode kandidat dalam mengecek ulang hasil pekerjaannya ketika diberi target waktu yang sangat ketat."
    );
    panduanWawancaraHR.push(
      "Tanyakan contoh situasi di masa lalu ketika kandidat melakukan kesalahan kerja karena terburu-buru, dan bagaimana langkah mitigasinya."
    );
  }
  if (trenKurva === "MENURUN") {
    panduanWawancaraHR.push(
      "Kandidat mengalami penurunan performa pada paruh akhir tes. Tanyakan strategi apa yang ia gunakan untuk mengatasi kejenuhan mental saat mengerjakan tugas berulang sepanjang hari."
    );
  }
  if (isLowJ) {
    panduanWawancaraHR.push(
      "Hasil tes menunjukkan fluktuasi ritme yang cukup dinamis. Tanyakan bagaimana kandidat mengelola fokus saat tiba-tiba menghadapi interupsi atau perubahan prioritas mendadak."
    );
  }
  if (isHighP && isHighT) {
    panduanWawancaraHR.push(
      "Kandidat memiliki kapasitas kerja tinggi. Gali motivasi karir jangka panjangnya dan ekspektasi lingkungan kerja yang dapat membuatnya tetap tertantang."
    );
  }

  if (panduanWawancaraHR.length === 0) {
    panduanWawancaraHR.push(
      "Eksplorasi pengalaman kandidat dalam menyelesaikan proyek dengan batas waktu tertentu dan bagaimana ia membagi waktu kerjanya."
    );
  }

  return {
    statusRekomendasi,
    labelRekomendasi,
    warnaBadge,
    tipeGayaKerja,
    ringkasanEksekutif,
    aspek: {
      kecepatan: {
        nama: "Kecepatan Kerja (PANKER)",
        rawScore: panker,
        kategori: catP,
        labelKategori: formatCategoryLabel(catP),
        analisis: narasiP,
        indikatorKunci: "Mengukur output kerja dan daya tanggap kognitif per kolom.",
      },
      ketelitian: {
        nama: "Ketelitian Kerja (TIANKER)",
        rawScore: tianker,
        kategori: catT,
        labelKategori: formatCategoryLabel(catT),
        analisis: narasiT,
        indikatorKunci: "Mengukur akumulasi kesalahan dan nomor yang terlewat.",
      },
      kestabilan: {
        nama: "Kestabilan Kerja (JANKER)",
        rawScore: janker,
        kategori: catJ,
        labelKategori: formatCategoryLabel(catJ),
        analisis: narasiJ,
        indikatorKunci: "Mengukur konsistensi ritme dan kematangan kontrol emosi.",
      },
      ketahanan: {
        nama: "Ketahanan Kerja (HANKER)",
        rawScore: hanker,
        kategori: catH,
        labelKategori: formatCategoryLabel(catH),
        trenKurva,
        analisis: narasiH,
        indikatorKunci: "Mengukur kemiringan lereng kurva kerja dan resistensi terhadap kelelahan.",
      },
    },
    kekuatanUtama,
    areaPengembangan,
    rekomendasiPenempatan,
    panduanWawancaraHR,
  };
}

