
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  Calculator,
  CheckCircle2,
  Clock3,
  ListChecks,
  RotateCcw,
  ShieldCheck,
  XCircle,
  Keyboard as KeyboardIcon,
  Delete,
  Eye,
  EyeOff,
} from "lucide-react";

const PRACTICE_COLUMNS = [
  [4, 7, 2, 8, 6, 3],
  [6, 5, 8, 4, 7, 2],
  [3, 9, 1, 6, 4, 8],
  [8, 2, 5, 7, 4, 6],
  [5, 3, 6, 9, 1, 7],
];

const ANSWERS_PER_COLUMN = 5;
const TOTAL_ANSWERS =
  PRACTICE_COLUMNS.length * ANSWERS_PER_COLUMN;

function getCorrectAnswer(a: number, b: number) {
  return String((a + b) % 10);
}

export default function AssessmentPage() {
  const router = useRouter();
  const [answers, setAnswers] = useState<string[]>(
    Array(TOTAL_ANSWERS).fill("")
  );
  const [checked, setChecked] = useState(false);
  const [showKeyboard, setShowKeyboard] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState("");

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);


  async function startAssessment() {
    if (isStarting) return;

    setIsStarting(true);
    setStartError("");

    try {
      // 1. Periksa sesi yang tersimpan di browser.
      const savedSession = sessionStorage.getItem(
        "kraepelin_assessment_session"
      );

      if (savedSession) {
        try {
          const session = JSON.parse(savedSession);

          if (
            session.assessmentId &&
            session.startedAt &&
            session.deadlineAt &&
            Date.now() < Date.parse(session.deadlineAt)
          ) {
            // Jangan hanya mengandalkan sessionStorage.
            // Validasi sesi ke server menggunakan cookie HttpOnly.
            const verifyResponse = await fetch("/api/assessment/session", {
              method: "GET",
              credentials: "same-origin",
              cache: "no-store",
            });

            const verifyResult = await verifyResponse.json();

            if (
              verifyResponse.ok &&
              verifyResult.success &&
              verifyResult.session?.assessmentId ===
              session.assessmentId
            ) {
              router.push("/tes");
              return;
            }
          }

          // Sesi lokal tidak valid atau tidak cocok dengan server.
          sessionStorage.removeItem(
            "kraepelin_assessment_session"
          );
        } catch {
          sessionStorage.removeItem(
            "kraepelin_assessment_session"
          );
        }
      }

      // 2. Ambil data kandidat.
      const savedCandidate = sessionStorage.getItem(
        "kraepelin_candidate_data"
      );

      if (!savedCandidate) {
        setStartError(
          "Data kandidat tidak ditemukan. Silakan isi data diri kembali."
        );
        return;
      }

      const candidateData = JSON.parse(savedCandidate);

      if (
        typeof candidateData.candidateId !== "string" ||
        !candidateData.candidateId
      ) {
        setStartError(
          "ID kandidat tidak ditemukan. Silakan isi data diri kembali."
        );
        return;
      }

      // 3. Coba validasi sesi yang mungkin masih aktif di server.
      // Jika cookie valid, lanjutkan sesi tanpa membuat sesi baru.
      const existingSessionResponse = await fetch(
        "/api/assessment/session",
        {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
        }
      );

      const existingSessionResult =
        await existingSessionResponse.json();

      if (
        existingSessionResponse.ok &&
        existingSessionResult.success &&
        existingSessionResult.session?.assessmentId
      ) {
        const session = existingSessionResult.session;

        sessionStorage.setItem(
          "kraepelin_assessment_session",
          JSON.stringify({
            assessmentId: session.assessmentId,
            startedAt: session.startedAt,
            deadlineAt: session.deadlineAt,
            columnDurationMs: session.columnDurationMs,
            transitionDurationMs: session.transitionDurationMs,
          })
        );

        router.push("/tes");
        return;
      }

      // 4. Jika belum memiliki cookie sesi valid,
      // minta server membuat sesi baru.
      const response = await fetch("/api/assessment/start", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          candidateId: candidateData.candidateId,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setStartError(
          result.message ||
          "Gagal memulai tes. Silakan coba kembali."
        );
        return;
      }

      // 5. Simpan metadata sesi untuk pemulihan UI.
      sessionStorage.setItem(
        "kraepelin_assessment_session",
        JSON.stringify({
          assessmentId: result.assessmentId,
          startedAt: result.startedAt,
          deadlineAt: result.deadlineAt,
          columnDurationMs: result.columnDurationMs,
          transitionDurationMs: result.transitionDurationMs,
        })
      );

      // 6. Masuk ke halaman tes.
      router.push("/tes");
    } catch (error) {
      console.error("Gagal memulai assessment:", error);

      setStartError(
        "Tidak dapat terhubung ke server. Silakan coba kembali."
      );
    } finally {
      setIsStarting(false);
    }
  }

  // Urutan jawaban: dari bawah ke atas, lalu ke kolom berikutnya.
  const currentIndex = answers.findIndex((answer) => answer === "");

  function focusAnswer(index: number) {
    requestAnimationFrame(() => {
      inputRefs.current[index]?.focus();
    });
  }

  function enterDigit(digit: string) {
    if (currentIndex === -1 || checked) return;

    setAnswers((previous) =>
      previous.map((answer, index) =>
        index === currentIndex ? digit : answer
      )
    );

    setChecked(false);

    if (currentIndex < TOTAL_ANSWERS - 1) {
      focusAnswer(currentIndex + 1);
    } else {
      inputRefs.current[currentIndex]?.blur();
    }
  }

  function handleInputChange(index: number, rawValue: string) {
    if (index !== currentIndex || checked) return;

    const value = rawValue.replace(/\D/g, "").slice(-1);
    if (value === "") return;

    enterDigit(value);
  }

  function handleKeyDown(
    event: KeyboardEvent<HTMLInputElement>,
    index: number
  ) {
    if (event.key === "Tab") {
      event.preventDefault();
      return;
    }

    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      return;
    }

    if (
      event.key === "Backspace" &&
      index === currentIndex &&
      answers[index] === "" &&
      index > 0
    ) {
      event.preventDefault();

      const previousIndex = index - 1;

      setAnswers((previous) =>
        previous.map((answer, i) =>
          i === previousIndex ? "" : answer
        )
      );

      focusAnswer(previousIndex);
    }
  }

  function resetPractice() {
    setAnswers(Array(TOTAL_ANSWERS).fill(""));
    setChecked(false);
    focusAnswer(0);
  }

  function checkAnswer() {
    if (currentIndex !== -1) {
      focusAnswer(currentIndex);
      return;
    }

    setChecked(true);
  }

  function getAnswerAt(columnIndex: number, answerIndex: number) {
    const numbers = PRACTICE_COLUMNS[columnIndex];
    const lowerNumber = numbers[numbers.length - 1 - answerIndex];
    const upperNumber = numbers[numbers.length - 2 - answerIndex];

    return getCorrectAnswer(lowerNumber, upperNumber);
  }

  const correctCount = answers.reduce((total, answer, index) => {
    const columnIndex = Math.floor(index / ANSWERS_PER_COLUMN);
    const answerIndex = index % ANSWERS_PER_COLUMN;

    return total +
      (answer === getAnswerAt(columnIndex, answerIndex) ? 1 : 0);
  }, 0);

  return (
    <main className="flex min-h-dvh flex-col bg-white">
      {/* Header */}
      <header className="shrink-0 border-b border-orange-100 bg-white">
        <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between gap-3 px-4 py-3 sm:px-8 sm:py-4 lg:px-10">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500 text-xl font-bold text-white shadow-md shadow-orange-500/20">
              K
            </div>

            <div>
              <p className="text-lg font-bold text-slate-900 leading-none">
                Kraepelin<span className="text-orange-500">.</span>
              </p>
              <p className="text-[10px] font-semibold tracking-[0.2em] text-slate-500 uppercase mt-1">
                ONLINE ASSESSMENT
              </p>
            </div>
          </Link>

          <span className="shrink-0 rounded-full bg-orange-50 px-3.5 py-1.5 text-xs font-semibold text-orange-700 sm:text-sm">
            Petunjuk Tes
          </span>
        </div>
      </header>

      {/* Main Content */}
      <section className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col bg-white px-4 py-5 sm:px-8 sm:py-8 lg:px-10 lg:py-6">
        <Link
          href="/"
          className="mb-4 sm:mb-6 inline-flex min-h-9 w-fit items-center gap-2 rounded-xl bg-white border border-slate-200 px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <ArrowLeft size={16} />
          Kembali ke halaman utama
        </Link>

        {/* Page Title */}
        <div className="mb-6 text-center">
          <p className="mb-1 text-xs font-semibold tracking-[0.18em] text-orange-600">
            KRAEPELIN ONLINE
          </p>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Petunjuk Pengerjaan Tes
          </h1>

          <p className="mx-auto mt-1 max-w-2xl text-xs sm:text-sm text-slate-600">
            Pelajari ketentuan dan selesaikan latihan sebelum memulai tes.
          </p>
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-2 lg:gap-8">
          {/* Left Column */}
          <div className="space-y-4 sm:space-y-5">
            {/* Test Information */}
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <ListChecks size={19} className="mb-2 text-orange-500" />
                <p className="text-xs text-slate-500">Jumlah Kolom</p>
                <p className="text-lg font-bold text-slate-900">50</p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <Clock3 size={19} className="mb-2 text-orange-500" />
                <p className="text-xs text-slate-500">Durasi</p>
                <p className="text-lg font-bold text-slate-900">13 m 19 d</p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <Calculator size={19} className="mb-2 text-orange-500" />
                <p className="text-xs text-slate-500">Jenis Tes</p>
                <p className="text-lg font-bold text-slate-900">Numerik</p>
              </div>
            </div>

            {/* Instructions */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                  <BookOpenCheck size={21} />
                </div>

                <div>
                  <h2 className="font-bold text-slate-900">
                    Ketentuan Pengerjaan
                  </h2>
                  <p className="text-xs text-slate-500">
                    Pahami ketentuan sebelum memulai.
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <div className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-xs font-bold text-orange-700">
                    1
                  </span>

                  <div>
                    <h3 className="text-sm font-semibold text-slate-800">
                      Kerjakan dari Bawah
                    </h3>
                    <p className="mt-1 text-sm leading-5 text-slate-600">
                      Mulai dari dua angka paling bawah, lalu bergerak
                      ke pasangan angka di atasnya.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-xs font-bold text-orange-700">
                    2
                  </span>

                  <div>
                    <h3 className="text-sm font-semibold text-slate-800">
                      Masukkan Digit Satuan
                    </h3>
                    <p className="mt-1 text-sm leading-5 text-slate-600">
                      Contoh: 8 + 6 = 14, maka jawaban yang ditulis adalah 4.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-xs font-bold text-orange-700">
                    3
                  </span>

                  <div>
                    <h3 className="text-sm font-semibold text-slate-800">
                      Perhatikan Waktu
                    </h3>
                    <p className="mt-1 text-sm leading-5 text-slate-600">
                      Tes utama terdiri dari 50 kolom dengan durasi
                      13 menit 19 detik.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Reminder */}
            <div className="flex items-start gap-3 rounded-xl border border-orange-100 bg-orange-50 p-3">
              <ShieldCheck size={19} className="mt-0.5 shrink-0 text-orange-700" />
              <p className="text-sm leading-5 text-slate-700">
                Pada latihan ini, jawaban harus diisi berurutan.
                Anda tidak dapat melompati posisi jawaban.
              </p>
            </div>
          </div>

          {/* Right Column: Practice */}
          <div className="min-w-0">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                  <Calculator size={20} />
                </div>

                <div className="min-w-0 flex-1">
                  <h2 className="font-bold text-slate-900">
                    Simulasi Pengerjaan
                  </h2>
                  <p className="text-xs text-slate-500">
                    5 kolom · mulai dari bawah
                  </p>
                </div>

                <span className="rounded-full bg-orange-100 px-2 py-1 text-xs font-semibold text-orange-700">
                  Latihan
                </span>
              </div>

              <div className="p-3 sm:p-4">
                <p className="mb-3 text-xs leading-5 text-slate-600">
                  Isi kotak paling bawah terlebih dahulu. Setelah terisi,
                  sistem akan mengaktifkan jawaban berikutnya.
                </p>

                {/* Vertical Columns */}
                <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                  {PRACTICE_COLUMNS.map((numbers, columnIndex) => (
                    <div
                      key={columnIndex}
                      className="min-w-0 rounded-lg border border-slate-200 bg-white p-1 sm:p-1.5"
                    >
                      <p className="mb-1 text-center text-[10px] font-semibold text-orange-400">
                        {columnIndex + 1}
                      </p>

                      {numbers.map((number, rowIndex) => {
                        const hasAnswerBelow = rowIndex < numbers.length - 1;

                        const answerIndex =
                          columnIndex * ANSWERS_PER_COLUMN +
                          (numbers.length - 2 - rowIndex);

                        const correctAnswer = hasAnswerBelow
                          ? getCorrectAnswer(number, numbers[rowIndex + 1])
                          : "";

                        const isCorrect =
                          answers[answerIndex] === correctAnswer;

                        return (
                          <div
                            key={`${columnIndex}-${rowIndex}`}
                            className="flex flex-col items-center"
                          >
                            <div className="flex h-5 w-full items-center justify-center text-base font-semibold text-slate-800 sm:h-5 sm:text-base">
                              {number}
                            </div>

                            {hasAnswerBelow && (
                              <input
                                ref={(element) => {
                                  inputRefs.current[answerIndex] = element;
                                }}
                                aria-label={`Kolom ${columnIndex + 1}, posisi jawaban ${numbers.length - 1 - rowIndex}`}
                                type="text"
                                inputMode="numeric"
                                autoComplete="off"
                                maxLength={1}
                                value={answers[answerIndex]}
                                disabled={answerIndex !== currentIndex || checked}
                                onChange={(event) =>
                                  handleInputChange(
                                    answerIndex,
                                    event.target.value
                                  )
                                }
                                onKeyDown={(event) =>
                                  handleKeyDown(event, answerIndex)
                                }
                                onFocus={(event) => {
                                  if (
                                    answerIndex !== currentIndex ||
                                    checked
                                  ) {
                                    event.currentTarget.blur();

                                    if (currentIndex !== -1 && !checked) {
                                      focusAnswer(currentIndex);
                                    }
                                  }
                                }}
                                className={`h-5 w-full rounded border text-center text-sm font-semibold outline-none transition sm:h-6 ${checked
                                  ? isCorrect
                                    ? "border-green-300 bg-green-50 text-green-700"
                                    : "border-red-300 bg-red-50 text-red-700"
                                  : answerIndex === currentIndex
                                    ? "border-orange-500 bg-orange-50 ring-2 ring-orange-100"
                                    : "border-slate-200 bg-slate-50 text-slate-600"
                                  } disabled:cursor-not-allowed`}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>

                {/* Keyboard Toggle */}
                <div className="mt-3 flex items-center justify-between gap-2">
                  <p className="text-xs text-slate-500">
                    {answers.filter(Boolean).length}/{TOTAL_ANSWERS} jawaban
                  </p>

                  <button
                    type="button"
                    onClick={() => setShowKeyboard((value) => !value)}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-orange-500 bg-orange-500 px-2.5 text-xs font-medium text-white transition hover:bg-orange-600"
                    aria-expanded={showKeyboard}
                  >
                    <KeyboardIcon size={14} />
                    Keyboard
                    {showKeyboard ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>

                {/* Internal Numeric Keyboard */}
                {showKeyboard && (
                  <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs font-semibold text-slate-700">
                        Keyboard Numerik
                      </p>

                      <p className="text-[10px] text-slate-500">
                        {currentIndex === -1
                          ? "Semua terisi"
                          : `Jawaban ${currentIndex + 1} dari ${TOTAL_ANSWERS}`}
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5">
                      {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map(
                        (digit) => (
                          <button
                            key={digit}
                            type="button"
                            disabled={currentIndex === -1 || checked}
                            onClick={() => enterDigit(digit)}
                            className="h-10 sm:h-9 rounded-lg border border-slate-200 bg-white text-base font-semibold text-slate-800 transition hover:border-orange-300 hover:bg-orange-50 active:bg-orange-100 active:scale-95 touch-manipulation select-none disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {digit}
                          </button>
                        )
                      )}

                      <button
                        type="button"
                        disabled={currentIndex === -1 || checked}
                        onClick={() => {
                          if (currentIndex === -1 || checked) return;

                          setAnswers((previous) =>
                            previous.map((answer, index) =>
                              index === currentIndex ? "" : answer
                            )
                          );

                          focusAnswer(currentIndex);
                        }}
                        className="flex h-10 sm:h-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-orange-200 hover:bg-orange-50 active:scale-95 touch-manipulation select-none disabled:opacity-40 transition"
                        aria-label="Hapus jawaban saat ini"
                      >
                        <Delete size={17} />
                      </button>

                      <button
                        type="button"
                        disabled={currentIndex === -1 || checked}
                        onClick={() => enterDigit("0")}
                        className="h-10 sm:h-9 rounded-lg border border-orange-100 bg-white text-base font-semibold text-slate-800 hover:border-orange-300 hover:bg-orange-50 active:bg-orange-100 active:scale-95 touch-manipulation select-none disabled:opacity-40 transition"
                      >
                        0
                      </button>

                      <button
                        type="button"
                        disabled={currentIndex === -1 || checked}
                        onClick={() => {
                          if (currentIndex > 0 && !checked) {
                            setAnswers((previous) =>
                              previous.map((answer, index) =>
                                index === currentIndex - 1 ? "" : answer
                              )
                            );

                            focusAnswer(currentIndex - 1);
                          }
                        }}
                        className="flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-orange-200 hover:bg-orange-50 disabled:opacity-40"
                        aria-label="Kembali ke jawaban sebelumnya"
                        title="Kembali satu langkah"
                      >
                        <ArrowLeft size={16} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Practice Actions */}
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={checkAnswer}
                    disabled={currentIndex !== -1 || checked}
                    className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-orange-500 px-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <CheckCircle2 size={16} />
                    Periksa Jawaban
                  </button>

                  <button
                    type="button"
                    onClick={resetPractice}
                    aria-label="Ulangi latihan"
                    title="Ulangi latihan"
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-orange-200 bg-white text-orange-600 transition hover:bg-orange-50"
                  >
                    <RotateCcw size={16} />
                  </button>
                </div>

                {checked && (
                  <div
                    aria-live="polite"
                    className="mt-3 rounded-xl border border-orange-200 bg-[#FFF7ED] p-3"
                  >
                    <div className="flex items-center gap-2">
                      {correctCount === TOTAL_ANSWERS ? (
                        <CheckCircle2 size={17} className="text-green-600" />
                      ) : (
                        <XCircle size={17} className="text-orange-600" />
                      )}

                      <p className="text-sm font-semibold text-slate-800">
                        Hasil latihan
                      </p>
                    </div>

                    <p className="mt-1 text-xs text-slate-600">
                      {correctCount} dari {TOTAL_ANSWERS} jawaban benar.
                    </p>
                  </div>
                )}

                <div className="mt-3 flex items-start gap-2 border-t border-slate-100 pt-3">
                  <ShieldCheck
                    size={15}
                    className="mt-0.5 shrink-0 text-orange-400"
                  />
                  <p className="text-[10px] leading-4 text-slate-500">
                    Latihan ini tidak memengaruhi hasil assessment.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>


        {/* Pesan kesalahan */}
        {startError && (
          <p
            role="alert"
            className="mt-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600"
          >
            {startError}
          </p>
        )}

        {/* Bottom Actions */}
        <div className="mt-8 mb-4 flex flex-col-reverse gap-3.5 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:bg-slate-50"
          >
            <ArrowLeft size={16} />
            Kembali
          </Link>

          <button
            type="button"
            onClick={startAssessment}
            disabled={isStarting}
            title="Mulai pengerjaan tes"
            className="inline-flex min-h-12 items-center justify-center gap-3 rounded-xl bg-orange-500 px-7 py-3 text-base font-bold text-white shadow-lg shadow-orange-500/25 transition hover:bg-orange-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isStarting ? "Menyiapkan Tes..." : "Mulai Assessment"}
            <ArrowRight size={17} />
          </button>
        </div>
      </section>


      {/* Footer */}
      <footer className="shrink-0 border-t border-orange-600 bg-orange-500">
        <div className="mx-auto max-w-[1440px] px-5 py-2.5 text-center text-xs font-medium text-white">
          Kraepelin Online
          <span className="mx-2 text-orange-200">·</span>
          Online Assessment Platform
        </div>
      </footer>
    </main>
  );
}
