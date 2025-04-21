-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "billingAddressId" INTEGER,
ADD COLUMN     "shippingAddressId" INTEGER;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_billingAddressId_fkey" FOREIGN KEY ("billingAddressId") REFERENCES "addresses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_shippingAddressId_fkey" FOREIGN KEY ("shippingAddressId") REFERENCES "addresses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
