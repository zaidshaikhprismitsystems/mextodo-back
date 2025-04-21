-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "orderStatus" ADD VALUE 'returned';
ALTER TYPE "orderStatus" ADD VALUE 'processing';
ALTER TYPE "orderStatus" ADD VALUE 'shipped';
ALTER TYPE "orderStatus" ADD VALUE 'out_for_delivery';
ALTER TYPE "orderStatus" ADD VALUE 'delivered';
ALTER TYPE "orderStatus" ADD VALUE 'refund_requested';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "paymentStatus" ADD VALUE 'processing';
ALTER TYPE "paymentStatus" ADD VALUE 'paid';
ALTER TYPE "paymentStatus" ADD VALUE 'partially_refunded';
ALTER TYPE "paymentStatus" ADD VALUE 'disputed';

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "carrier" TEXT,
ADD COLUMN     "label" TEXT,
ADD COLUMN     "service" TEXT,
ADD COLUMN     "shipmentId" INTEGER,
ADD COLUMN     "totalShipingPrice" DOUBLE PRECISION,
ADD COLUMN     "trackUrl" TEXT;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "digitalProduct" TEXT,
ADD COLUMN     "digitalProductType" TEXT;
