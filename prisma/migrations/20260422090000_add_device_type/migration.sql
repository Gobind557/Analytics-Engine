ALTER TABLE "events"
ADD COLUMN "device_type" TEXT NOT NULL DEFAULT 'desktop';

UPDATE "events"
SET "device_type" = CASE
    WHEN LOWER("device") SIMILAR TO '%(mobile|android|iphone|ipad|tablet)%' THEN 'mobile'
    ELSE 'desktop'
  END;

CREATE INDEX "idx_events_app_id_user_id_device_type" ON "events"("app_id", "user_id", "device_type");
