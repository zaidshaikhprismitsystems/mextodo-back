-- AlterTable
ALTER TABLE "addresses" ADD COLUMN     "district" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.0;

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "paymentMethod" TEXT DEFAULT '';

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "boxQuantity" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "content" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "packType" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "transactionId" TEXT DEFAULT '';

-- AlterTable
ALTER TABLE "vendor_profiles" ADD COLUMN     "district" TEXT NOT NULL DEFAULT '';
