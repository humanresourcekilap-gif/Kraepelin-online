import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

// ==================================================
// KONFIGURASI ASSESSMENT
// Sumber tunggal untuk durasi tes dan sesi cookie.
// ==================================================

export const TOTAL_COLUMNS = 50;
export const ANSWERS_PER_COLUMN = 27;
export const COLUMN_DURATION_MS = 15_000;
export const TRANSITION_DURATION_MS = 1_000;

export const TOTAL_DURATION_MS =
  TOTAL_COLUMNS * COLUMN_DURATION_MS +
  (TOTAL_COLUMNS - 1) * TRANSITION_DURATION_MS;

/**
 * Grace period cookie setelah batas waktu tes.
 * Memberi window bagi client untuk mengirim submit
 * TIMEOUT setelah waktu habis (recovery), tanpa
 * memengaruhi validasi deadline di sisi server.
 */
export const COOKIE_GRACE_MS = 5 * 60 * 1000;

// ==================================================
// TANDA TANGAN COOKIE SESI
// Cookie: `${assessmentId}.${HMAC-SHA256(assessmentId)}`
// ==================================================

export function signSession(
  assessmentId: string,
  secret: string
): string {
  return createHmac("sha256", secret)
    .update(assessmentId)
    .digest("hex");
}

/**
 * Verifikasi cookie sesi assessment.
 *
 * Bila `expectedAssessmentId` diberikan, cookie hanya
 * valid jika ID di dalamnya sama. Mengembalikan
 * assessmentId dari cookie, atau null bila tidak sah.
 */
export function verifySessionCookie(
  cookie: string | undefined,
  expectedAssessmentId?: string
): string | null {
  const secret = process.env.ASSESSMENT_COOKIE_SECRET;

  if (!secret || !cookie) {
    return null;
  }

  const separatorIndex = cookie.lastIndexOf(".");

  if (separatorIndex === -1) {
    return null;
  }

  const assessmentId = cookie.slice(0, separatorIndex);
  const signature = cookie.slice(separatorIndex + 1);

  if (!assessmentId || !/^[0-9a-f]{64}$/i.test(signature)) {
    return null;
  }

  if (expectedAssessmentId && assessmentId !== expectedAssessmentId) {
    return null;
  }

  const expected = createHmac("sha256", secret)
    .update(assessmentId)
    .digest();

  const received = Buffer.from(signature, "hex");

  // Perbandingan waktu-konstan untuk mencegah timing attack.
  if (
    received.length !== expected.length ||
    !timingSafeEqual(received, expected)
  ) {
    return null;
  }

  return assessmentId;
}
