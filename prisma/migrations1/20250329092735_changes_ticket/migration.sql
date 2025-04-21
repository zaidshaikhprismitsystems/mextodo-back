-- CreateEnum
CREATE TYPE "ticketCategory" AS ENUM ('orderIssues', 'paymentIssues', 'productIssues', 'shippingIssues', 'returnsRefunds', 'accountIssues', 'technicalSupport', 'generalInquiry', 'vendorSupport');

-- AlterEnum
ALTER TYPE "ticketStatus" ADD VALUE 'pending';
