-- AlterTable
ALTER TABLE "email_patterns" ADD COLUMN     "htmlSp" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "subjectSp" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "pages" ADD COLUMN     "contentSp" TEXT NOT NULL DEFAULT '',
ALTER COLUMN "content" SET DEFAULT '';

-- CreateTable
CREATE TABLE "VendorCoupon" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "discountType" "discountType" NOT NULL,
    "discountValue" DOUBLE PRECISION NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "usageLimit" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "vendorId" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,

    CONSTRAINT "VendorCoupon_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VendorCoupon_code_key" ON "VendorCoupon"("code");

-- AddForeignKey
ALTER TABLE "VendorCoupon" ADD CONSTRAINT "VendorCoupon_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendor_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorCoupon" ADD CONSTRAINT "VendorCoupon_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
