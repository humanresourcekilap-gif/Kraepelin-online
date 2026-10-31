
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Keyboard,
  Send,
  HelpCircle,
  X,
  CheckCircle2,
} from "lucide-react";
import type { KeyboardEvent } from "react";
import {
  TOTAL_COLUMNS,
  NUMBERS_PER_COLUMN,
  ANSWERS_PER_COLUMN,
  getColumnNumbers,
} from "./data-soal";

const DEFAULT_COLUMN_DURATION_MS = 15_000;
const DEFAULT_TRANSITION_DURATION_MS = 1_000;

type AssessmentSession = {
  assessmentId: string;
  startedAt: string;
  deadlineAt: string;
  columnDurationMs?: number;
  transitionDurationMs?: number;
};

type AnswerPosition = {
  column: number;
  pair: number;
};

function answerKey(column: number, pair: number) {
  return `${column}-${pair}`;
}

function getFirstUnanswered(
  answers: Record<string, string>,
  column: number
): AnswerPosition | null {
  for (let pair = 0; pair < ANSWERS_PER_COLUMN; pair++) {
    if (!answers[answerKey(column, pair)]) {
      return { column, pair };
    }
  }

  return null;
}


export default function TesPage() {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [notice, setNotice] = useState("");
  const [session, setSession] = useState<AssessmentSession | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(
    null
  );
  const [elapsedMilliseconds, setElapsedMilliseconds] = useState(0);
  const [sessionError, setSessionError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const gridContainerRef = useRef<HTMLDivElement | null>(null);
  const columnRefs = useRef<(HTMLDivElement | null)[]>([]);
  const submittingRef = useRef(false);
  const answersRef = useRef<Record<string, string>>({});
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);
  const timeoutSubmitStartedRef = useRef(false);
  const savingCountRef = useRef(0);
  const sessionRef = useRef<AssessmentSession | null>(null);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const elapsedForColumns = Math.max(0, elapsedMilliseconds);

  const columnDuration = session?.columnDurationMs ?? DEFAULT_COLUMN_DURATION_MS;
  const transitionDuration = session?.transitionDurationMs ?? DEFAULT_TRANSITION_DURATION_MS;
  const columnCycleMs = columnDuration + transitionDuration;

  const currentColumn = Math.min(
    TOTAL_COLUMNS - 1,
    Math.floor(elapsedForColumns / columnCycleMs)
  );

  const positionInCycle = elapsedForColumns % columnCycleMs;

  const isTransitioning =
    currentColumn < TOTAL_COLUMNS - 1 &&
    positionInCycle >= columnDuration;

  const getActualColumn = useCallback(() => {
    const activeSession = sessionRef.current;

    if (!activeSession) return -1;

    const startedAt = Date.parse(activeSession.startedAt);
    const elapsed = Math.max(0, Date.now() - startedAt);

    const activeColDur = activeSession.columnDurationMs ?? DEFAULT_COLUMN_DURATION_MS;
    const activeTransDur = activeSession.transitionDurationMs ?? DEFAULT_TRANSITION_DURATION_MS;
    const cycle = activeColDur + activeTransDur;
    const column = Math.floor(elapsed / cycle);
    const position = elapsed % cycle;

    if (
      column < TOTAL_COLUMNS - 1 &&
      position >= activeColDur
    ) {
      return -1;
    }

    return Math.min(TOTAL_COLUMNS - 1, column);
  }, []);

  const activePosition = getFirstUnanswered(answers, currentColumn);
  const allColumnsCompleted =
    Object.keys(answers).filter((key) => answers[key] !== "").length >=
    TOTAL_COLUMNS * ANSWERS_PER_COLUMN;

  const answeredCount = Object.values(answers).filter(
    (value) => value !== ""
  ).length;

  const totalAnswers = TOTAL_COLUMNS * ANSWERS_PER_COLUMN;
  const currentColumnAnswered = Object.keys(answers).filter((key) => {
    const [column] = key.split("-").map(Number);
    return column === currentColumn && answers[key] !== "";
  }).length;

  const saveAnswer = useCallback(
    async (column: number, pair: number, value: string) => {
      if (!session || isFinished || submittingRef.current) return;

      savingCountRef.current += 1;
      setIsSaving(true);

      try {
        const response = await fetch("/api/assessment/answers", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assessmentId: session.assessmentId,
            columnNumber: column + 1,
            pairNumber: pair + 1,
            answerValue: value,
          }),
        });

        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
          setNotice(
            result.error ??
            "Jawaban belum berhasil disimpan. Periksa koneksi internet."
          );
        }
      } catch {
        setNotice(
          "Koneksi bermasalah. Jawaban mungkin belum tersimpan ke server."
        );
      } finally {
        savingCountRef.current = Math.max(0, savingCountRef.current - 1);
        setIsSaving(savingCountRef.current > 0);
      }
    },
    [session, isFinished]
  );

  const submitAssessment = useCallback(
    async (reason: "MANUAL" | "TIMEOUT") => {
      if (!session || submittingRef.current || isFinished) return;

      if (reason === "MANUAL") {
        if (answeredCount === 0) {
          setNotice(
            "Silakan isi minimal satu jawaban terlebih dahulu sebelum mengirim tes."
          );
          return;
        }

        const confirmSubmit = window.confirm(
          "Apakah Anda yakin ingin mengakhiri dan mengirimkan tes sekarang? Kolom dan jawaban yang belum selesai akan dihitung apa adanya sesuai aturan tes."
        );
        if (!confirmSubmit) {
          return;
        }
      }

      submittingRef.current = true;
      setIsSubmitting(true);
      setNotice(
        reason === "TIMEOUT"
          ? "Waktu habis. Sistem sedang mengakhiri tes..."
          : "Mengirim jawaban..."
      );

      // Cegah skenario F-01: gagal kirim bukan akhir dari
      // segalanya. Kesalahan jaringan/500 dicoba ulang
      // beberapa kali sebelum menyerahkan kontrol ke user.
      const maxAttempts = 3;
      const retryDelayMs = 1_500;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const response = await fetch("/api/assessment/submit", {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              assessmentId: session.assessmentId,
              reason,
              answers: answersRef.current,
            }),
          });

          const result = await response.json().catch(() => ({}));

          if (!response.ok || !result.success) {
            // Error protokol (400/401/409 ret.) tidak akan
            // berubah dengan dicoba ulang — berhenti segera.
            const protocolError = new Error(
              result.message ??
              result.error ??
              "Tes belum berhasil dikirim."
            ) as Error & { status?: number };
            protocolError.status = response.status;
            throw protocolError;
          }

          setIsFinished(true);
          sessionStorage.removeItem("kraepelin_assessment_session");
          router.push("/selesai");
          return;
        } catch (error) {
          const status = (error as { status?: number }).status;
          const isRetryable =
            attempt < maxAttempts && (status === undefined || status >= 500);

          if (!isRetryable) {
            submittingRef.current = false;
            setIsSubmitting(false);
            setNotice(
              error instanceof Error
                ? error.message
                : "Terjadi kesalahan saat mengirim tes. Periksa koneksi lalu coba lagi."
            );
            return;
          }

          await new Promise((resolve) =>
            window.setTimeout(resolve, retryDelayMs)
          );
        }
      }
    },
    [session, isFinished, answeredCount, router]
  );

  // Ambil sesi tes dan jawaban yang sudah tersimpan di server.
  // Validasi sesi melalui server menggunakan cookie HttpOnly.
  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      try {
        const response = await fetch("/api/assessment/session", {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.error ?? "Sesi tes tidak valid. Silakan kembali ke petunjuk tes."
          );
        }

        const parsed: AssessmentSession = {
          assessmentId: result.session.assessmentId,
          startedAt: result.session.startedAt,
          deadlineAt: result.session.deadlineAt,
          columnDurationMs: result.session.columnDurationMs,
          transitionDurationMs: result.session.transitionDurationMs,
        };

        if (
          !parsed.assessmentId ||
          !parsed.startedAt ||
          !parsed.deadlineAt ||
          Number.isNaN(Date.parse(parsed.startedAt)) ||
          Number.isNaN(Date.parse(parsed.deadlineAt))
        ) {
          throw new Error("Data sesi tes tidak valid.");
        }

        if (cancelled) return;

        sessionRef.current = parsed;
        setSession(parsed);
        setSessionError("");
      } catch (error) {
        if (cancelled) return;

        setSessionError(
          error instanceof Error
            ? error.message
            : "Gagal memeriksa sesi tes."
        );
      }
    }

    void loadSession();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!session) return;

    let cancelled = false;

    async function loadAnswers() {
      try {
        const response = await fetch(
          `/api/assessment/answers?assessmentId=${encodeURIComponent(session!.assessmentId)}`,
          { cache: "no-store" }
        );
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error ?? "Jawaban tersimpan gagal dimuat.");
        }

        if (cancelled) return;

        const restored: Record<string, string> = {};
        for (const item of result.answers ?? []) {
          const column = Number(item.columnNumber) - 1;
          const pair = Number(item.pairNumber) - 1;

          if (
            column >= 0 &&
            column < TOTAL_COLUMNS &&
            pair >= 0 &&
            pair < ANSWERS_PER_COLUMN &&
            /^[0-9]$/.test(String(item.answerValue))
          ) {
            restored[answerKey(column, pair)] = String(item.answerValue);
          }
        }

        setAnswers(restored);
      } catch (error) {
        if (!cancelled) {
          setNotice(
            error instanceof Error
              ? error.message
              : "Jawaban tersimpan gagal dimuat."
          );
        }
      }
    }

    void loadAnswers();

    return () => {
      cancelled = true;
    };
  }, [session]);

  // Jam utama dan perpindahan kolom dihitung dari waktu mulai server.
  useEffect(() => {
    if (!session) return;

    const updateClock = () => {
      const now = Date.now();
      const startedAt = Date.parse(session.startedAt);
      const deadlineAt = Date.parse(session.deadlineAt);
      const elapsed = Math.max(0, now - startedAt);
      const remaining = Math.max(
        0,
        Math.ceil((deadlineAt - now) / 1000)
      );

      setElapsedMilliseconds(elapsed);
      setRemainingSeconds(remaining);

      if (remaining <= 0 && !timeoutSubmitStartedRef.current) {
        timeoutSubmitStartedRef.current = true;
        void submitAssessment("TIMEOUT");
      }
    };

    updateClock();
    const intervalId = window.setInterval(updateClock, 50);

    return () => window.clearInterval(intervalId);
  }, [session, submitAssessment]);

  // Fokus otomatis ke jawaban kosong pertama pada kolom aktif.
  useEffect(() => {
    if (!activePosition || isFinished || isSubmitting) return;

    const frame = window.requestAnimationFrame(() => {
      inputRefs.current[
        answerKey(activePosition.column, activePosition.pair)
      ]?.focus();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [
    activePosition,
    currentColumn,
    isFinished,
    isSubmitting,
  ]);

  // Auto-scroll horizontal untuk memusatkan kolom aktif di layar HP
  useEffect(() => {
    const colEl = columnRefs.current[currentColumn];
    const container = gridContainerRef.current;
    if (colEl && container) {
      const containerWidth = container.clientWidth;
      const colLeft = colEl.offsetLeft;
      const colWidth = colEl.clientWidth;
      container.scrollTo({
        left: Math.max(0, colLeft - containerWidth / 2 + colWidth / 2),
        top: container.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [currentColumn]);

  // Auto-scroll vertikal untuk menjaga posisi input aktif tetap tampak jelas di layar
  useEffect(() => {
    if (!activePosition) return;
    const key = answerKey(activePosition.column, activePosition.pair);
    const inputEl = inputRefs.current[key];
    const container = gridContainerRef.current;
    if (inputEl && container) {
      const containerRect = container.getBoundingClientRect();
      const inputRect = inputEl.getBoundingClientRect();
      if (
        inputRect.top < containerRect.top + 50 ||
        inputRect.bottom > containerRect.bottom - 50
      ) {
        inputEl.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    }
  }, [activePosition]);

  function enterAnswer(column: number, pair: number, value: string) {
    if (
      !session ||
      isFinished ||
      isSubmitting ||
      remainingSeconds === 0 ||
      column !== getActualColumn() ||
      !activePosition ||
      pair !== activePosition.pair
    ) {
      return;
    }

    const digit = value.replace(/\D/g, "").slice(-1);
    if (!digit) return;

    const key = answerKey(column, pair);

    setAnswers((previous) => ({ ...previous, [key]: digit }));
    setNotice("");

    // Simpan segera ke server; tidak hanya mengandalkan state browser.
    void saveAnswer(column, pair, digit);
  }

  function handleKeyDown(
    event: KeyboardEvent<HTMLInputElement>,
    column: number,
    pair: number
  ) {
    if (
      column !== getActualColumn() ||
      !activePosition ||
      pair !== activePosition.pair ||
      isFinished ||
      isSubmitting
    ) {
      event.preventDefault();
      return;
    }

    if (/^\d$/.test(event.key)) {
      event.preventDefault();
      enterAnswer(column, pair, event.key);
      return;
    }

    if (
      [
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
        "Tab",
        "Backspace",
        "Delete",
      ].includes(event.key)
    ) {
      event.preventDefault();
    }
  }


  function handleVirtualKey(digit: number) {
    if (!activePosition) {
      setNotice("Semua pasangan pada kolom ini sudah terisi.");
      return;
    }

    enterAnswer(
      activePosition.column,
      activePosition.pair,
      String(digit)
    );
  }

  if (sessionError) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-white p-6 text-gray-900">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-bold">Sesi Tes Tidak Ditemukan</h1>
          <p className="mt-3 text-sm text-gray-600">{sessionError}</p>
          <Link
            href="/assessment"
            className="mt-5 inline-flex rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white"
          >
            Kembali ke Petunjuk Tes
          </Link>
        </div>
      </main>
    );
  }

  if (!session || remainingSeconds === null) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-white text-sm text-gray-600">
        Menyiapkan sesi tes...
      </main>
    );
  }

  if (remainingSeconds === 0 && !isFinished) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-white p-6 text-gray-700">
        <p className="text-sm">Waktu habis. Sistem sedang menyelesaikan tes...</p>
      </main>
    );
  }

  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-white text-gray-900 select-none">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-orange-100 bg-white px-3 sm:px-6 z-20">
        <Link href="/assessment" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500 font-bold text-white text-sm shadow-sm shadow-orange-500/20">
            K
          </div>
          <div>
            <p className="text-xs sm:text-sm font-bold tracking-wide text-slate-900 leading-none">
              KRAEPELIN
            </p>
            <p className="text-[9px] uppercase tracking-wider text-orange-600 font-semibold mt-0.5">
              Online
            </p>
          </div>
        </Link>

        {/* Kolom Badge & Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Kolom Badge */}
          <div className="flex items-center gap-1.5 rounded-full bg-orange-50 border border-orange-100 px-3 py-1 text-xs font-bold text-orange-800">
            <span>Kolom</span>
            <span className="text-orange-600 font-extrabold">{currentColumn + 1}</span>
            <span className="text-slate-400">/</span>
            <span className="text-slate-500">{TOTAL_COLUMNS}</span>
          </div>

          {/* Help button */}
          <button
            type="button"
            onClick={() => setShowHelp((prev) => !prev)}
            aria-label="Petunjuk Tes"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-orange-600 transition"
          >
            <HelpCircle size={18} />
          </button>
        </div>
      </header>

      {/* Work Area */}
      <section className="flex min-h-0 flex-1 overflow-hidden">
        {/* The 50-Columns Grid */}
        <div
          ref={gridContainerRef}
          className="h-full min-h-0 min-w-0 flex-1 overflow-auto overscroll-contain bg-white p-2 sm:p-4 touch-pan-x touch-pan-y"
        >
          <div className="flex w-max items-start gap-1 sm:gap-1.5 px-4 py-2">
            {Array.from({ length: TOTAL_COLUMNS }, (_, column) => {
              const numbers = [...getColumnNumbers(column)].reverse();
              const isCurrentColumn = column === currentColumn;

              return (
                <div
                  key={column}
                  ref={(el) => {
                    columnRefs.current[column] = el;
                  }}
                  className={`flex w-[40px] sm:w-[42px] shrink-0 flex-col overflow-hidden rounded-lg border transition-all ${
                    isCurrentColumn
                      ? "border-orange-500 ring-2 ring-orange-400/30 shadow-md bg-orange-50/20"
                      : "border-slate-200 opacity-60 sm:opacity-90"
                  }`}
                >
                  {/* Nomor Kolom Header */}
                  <div
                    className={`flex h-5 items-center justify-center border-b text-[10px] font-bold ${
                      isCurrentColumn
                        ? "bg-orange-500 text-white border-orange-600"
                        : "bg-slate-100 text-slate-500 border-slate-200"
                    }`}
                  >
                    {column + 1}
                  </div>

                  {numbers.map((number, row) => {
                    const isAnswer = row < NUMBERS_PER_COLUMN - 1;
                    const pair = NUMBERS_PER_COLUMN - 2 - row;
                    const key = answerKey(column, pair);
                    const answer = answers[key] ?? "";
                    const isActive =
                      !isFinished &&
                      !isSubmitting &&
                      column === currentColumn &&
                      activePosition?.pair === pair;

                    const isLocked = column !== currentColumn;

                    return (
                      <div key={`${column}-${row}`}>
                        <div
                          className={`flex h-[23px] items-center justify-center border-b border-gray-200 text-[15px] font-semibold leading-none ${
                            isCurrentColumn ? "bg-orange-50/80 text-slate-900" : "bg-white text-slate-600"
                          }`}
                        >
                          {number}
                        </div>

                        {isAnswer && (
                          <div
                            className={`relative flex h-[18px] w-full items-center justify-center ${
                              isActive ? "bg-amber-100 ring-1 ring-inset ring-amber-400" : "bg-transparent"
                            }`}
                          >
                            {answer && (
                              <span className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center text-[13px] font-extrabold leading-none text-orange-600">
                                {answer}
                              </span>
                            )}
                            <input
                              ref={(element) => {
                                inputRefs.current[key] = element;
                              }}
                              id={key}
                              type="text"
                              inputMode="none"
                              autoComplete="off"
                              maxLength={1}
                              aria-label={`Jawaban kolom ${column + 1}, pasangan ${pair + 1}`}
                              value={answer}
                              disabled={!isActive || isLocked}
                              onFocus={() => {
                                if (!isActive && activePosition) {
                                  inputRefs.current[
                                    answerKey(
                                      activePosition.column,
                                      activePosition.pair
                                    )
                                  ]?.focus();
                                }
                              }}
                              onChange={(event) =>
                                enterAnswer(column, pair, event.target.value)
                              }
                              onKeyDown={(event) =>
                                handleKeyDown(event, column, pair)
                              }
                              className="absolute inset-0 z-20 h-full w-full cursor-text border-0 bg-transparent p-0 text-transparent outline-none ring-0 focus:outline-none focus:ring-0"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Desktop Sidebar Controls (Hidden on mobile) */}
        <aside className="hidden md:flex w-[210px] shrink-0 flex-col gap-3 overflow-y-auto border-l border-slate-200 p-4 bg-slate-50/50">
          <div className="shrink-0 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
            <p className="text-xs font-bold text-slate-800">Kontrol Tes</p>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
              Kerjakan dari bawah ke atas. Kolom akan berganti secara otomatis.
            </p>
          </div>

          <div className="shrink-0 rounded-xl border border-orange-100 bg-orange-50/50 p-3">
            <button
              type="button"
              onClick={() => setShowKeyboard((previous) => !previous)}
              className="flex w-full items-center justify-between gap-1 text-left text-xs font-bold text-orange-700"
            >
              <span className="flex items-center gap-1.5">
                <Keyboard size={15} />
                Numpad Layar
              </span>
              <span>{showKeyboard ? "−" : "+"}</span>
            </button>

            {showKeyboard && (
              <div className="mt-3 grid grid-cols-3 gap-1.5">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    disabled={!activePosition || isSubmitting || isFinished || isTransitioning}
                    onClick={() => handleVirtualKey(digit)}
                    className={`h-9 rounded-lg border border-gray-200 bg-white font-semibold text-gray-800 hover:bg-orange-100 active:scale-95 disabled:opacity-40 transition ${
                      digit === 0 ? "col-start-2" : ""
                    }`}
                  >
                    {digit}
                  </button>
                ))}
              </div>
            )}
          </div>


          <button
            type="button"
            disabled={isSubmitting || isFinished}
            onClick={() => void submitAssessment("MANUAL")}
            className="flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-orange-500 px-2 py-2.5 text-xs font-bold text-white hover:bg-orange-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 shadow-sm shadow-orange-500/20 transition"
          >
            <Send size={14} />
            {isSubmitting ? "Mengirim..." : "Kirim Jawaban"}
          </button>

          <div className="mt-auto shrink-0 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <p className="text-[11px] font-semibold text-slate-500">Statistik Jawaban</p>
            <p className="mt-1 text-xl font-extrabold text-orange-600">
              {answeredCount}
              <span className="ml-1 text-xs font-medium text-slate-400">
                / {totalAnswers}
              </span>
            </p>
            <p className="mt-1 text-xs text-slate-600">
              Kolom ini: <strong>{currentColumnAnswered}/{ANSWERS_PER_COLUMN}</strong>
            </p>
            {allColumnsCompleted && (
              <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-green-700">
                <CheckCircle2 size={13} /> Semua jawaban terisi
              </p>
            )}
          </div>
        </aside>
      </section>

      {/* Mobile Bottom Fixed Numpad (Shown on mobile devices) */}
      <div className="md:hidden shrink-0 border-t border-slate-200 bg-white/95 backdrop-blur-md px-3 py-2 pb-safe shadow-2xl z-30">
        {/* Status Bar above Numpad */}
        <div className="flex items-center justify-between mb-1.5 px-1 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span>
              Kolom ini: <strong className="text-orange-600 font-bold">{currentColumnAnswered}/27</strong>
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-500">
              Total: <strong className="text-slate-800">{answeredCount}</strong>
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                isSaving ? "bg-amber-400 animate-pulse" : "bg-green-500"
              }`}
            />
            <span className="text-[11px] text-slate-500">
              {isSaving ? "Menyimpan" : "Tersimpan"}
            </span>
          </div>
        </div>

        {/* Touch-Friendly Numpad (4x3 Grid) */}
        <div className="grid grid-cols-3 gap-1.5 max-w-sm mx-auto">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
            <button
              key={digit}
              type="button"
              disabled={!activePosition || isSubmitting || isFinished || isTransitioning}
              onClick={() => handleVirtualKey(digit)}
              className="flex h-11 items-center justify-center rounded-xl bg-slate-50 border border-slate-200/80 text-xl font-bold text-slate-800 shadow-sm active:scale-95 active:bg-orange-100 hover:bg-orange-50/50 disabled:opacity-40 touch-manipulation select-none transition"
            >
              {digit}
            </button>
          ))}
          {/* Row 4: 0, Selesai/Kirim */}
          <button
            type="button"
            disabled={!activePosition || isSubmitting || isFinished || isTransitioning}
            onClick={() => handleVirtualKey(0)}
            className="col-span-2 flex h-11 items-center justify-center rounded-xl bg-slate-50 border border-slate-200/80 text-xl font-bold text-slate-800 shadow-sm active:scale-95 active:bg-orange-100 hover:bg-orange-50/50 disabled:opacity-40 touch-manipulation select-none transition"
          >
            0
          </button>

          <button
            type="button"
            disabled={isSubmitting || isFinished}
            onClick={() => void submitAssessment("MANUAL")}
            className="flex h-11 items-center justify-center rounded-xl bg-orange-500 text-xs font-bold text-white shadow-sm shadow-orange-500/20 active:scale-95 active:bg-orange-600 disabled:opacity-40 touch-manipulation select-none transition"
          >
            {isSubmitting ? "Kirim..." : "Kirim"}
          </button>
        </div>
      </div>

      {/* Desktop Footer */}
      <footer className="hidden md:flex h-[40px] shrink-0 items-center justify-between bg-orange-500 px-4 text-xs text-white sm:px-6">
        <span>Kraepelin Online Assessment</span>
        <span>{isSaving ? "Menyimpan jawaban..." : "Autosave aktif"}</span>
      </footer>

      {/* Petunjuk Singkat Modal */}
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">Petunjuk Singkat Kraepelin</h3>
              <button
                type="button"
                onClick={() => setShowHelp(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-2 text-xs leading-relaxed text-slate-600">
              <p>• <strong>Arah Pengerjaan:</strong> Jumlahkan dua angka berdekatan dari <strong>bawah ke atas</strong>.</p>
              <p>• <strong>Digit Satuan:</strong> Jika hasil penjumlahan 2 digit (misal 7 + 8 = 15), masukkan hanya angka satuannya (<strong>5</strong>).</p>
              <p>• <strong>Pindah Otomatis:</strong> Kolom akan berganti secara otomatis sesuai batas waktu.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowHelp(false)}
              className="w-full rounded-xl bg-orange-500 py-2.5 text-xs font-bold text-white hover:bg-orange-600 transition"
            >
              Lanjutkan Pengerjaan
            </button>
          </div>
        </div>
      )}

      {notice && (
        <div
          role="status"
          className="fixed bottom-24 md:bottom-14 left-1/2 z-50 w-[min(90%,420px)] -translate-x-1/2 rounded-xl border border-orange-200 bg-white px-4 py-3 text-xs sm:text-sm shadow-xl"
        >
          <div className="flex items-start justify-between gap-3">
            <p className="font-medium text-slate-800">{notice}</p>
            <button
              type="button"
              onClick={() => setNotice("")}
              aria-label="Tutup pesan"
              className="text-slate-400 hover:text-slate-700"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {isTransitioning && !isFinished && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none bg-slate-900/10 backdrop-blur-[1px]">
          <div className="flex h-[120px] w-[260px] flex-col items-center justify-center rounded-2xl border border-gray-100 bg-white shadow-2xl">
            <p className="text-3xl font-black tracking-[0.25em] text-orange-500 animate-pulse">
              PINDAH
            </p>
            <p className="mt-2 text-xs font-semibold text-slate-500">
              Bersiap ke kolom berikutnya
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
