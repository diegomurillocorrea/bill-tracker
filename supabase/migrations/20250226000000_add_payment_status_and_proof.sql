-- Payment status and proof image support for /payments view.
-- After running this migration, create a Storage bucket in Supabase Dashboard:
--   1. Storage → New bucket → Name: payment-proofs
--   2. Set the bucket to Public so proof images can be viewed via getPublicUrl().

-- Payment status: 0 = Pendiente, 1 = Pagado
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS status smallint NOT NULL DEFAULT 0;

-- Proof image stored in Supabase Storage; only reference/path in table
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS proof_bucket text,
  ADD COLUMN IF NOT EXISTS proof_path text;

COMMENT ON COLUMN payments.status IS '0 = Pendiente, 1 = Pagado';
COMMENT ON COLUMN payments.proof_bucket IS 'Supabase Storage bucket name for payment proof image';
COMMENT ON COLUMN payments.proof_path IS 'Path within bucket for payment proof image';
