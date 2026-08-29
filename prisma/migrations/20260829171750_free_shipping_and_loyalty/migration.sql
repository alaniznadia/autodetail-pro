-- CreateEnum
CREATE TYPE "LoyaltyMovementKind" AS ENUM ('ACCRUAL', 'REDEMPTION', 'ADJUSTMENT');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "pointsRedeemed" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "StoreSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "freeShippingFrom" DECIMAL(10,2),
    "loyaltyEnabled" BOOLEAN NOT NULL DEFAULT false,
    "loyaltyArsPerPoint" INTEGER NOT NULL DEFAULT 1000,
    "loyaltyPointValue" DECIMAL(10,2) NOT NULL DEFAULT 35,
    "loyaltyMinRedeem" INTEGER NOT NULL DEFAULT 100,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoyaltyAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoyaltyAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoyaltyMovement" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "kind" "LoyaltyMovementKind" NOT NULL,
    "points" INTEGER NOT NULL,
    "orderId" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoyaltyMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyAccount_userId_key" ON "LoyaltyAccount"("userId");

-- CreateIndex
CREATE INDEX "LoyaltyMovement_accountId_idx" ON "LoyaltyMovement"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyMovement_orderId_kind_key" ON "LoyaltyMovement"("orderId", "kind");

-- AddForeignKey
ALTER TABLE "LoyaltyAccount" ADD CONSTRAINT "LoyaltyAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyMovement" ADD CONSTRAINT "LoyaltyMovement_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "LoyaltyAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
