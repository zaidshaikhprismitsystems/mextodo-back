/*
  Warnings:

  - You are about to drop the `_ordersTovendor_profiles` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_ordersTovendor_profiles" DROP CONSTRAINT "_ordersTovendor_profiles_A_fkey";

-- DropForeignKey
ALTER TABLE "_ordersTovendor_profiles" DROP CONSTRAINT "_ordersTovendor_profiles_B_fkey";

-- DropTable
DROP TABLE "_ordersTovendor_profiles";

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendor_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
