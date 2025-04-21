-- CreateEnum
CREATE TYPE "pageStatus" AS ENUM ('published', 'draft', 'archived');

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "whatsappNumber" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "pages" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metaTitle" TEXT DEFAULT '',
    "metaDescription" TEXT DEFAULT '',
    "status" "pageStatus" NOT NULL DEFAULT 'published',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pages_slug_key" ON "pages"("slug");
