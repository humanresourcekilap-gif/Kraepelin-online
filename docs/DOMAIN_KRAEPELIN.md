# Domain Guide: Kraepelin Assessment (Tes Koran)

The Kraepelin test is a speeded psychodiagnostic assessment measuring mental processing speed, precision, cognitive fatigue, and emotional stability under time pressure across 50 columns.

---

## 1. Test Structure & Mechanics

| Parameter | Value | Description |
| :--- | :--- | :--- |
| **Total Columns ($N$)** | `50` | Columns numbered 1 to 50, processed from left to right. |
| **Numbers per Column** | `28` | Single-digit integers between 0 and 9 (top to bottom). |
| **Pairs per Column** | `27` | Each adjacent pair is summed vertically ($A + B$). |
| **Total Questions** | `1350` | $50 \times 27 = 1350$ possible answers. |
| **Column Duration** | `15,000 ms` (15s) | Time allocated to answer each column (configurable by admin). |
| **Transition Duration**| `1,000 ms` (1s) | Brief lock/transition before next column activates. |
| **Answer Rule** | `(A + B) % 10` | Only the last digit of the sum is entered (e.g., $7 + 8 = 15 \rightarrow 5$). |

---

## 2. Definisi Nilai Dasar & Sumber Data

Untuk setiap kolom $k \in [1, 50]$:
1. **Benar (`correct`)**: Jumlah jawaban benar dalam rentang $1 \dots \text{lastAnsweredPair}$.
2. **Salah (`error`)**: Jumlah jawaban salah dalam rentang $1 \dots \text{lastAnsweredPair}$.
3. **Terlewat / Skip (`skipped`)**: Slot kosong di antara pasangan 1 sampai posisi jawaban terakhir.
4. **Posisi Jawaban Terakhir (`lastAnsweredPair`)**: Indeks tertinggi ($1 \le p \le 27$) di mana kandidat menginput jawaban.
   $$\text{lastAnsweredPair} = \text{correct} + \text{error} + \text{skipped}$$

### Definisi Nilai Hasil Kerja ($Y$):
$$Y = \text{Benar} + \text{Salah}$$
Artinya, nilai $Y$ adalah **total seluruh jawaban yang terisi pada setiap kolom**, baik benar maupun salah.
- Skip **tidak dimasukkan** ke dalam $Y$.
- Setiap kolom memiliki satu nilai $Y$ bulat nonnegatif ($0 \le Y \le 27$).

---

## 3. Tabel 1 – Hasil Lembar Kerja ($X, X^2, Y, X.Y$)

Tabel 1 menyusun hasil pengerjaan 50 kolom secara berurutan:

| Kolom | Definisi | Rumus |
| :--- | :--- | :--- |
| **$X$** | Nomor urut kolom pengerjaan | $X = 1, 2, 3, \dots, 50$ |
| **$X^2$** | Kuadrat nomor kolom | $X^2 = X \times X$ |
| **$Y$** | Hasil kerja (total jawaban terisi) | $Y = \text{Benar} + \text{Salah}$ |
| **$X.Y$** | Perkalian nomor kolom dengan nilai $Y$ | $X.Y = X \times Y$ |

### Baris Jumlah (Sigma) Tabel 1:
- $\Sigma X = 1.275$ *(konstanta untuk 50 kolom)*
- $\Sigma X^2 = 42.925$ *(konstanta untuk 50 kolom)*
- $\Sigma Y = \sum_{k=1}^{50} Y_k$
- $\Sigma XY = \sum_{k=1}^{50} (X_k \cdot Y_k)$
- $\bar{X} = \frac{\Sigma X}{N} = \frac{1275}{50} = 25,5$
- $\bar{Y} = \frac{\Sigma Y}{N}$

---

## 4. Tabel 2 – Distribusi Frekuensi ($Y, f, f.y, d, f.d$)

Tabel 2 mengelompokkan nilai $Y$ unik dari Tabel 1, disusun menurun dari nilai tertinggi ke terendah:

| Kolom | Definisi | Rumus |
| :--- | :--- | :--- |
| **$Y$** | Nilai unik hasil kerja | Ditampilkan satu kali per skor, urut descending |
| **$f$** | Frekuensi kemunculan nilai $Y$ | Jumlah kolom yang menghasilkan skor $Y$ |
| **$f.y$** | Frekuensi dikalikan $Y$ | $f.y = f \times Y$ |
| **$d$** | Simpangan absolut terhadap mean | $d = \|Y - \text{Mean}\|$, di mana $\text{Mean} = \frac{\Sigma(f.y)}{50}$ |
| **$f.d$** | Frekuensi dikalikan simpangan | $f.d = f \times d$ |

### Baris Jumlah (Sigma) Tabel 2:
- $\Sigma Y$ = Penjumlahan nilai $Y$ unik pada baris tabel distribusi
- $\Sigma f = 50$ *(wajib tepat 50 kolom)*
- $\Sigma(f.y) = \Sigma Y \text{ Tabel 1}$
- $\Sigma d$ = Penjumlahan seluruh nilai $d$ pada setiap baris distribusi
- $\Sigma(f.d)$ = Penjumlahan seluruh hasil perkalian $f \times d$

---

## 5. Indikator Psikometrik Inti

### 1. PANKER (Kecepatan Kerja / Speed of Work)
Panker merupakan nilai rata-rata hasil kerja per kolom, dihitung dari dua tabel untuk verifikasi:
$$\text{Panker}_1 = \frac{\Sigma Y}{N} \quad (\text{Tabel 1})$$
$$\text{Panker}_2 = \frac{\Sigma(f \cdot y)}{N} \quad (\text{Tabel 2})$$
$$\text{Panker}_1 = \text{Panker}_2$$

### 2. TIANKER (Ketelitian Kerja / Accuracy & Carefulness)
TIANKER hanya menggunakan jumlah kesalahan (Error) dari seluruh 50 kolom:
$$\text{TIANKER} = \sum_{k=1}^{50} \text{Error}_k$$
- Skip **tidak dimasukkan** ke dalam perhitungan TIANKER.
- Nilai yang lebih rendah mencerminkan ketelitian yang lebih tinggi.

### 3. JANKER (Keajegan Kerja / Consistency & Emotional Stability)
Standar deviasi rata-rata dihitung langsung dari Tabel Distribusi Frekuensi:
$$\text{JANKER} = \frac{\Sigma(f \cdot d)}{N} = \frac{\Sigma(f \cdot d)}{50}$$
Tahapan perhitungan:
1. $\text{Mean} = \frac{\Sigma(f \cdot y)}{50}$
2. $d = \|Y - \text{Mean}\|$ (dibulatkan 4 desimal)
3. $f \cdot d = f \times d$ (dibulatkan 4 desimal)
4. $\Sigma(f \cdot d) = \sum (f \cdot d)$
5. $\text{JANKER} = \frac{\Sigma(f \cdot d)}{50}$ (dibulatkan 4 desimal)

### 4. HANKER (Ketahanan Kerja / Work Curve Slope & Fatigue Trend)
Menggunakan analisis regresi linear $Y = a + bX$:
$$b = \frac{N \cdot \Sigma XY - (\Sigma X \cdot \Sigma Y)}{N \cdot \Sigma X^2 - (\Sigma X)^2} = \frac{50 \cdot \Sigma XY - 1275 \cdot \Sigma Y}{520.625}$$
$$a = \bar{Y} - (b \times \bar{X}) = \bar{Y} - (b \times 25,5)$$
$$Y_{50} = a + (b \times 50)$$
$$Y_0 = a + (b \times 0) = a$$
$$\text{HANKER} = Y_{50} - Y_0 = 50 \times b$$
- Tanda positif/negatif koefisien regresi **dipertahankan** (tidak di-absolutkan).
- Nilai positif menunjukkan ketahanan prima dan adaptasi belajar (*learning curve*). Nilai negatif menunjukkan kelelahan dini atau penurunan motivasi.

---

## 6. Aturan Presisi dan Pembulatan (4 Desimal)

1. Semua hasil tahapan dan nilai antara dibulatkan konsisten ke **4 angka di belakang koma** (`round4`).
2. Data mentah (Benar, Salah, Skip, $X$, $X^2$, $X.Y$, $f$) adalah bilangan bulat dan tidak dibulatkan.
3. Fungsi pembulatan standar:
   $$\text{round4}(v) = \text{sign}(v) \cdot \frac{\text{round}(\|v\| \times 10^4)}{10^4}$$

---

## 7. Norma & Kategorisasi ([`src/lib/server/kraepelin-norma.ts`](file:///d:/kraepelin-online/src/lib/server/kraepelin-norma.ts))

Nilai mentah indikator dipetakan ke norma kelompok pendidikan:
- `SMA_IPA`: SMA Jurusan IPA / Saintek
- `SMA_IPS`: SMA Jurusan IPS / Soshum
- `S1_IPA`: S1 Bidang Saintek / Teknik
- `S1_IPS`: S1 Bidang Soshum / Ekonomi / Humaniora

### Kategori Norma:
1. `BAIK_SEKALI` (Very Good)
2. `BAIK` (Good)
3. `SEDANG` (Average / Moderate)
4. `KURANG` (Below Average)
5. `KURANG_SEKALI` (Poor)
