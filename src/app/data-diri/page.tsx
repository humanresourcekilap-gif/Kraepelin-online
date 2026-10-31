"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  ArrowLeft,
  ArrowRight,
  UserRound,
  CalendarDays,
  Mail,
  Phone,
  MapPin,
  BriefcaseBusiness,

} from "lucide-react";

export default function DataDiriPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    nama: "",
    tempatLahir: "",
    tanggalLahir: "",
    email: "",
    nomorHP: "",
    posisi: "",
    jenjangPendidikan: "",
    jurusan: "",
    kelompokPendidikan: "",

  });

  const [error, setError] = useState("");
  function handleChange(
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>

  ) {

    const { name, value } = e.target;

    setForm((prev) => ({

      ...prev,

      [name]: value,

    }));

    setError("");
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {

    e.preventDefault();
    setError("");
    const isComplete = Object.values(form).every(

      (value) => value.trim() !== ""
    );
    if (!isComplete) {
      setError("Mohon lengkapi seluruh data sebelum melanjutkan.");
      return;

    }

    const emailInput = form.email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput)) {

      setError("Format email tidak valid. Contoh: nama@email.com.");

      return;

    }

    const updatedForm = {
      ...form,
      nama: form.nama.trim(),
      tempatLahir: form.tempatLahir.trim(),
      email: emailInput,
      nomorHP: form.nomorHP.trim(),
      posisi: form.posisi.trim(),

    };

    try {
      const response = await fetch("/api/candidates", {

        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedForm),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {

        setError(
          result.message || "Data gagal disimpan. Silakan coba lagi."
        );
        return;
      }
      sessionStorage.setItem(
        "kraepelin_candidate_data",
        JSON.stringify({
          ...updatedForm,
          candidateId: result.candidateId,
        })
      );

      router.push("/assessment");

    } catch {

      setError(

        "Tidak dapat terhubung ke server. Periksa koneksi internet dan coba lagi."
      );
    }
  }

  const inputClass =

    "mt-1.5 w-full min-w-0 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-base sm:text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100";

  const labelClass = "text-sm font-semibold text-gray-700";
  function getValidationProps(message: string) {
    return {
      onInvalid: (e: React.InvalidEvent<HTMLInputElement>) => {
        const input = e.currentTarget;
        input.setCustomValidity(

          input.validity.valueMissing

            ? message

            : input.validity.typeMismatch

              ? "Format yang dimasukkan tidak valid."

              : ""

        );

      },

      onInput: (e: React.FormEvent<HTMLInputElement>) => {

        e.currentTarget.setCustomValidity("");

      },

    };

  }

  // Next 16 (cacheComponents) melarang `new Date()` saat render
  // prerasimasi Client Component ("blocking-prerender-current-time-client"),
  // dan merekomendasikan memindahkannya ke useEffect.
  // Rule react-hooks/set-state-in-effect nonaktif di sini sesuai
  // panduan resmi Next untuk pola ini.
  const [currentYear, setCurrentYear] = useState<number | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentYear(new Date().getFullYear());
  }, []);


  return (

    <div className="flex min-h-dvh flex-col bg-[#FFFCF8]">

      {/* Header */}
      <header className="shrink-0 border-b border-orange-100 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-3 sm:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 font-bold text-white">
              K
            </div>
            <div>
              <p className="text-lg font-bold tracking-wide text-gray-900">
                KRAEPELIN
              </p>
              <p className="text-xs text-orange-600">
                Online Assessment
              </p>
            </div>
          </Link>
          <span className="text-xs font-semibold text-orange-600 sm:text-sm">
            Tahap 1 dari 3
          </span>
        </div>
      </header>

      {/* Main */}
      <main className="flex flex-1 items-center justify-center px-4 py-6 sm:py-10 sm:px-6 lg:px-8">
        <div className="w-full max-w-5xl">

          {/* Tombol kembali */}
          <Link
            href="/"
            className="mb-4 sm:mb-6 inline-flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-orange-100"
          >
            <ArrowLeft size={16} />
            Kembali ke Halaman Utama
          </Link>

          {/* Judul */}
          <div className="mb-6 flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
              <UserRound size={25} />
            </div>
            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-widest text-orange-600">
                Data Kandidat
              </p>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                Lengkapi Data Diri
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-gray-500">
                Isi informasi berikut sebelum melanjutkan ke petunjuk tes.
              </p>
            </div>
          </div>

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl sm:rounded-3xl border border-orange-100 bg-white p-5 sm:p-8 shadow-sm space-y-6"
          >
            <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                <UserRound size={19} />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-gray-900">
                  Informasi Pribadi
                </h2>
                <p className="text-xs text-gray-500">
                  Pastikan seluruh data sudah benar.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
              {/* Nama Lengkap */}
              <div className="sm:col-span-2 lg:col-span-2">
                <label htmlFor="nama" className={labelClass}>
                  Nama Lengkap <span className="text-red-500">*</span>
                </label>
                <input
                  id="nama"
                  name="nama"
                  type="text"
                  autoComplete="name"
                  placeholder="Masukkan nama lengkap"
                  value={form.nama}
                  onChange={handleChange}
                  {...getValidationProps(
                    "Nama lengkap wajib diisi."
                  )}
                  className={inputClass}
                  required
                />
              </div>

              {/* Tempat Lahir */}
              <div>
                <label htmlFor="tempatLahir" className={labelClass}>
                  Tempat Lahir <span className="text-red-500">*</span>
                </label>

                <div className="relative">
                  <MapPin
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    id="tempatLahir"
                    name="tempatLahir"
                    type="text"
                    placeholder="Contoh: Malang"
                    value={form.tempatLahir}
                    onChange={handleChange}
                    {...getValidationProps(
                      "Tempat lahir wajib diisi."
                    )}
                    className={`${inputClass} pl-9`}
                    required
                  />
                </div>
              </div>

              {/* Tanggal Lahir */}
              <div>
                <label htmlFor="tanggalLahir" className={labelClass}>
                  Tanggal Lahir <span className="text-red-500">*</span>
                </label>

                <div className="relative">
                  <CalendarDays
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    id="tanggalLahir"
                    name="tanggalLahir"
                    type="date"
                    autoComplete="bday"
                    value={form.tanggalLahir}
                    onChange={handleChange}
                    {...getValidationProps(
                      "Tanggal lahir wajib diisi."
                    )}
                    className={`${inputClass} pl-9`}
                    required
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className={labelClass}>
                  Alamat Email <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="nama@email.com"
                    value={form.email}
                    onChange={handleChange}
                    {...getValidationProps(
                      "Email wajib diisi."
                    )}
                    className={`${inputClass} pl-9`}
                    required
                  />
                </div>
              </div>

              {/* Nomor HP */}
              <div>
                <label htmlFor="nomorHP" className={labelClass}>
                  Nomor HP / WhatsApp{" "}
                  <span className="text-red-500">*</span>
                </label>

                <div className="relative">
                  <Phone
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    id="nomorHP"
                    name="nomorHP"
                    type="tel"
                    autoComplete="tel"
                    placeholder="08xxxxxxxxxx"
                    value={form.nomorHP}
                    onChange={handleChange}
                    {...getValidationProps(
                      "Nomor HP atau WhatsApp wajib diisi."
                    )}
                    className={`${inputClass} pl-9`}
                    required
                  />
                </div>
              </div>

              {/* Posisi yang Dilamar */}
              <div className="sm:col-span-2 lg:col-span-2">
                <label htmlFor="posisi" className={labelClass}>
                  Posisi yang Dilamar{" "}
                  <span className="text-red-500">*</span>
                </label>

                <div className="relative">
                  <BriefcaseBusiness
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    id="posisi"
                    name="posisi"
                    type="text"
                    placeholder="Contoh: Graphic Designer"
                    value={form.posisi}
                    onChange={handleChange}
                    {...getValidationProps(
                      "Posisi yang dilamar wajib diisi."
                    )}
                    className={`${inputClass} pl-9`}
                    required
                  />
                </div>

              </div>

              {/* Pendidikan Terakhir */}
              <div>
                <label htmlFor="jenjangPendidikan" className={labelClass}>
                  Pendidikan Terakhir <span className="text-red-500">*</span>
                </label>
                <select
                  id="jenjangPendidikan"
                  name="jenjangPendidikan"
                  value={form.jenjangPendidikan}
                  onChange={handleChange}
                  className={inputClass}
                  required
                >
                  <option value="">Pilih pendidikan terakhir</option>
                  <option value="SMA">SMA / Sederajat</option>
                  <option value="S1">D3/D4/S1</option>
                </select>
              </div>

              {/* Jurusan / Program Studi */}
              <div>
                <label htmlFor="jurusan" className={labelClass}>
                  Jurusan / Program Studi <span className="text-red-500">*</span>
                </label>
                <input
                  id="jurusan"
                  name="jurusan"
                  type="text"
                  placeholder="Contoh: Pendidikan Kimia"
                  value={form.jurusan}
                  onChange={handleChange}
                  className={inputClass}
                  required
                />
              </div>

              {/* Kelompok Pendidikan */}
              <div className="sm:col-span-2 lg:col-span-2">
                <label htmlFor="kelompokPendidikan" className={labelClass}>
                  Kelompok Pendidikan <span className="text-red-500">*</span>
                </label>
                <select
                  id="kelompokPendidikan"
                  name="kelompokPendidikan"
                  value={form.kelompokPendidikan}
                  onChange={handleChange}
                  className={inputClass}
                  required
                >
                  <option value="">Pilih kelompok pendidikan</option>
                  <option value="SAINTEK">Saintek — IPA / Sains dan Teknologi</option>
                  <option value="SOSHUM">Soshum — IPS / Sosial dan Humaniora</option>
                </select>
              </div>
            </div>

            {/* Pesan kesalahan */}
            {error && (
              <p
                role="alert"
                className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600"
              >
                {error}
              </p>
            )}

            {/* Footer Form */}
            <div className="mt-6 flex flex-col gap-3.5 border-t border-gray-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-md text-xs leading-5 text-gray-500">
                Periksa kembali data Anda sebelum melanjutkan ke petunjuk
                pengerjaan tes.
              </p>
              <button
                type="submit"
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-orange-500 px-6 py-3.5 text-sm font-bold text-white shadow-md shadow-orange-500/20 transition hover:bg-orange-600 focus:outline-none focus:ring-4 focus:ring-orange-200 active:scale-95"
              >
                Lanjut ke Petunjuk Tes
                <ArrowRight size={17} />
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="shrink-0 bg-orange-500 px-5 py-3 text-center text-xs text-orange-50">
        © {currentYear ?? ""} Kraepelin Online Assessment
      </footer>
    </div>
  );
}
