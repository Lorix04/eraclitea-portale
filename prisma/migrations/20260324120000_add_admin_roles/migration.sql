-- CreateTable
CREATE TABLE "AdminRole" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "permissions" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminRole_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminRole_name_key" ON "AdminRole"("name");

-- AlterTable
ALTER TABLE "User" ADD COLUMN "adminRoleId" TEXT;

-- CreateIndex
CREATE INDEX "User_adminRoleId_idx" ON "User"("adminRoleId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_adminRoleId_fkey" FOREIGN KEY ("adminRoleId") REFERENCES "AdminRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed: Insert default admin roles
INSERT INTO "AdminRole" ("id", "name", "description", "isSystem", "isDefault", "permissions", "createdAt", "updatedAt")
VALUES
  ('role_super_admin', 'Super Admin', 'Accesso completo a tutte le funzionalità', true, true,
   '{"dashboard":["view"],"corsi":["view","create","edit","delete"],"edizioni":["view","create","edit","delete","duplicate"],"area-corsi":["view","create","edit","delete"],"clienti":["view","create","edit","delete","impersonate","reset-password"],"dipendenti":["view","create","edit","delete","import"],"docenti":["view","create","edit","delete","invite","impersonate","suspend"],"attestati":["view","create","edit","delete","upload"],"presenze":["view","edit"],"materiali":["view","create","edit","delete","approve"],"ticket":["view","reply","close"],"notifiche":["view","send"],"export":["view","export"],"audit":["view"],"smtp":["view","edit","retry"],"status":["view"],"ruoli":["view","create","edit","delete","assign"],"guida":["view"]}',
   NOW(), NOW()),

  ('role_segreteria', 'Segreteria', 'Gestione corsi, clienti e comunicazioni', false, false,
   '{"dashboard":["view"],"corsi":["view","create","edit"],"edizioni":["view","create","edit","duplicate"],"area-corsi":["view"],"clienti":["view","edit"],"dipendenti":["view","create","edit"],"docenti":["view","edit","invite"],"attestati":["view","upload"],"presenze":["view","edit"],"materiali":["view","create","edit"],"ticket":["view","reply"],"notifiche":["view"],"export":["view","export"],"guida":["view"]}',
   NOW(), NOW()),

  ('role_solo_lettura', 'Solo Lettura', 'Visualizzazione senza modifiche', false, false,
   '{"dashboard":["view"],"corsi":["view"],"edizioni":["view"],"area-corsi":["view"],"clienti":["view"],"dipendenti":["view"],"docenti":["view"],"attestati":["view"],"presenze":["view"],"materiali":["view"],"ticket":["view"],"notifiche":["view"],"export":["view"],"guida":["view"]}',
   NOW(), NOW()),

  ('role_formazione', 'Gestione Formazione', 'Gestione corsi, edizioni e docenti', false, false,
   '{"dashboard":["view"],"corsi":["view","create","edit","delete"],"edizioni":["view","create","edit","delete","duplicate"],"area-corsi":["view","create","edit","delete"],"docenti":["view","edit","invite"],"attestati":["view","upload"],"presenze":["view","edit"],"materiali":["view","create","edit","delete","approve"],"guida":["view"]}',
   NOW(), NOW());

-- Assign Super Admin role to all existing ADMIN users
UPDATE "User" SET "adminRoleId" = 'role_super_admin' WHERE "role" = 'ADMIN';
