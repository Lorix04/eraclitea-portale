DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'NotificationType' AND e.enumlabel = 'NEW_EDITION'
  ) THEN
    ALTER TYPE "NotificationType" ADD VALUE 'NEW_EDITION';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'NotificationType' AND e.enumlabel = 'DEADLINE_REMINDER_7D'
  ) THEN
    ALTER TYPE "NotificationType" ADD VALUE 'DEADLINE_REMINDER_7D';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'NotificationType' AND e.enumlabel = 'DEADLINE_REMINDER_2D'
  ) THEN
    ALTER TYPE "NotificationType" ADD VALUE 'DEADLINE_REMINDER_2D';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'NotificationType' AND e.enumlabel = 'CERTIFICATES_AVAILABLE'
  ) THEN
    ALTER TYPE "NotificationType" ADD VALUE 'CERTIFICATES_AVAILABLE';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'NotificationType' AND e.enumlabel = 'CERTIFICATE_EXPIRING_60D'
  ) THEN
    ALTER TYPE "NotificationType" ADD VALUE 'CERTIFICATE_EXPIRING_60D';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'NotificationType' AND e.enumlabel = 'CERTIFICATE_EXPIRING_30D'
  ) THEN
    ALTER TYPE "NotificationType" ADD VALUE 'CERTIFICATE_EXPIRING_30D';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'NotificationType' AND e.enumlabel = 'REGISTRY_RECEIVED'
  ) THEN
    ALTER TYPE "NotificationType" ADD VALUE 'REGISTRY_RECEIVED';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'NotificationType' AND e.enumlabel = 'EDITION_DATES_CHANGED'
  ) THEN
    ALTER TYPE "NotificationType" ADD VALUE 'EDITION_DATES_CHANGED';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'NotificationType' AND e.enumlabel = 'EDITION_CANCELLED'
  ) THEN
    ALTER TYPE "NotificationType" ADD VALUE 'EDITION_CANCELLED';
  END IF;
END
$$;
