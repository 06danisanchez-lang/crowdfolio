-- Enum para motivo de cierre de inversión
CREATE TYPE close_reason_type AS ENUM ('on_time', 'early', 'extended', 'sold');

-- Campos nuevos en investments
ALTER TABLE investments
  ADD COLUMN actual_end_date DATE,
  ADD COLUMN close_reason close_reason_type,
  ADD COLUMN was_extended BOOLEAN NOT NULL DEFAULT FALSE;
