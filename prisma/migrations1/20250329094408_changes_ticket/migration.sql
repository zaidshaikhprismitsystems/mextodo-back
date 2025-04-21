/*
  Warnings:

  - Added the required column `category` to the `tickets` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ticketPriority" AS ENUM ('low', 'medium', 'high');

-- AlterTable
ALTER TABLE "tickets" ADD COLUMN     "assignedTo" INTEGER,
ADD COLUMN     "category" "ticketCategory" NOT NULL,
ADD COLUMN     "priority" "ticketPriority" NOT NULL DEFAULT 'medium';

-- CreateTable
CREATE TABLE "reply" (
    "id" SERIAL NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "replyText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reply_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reply" ADD CONSTRAINT "reply_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reply" ADD CONSTRAINT "reply_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
