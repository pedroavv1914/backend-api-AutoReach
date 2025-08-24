/*
  Warnings:

  - A unique constraint covering the columns `[userId,provider,tenantId]` on the table `Account` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email,tenantId]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `tenantId` to the `Account` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Account` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `Post` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "User_email_key";

-- CreateTable (Create Tenant table first)
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subdomain" TEXT NOT NULL,
    "domain" TEXT,
    "linkedinAppId" TEXT,
    "linkedinAppSecret" TEXT,
    "instagramAppId" TEXT,
    "instagramAppSecret" TEXT,
    "planType" TEXT NOT NULL DEFAULT 'starter',
    "monthlyPostLimit" INTEGER NOT NULL DEFAULT 30,
    "dailyPostLimit" INTEGER NOT NULL DEFAULT 5,
    "settings" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- Create unique index for Tenant
CREATE UNIQUE INDEX "Tenant_subdomain_key" ON "Tenant"("subdomain");

-- Insert default tenant for existing data
INSERT INTO "Tenant" ("id", "name", "subdomain", "updatedAt") 
VALUES ('default-tenant-id', 'Default Tenant', 'default', CURRENT_TIMESTAMP);

-- AlterTable (Add tenantId columns with default value first)
ALTER TABLE "User" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'default-tenant-id';
ALTER TABLE "Account" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'default-tenant-id';
ALTER TABLE "Post" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'default-tenant-id';

-- AlterTable (Add other Account columns)
ALTER TABLE "Account" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "profileData" JSONB,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "username" TEXT;

-- Remove default values after data migration
ALTER TABLE "User" ALTER COLUMN "tenantId" DROP DEFAULT;
ALTER TABLE "Account" ALTER COLUMN "tenantId" DROP DEFAULT;
ALTER TABLE "Post" ALTER COLUMN "tenantId" DROP DEFAULT;
ALTER TABLE "Account" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX "Account_userId_provider_tenantId_key" ON "Account"("userId", "provider", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_tenantId_key" ON "User"("email", "tenantId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
