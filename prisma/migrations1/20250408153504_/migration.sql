-- CreateEnum
CREATE TYPE "categoryStatus" AS ENUM ('enabled', 'disabled');

-- CreateEnum
CREATE TYPE "attributeStatus" AS ENUM ('enabled', 'disabled');

-- AlterTable
ALTER TABLE "attributes" ADD COLUMN     "status" "attributeStatus" NOT NULL DEFAULT 'enabled';

-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "status" "categoryStatus" NOT NULL DEFAULT 'enabled';

-- AlterTable
ALTER TABLE "tickets" ADD COLUMN     "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "relatedId" INTEGER,
ADD COLUMN     "relatedType" TEXT;

-- CreateTable
CREATE TABLE "visitor" (
    "id" SERIAL NOT NULL,
    "ip" TEXT NOT NULL,
    "city" TEXT,
    "region" TEXT,
    "country" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "userAgent" TEXT,
    "referrer" TEXT,
    "page" TEXT,
    "device" TEXT,
    "browser" TEXT,
    "os" TEXT,
    "visitCount" INTEGER NOT NULL DEFAULT 1,
    "lastVisit" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "visitor_pkey" PRIMARY KEY ("id")
);
