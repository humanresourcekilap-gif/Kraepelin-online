# Domain Guide: Kraepelin Assessment (Tes Koran)

The Kraepelin test is a speeded psychodiagnostic test measuring mental speed, concentration, cognitive fatigue, accuracy, and emotional stability under time pressure.

---

## 1. Test Structure & Mechanics

| Parameter | Value | Description |
| :--- | :--- | :--- |
| **Total Columns ($N$)** | `50` | Columns numbered 1 to 50, processed from left to right. |
| **Numbers per Column** | `28` | Single-digit integers between 0 and 9 (top to bottom). |
| **Pairs per Column** | `27` | Each adjacent pair is summed vertically ($A + B$). |
| **Total Questions** | `1350` | $50 \times 27 = 1350$ possible answers. |
| **Column Duration** | `15,000 ms` (15s) | Time allocated to answer each column. |
| **Transition Duration**| `1,000 ms` (1s) | Brief lock/transition before next column activates. |
| **Total Test Duration**| `~800,000 ms` | $\approx 13$ minutes and 20 seconds. |
| **Answer Rule** | `(A + B) % 10` | Only the last digit of the sum is entered (e.g., $7 + 8 = 15 \rightarrow 5$). |

---

## 2. Calculation Rules & Definitions

### A. Column-Level Metrics ([`src/lib/server/kraepelin-scoring.ts`](file:///d:/kraepelin-online/src/lib/server/kraepelin-scoring.ts))
For each column $k \in [1, 50]$:
1. **Posisi Jawaban Terakhir (`lastAnsweredPair`)**: The highest index ($1 \le p \le 27$) where the candidate submitted an answer. Pairs above this index are untouched and ignored.
2. **Benar ($Y$ / `correct`)**: Number of correct answers in pairs $1 \dots \text{lastAnsweredPair}$.
3. **Salah (`error`)**: Number of incorrect answers in pairs $1 \dots \text{lastAnsweredPair}$.
4. **Kosong / Terlewat (`skipped`)**: Empty slots between pair 1 and `lastAnsweredPair`.
   $$\text{lastAnsweredPair} = \text{correct} + \text{error} + \text{skipped}$$

---

### B. Core Psychometric Indicators ([`src/lib/server/kraepelin.ts`](file:///d:/kraepelin-online/src/lib/server/kraepelin.ts))

#### 1. PANKER (Kecepatan Kerja / Speed of Work)
Average number of correct answers per column across all 50 columns:
$$\text{PANKER} = \frac{\sum_{k=1}^{50} Y_k}{50}$$
*Higher values indicate greater mental processing speed.*

#### 2. TIANKER (Ketelitian Kerja / Accuracy & Carefulness)
Total number of errors across all 50 columns:
$$\text{TIANKER} = \sum_{k=1}^{50} \text{error}_k$$
*Lower values indicate higher precision, thoroughness, and lower impulsivity.*

#### 3. JANKER (Kestabilan Kerja / Consistency & Emotional Stability)
Mean absolute deviation of correct answers around the mean speed:
$$\bar{Y} = \text{PANKER}$$
$$\text{JANKER} = \frac{\sum_{k=1}^{50} |Y_k - \bar{Y}|}{50}$$
*Lower values indicate high emotional control, steady pacing, and rhythm stability.*

#### 4. HANKER (Ketahanan Kerja / Work Curve Slope & Fatigue Trend)
Linear regression slope of correct answers over column sequence (from Column 1 to Column 50):
$$\text{HANKER} = X_{50} - X_0 = 50 \cdot b$$
Where:
- $b = \frac{N \sum (k \cdot Y_k) - (\sum k)(\sum Y_k)}{N \sum k^2 - (\sum k)^2}$
- $N = 50$, $\sum k = 1275$, $\sum k^2 = 42925$.
*A positive slope indicates endurance, learning capability, and resilience against mental fatigue; a negative slope indicates early exhaustion or flagging motivation.*

---

## 3. Norms & Categorization ([`src/lib/server/kraepelin-norma.ts`](file:///d:/kraepelin-online/src/lib/server/kraepelin-norma.ts))

Performance raw scores are mapped against educational cohorts:
- `SMA_IPA`: High School (Science track)
- `SMA_IPS`: High School (Social track)
- `S1_IPA`: Bachelor's Degree (Science/Tech/Engineering track)
- `S1_IPS`: Bachelor's Degree (Social/Humanities/Business track)

### Classification Categories:
1. `BAIK_SEKALI` (Very Good)
2. `BAIK` (Good)
3. `SEDANG` (Average / Moderate)
4. `KURANG` (Below Average)
5. `KURANG_SEKALI` (Poor)

Each candidate's result record in Supabase stores both the raw indicator figures and the normalized ratings.

