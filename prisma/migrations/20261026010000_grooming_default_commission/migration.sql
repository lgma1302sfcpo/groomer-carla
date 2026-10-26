-- Apply the agreed 30% service commission to existing professionals.
-- Appointment commission amounts remain unchanged to preserve their history.
ALTER TABLE "grooming_professionals"
    ALTER COLUMN "commissionPercent" SET DEFAULT 30;

UPDATE "grooming_professionals"
SET "commissionPercent" = 30, "updatedAt" = CURRENT_TIMESTAMP
WHERE "commissionPercent" <> 30;
