-- Make Employee name/surname/CF nullable for clients with custom field configurations
ALTER TABLE "Employee" ALTER COLUMN "nome" DROP NOT NULL;
ALTER TABLE "Employee" ALTER COLUMN "cognome" DROP NOT NULL;
ALTER TABLE "Employee" ALTER COLUMN "codiceFiscale" DROP NOT NULL;
