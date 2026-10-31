
import "server-only";

import {
    calculateKraepelin,
    type KraepelinColumnInput,
} from "./kraepelin";

import {
    normPanker,
    normTianker,
    normJankerAverageDeviation,
    normHanker,
    type EducationGroup,
} from "./kraepelin-norma";

import type { RekapScoring } from "./kraepelin-scoring";

export function hitungHasilKraepelin(
    rekap: RekapScoring,
    educationGroup: EducationGroup
) {
    if (rekap.perKolom.length !== 50) {
        throw new Error("Rekap harus terdiri dari 50 kolom.");
    }

    const dataKolom: KraepelinColumnInput[] = rekap.perKolom.map(
        (kolom) => ({
            column: kolom.column + 1,
            correct: kolom.benar,
            error: kolom.salah,
            lastAnsweredPair: kolom.posisiJawabanTerakhir,
            skipped: kolom.skipDiperhitungkan,
        })
    );

    const indikator = calculateKraepelin(dataKolom);

    const norma = {
        panker: normPanker(
            indikator.panker.value,
            educationGroup
        ),

        tianker: normTianker(
            indikator.tianker.value,
            educationGroup
        ),

        jankerAverageDeviation: normJankerAverageDeviation(
            indikator.janker.meanAbsoluteDeviation,
            educationGroup
        ),

        hanker: normHanker(
            indikator.hanker.value,
            educationGroup
        ),
    };

    return {
        rekap,
        indikator,
        norma,
    };
}
