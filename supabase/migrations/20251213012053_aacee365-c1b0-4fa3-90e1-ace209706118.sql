-- Add category column to tutorials table
ALTER TABLE public.tutorials ADD COLUMN category text NOT NULL DEFAULT 'Umum';