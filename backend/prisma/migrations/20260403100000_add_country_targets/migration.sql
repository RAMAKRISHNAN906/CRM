CREATE TABLE "CountryTarget" (
  "id"            TEXT NOT NULL,
  "country"       TEXT NOT NULL,
  "countryCode"   TEXT,
  "region"        TEXT,
  "targetRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "targetDeals"   INTEGER NOT NULL DEFAULT 0,
  "priority"      TEXT NOT NULL DEFAULT 'MEDIUM',
  "notes"         TEXT,
  "isActive"      BOOLEAN NOT NULL DEFAULT true,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CountryTarget_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CountryTarget_country_key" ON "CountryTarget"("country");
CREATE INDEX "CountryTarget_country_idx" ON "CountryTarget"("country");
CREATE INDEX "CountryTarget_isActive_idx" ON "CountryTarget"("isActive");
