-- Allow proof_bucket and proof_path to be NULL when proof is removed
ALTER TABLE payments
  ALTER COLUMN proof_bucket DROP NOT NULL,
  ALTER COLUMN proof_path DROP NOT NULL;
