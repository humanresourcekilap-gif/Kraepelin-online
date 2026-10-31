-- Migrasi untuk Pengaturan Timer Tes dan Admin Dashboard
-- Jalankan skrip ini pada SQL Editor di Supabase Dashboard

-- 1. Tabel pengaturan_tes
CREATE TABLE IF NOT EXISTS public.pengaturan_tes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_pengaturan TEXT NOT NULL DEFAULT 'Standar Kraepelin',
    durasi_kolom_detik INTEGER NOT NULL DEFAULT 15,
    durasi_transisi_detik INTEGER NOT NULL DEFAULT 1,
    total_kolom INTEGER NOT NULL DEFAULT 50,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Masukkan default setting jika belum ada
INSERT INTO public.pengaturan_tes (nama_pengaturan, durasi_kolom_detik, durasi_transisi_detik, total_kolom, is_active)
SELECT 'Standar Kraepelin', 15, 1, 50, true
WHERE NOT EXISTS (SELECT 1 FROM public.pengaturan_tes WHERE is_active = true);

-- 2. Tambahkan kolom snapshot durasi pada sesi_assessment jika belum ada
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'sesi_assessment' 
          AND column_name = 'durasi_kolom_detik'
    ) THEN
        ALTER TABLE public.sesi_assessment ADD COLUMN durasi_kolom_detik INTEGER DEFAULT 15;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'sesi_assessment' 
          AND column_name = 'durasi_transisi_detik'
    ) THEN
        ALTER TABLE public.sesi_assessment ADD COLUMN durasi_transisi_detik INTEGER DEFAULT 1;
    END IF;
END $$;

