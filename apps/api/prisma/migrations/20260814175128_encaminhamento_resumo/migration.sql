/*
  Warnings:

  - Added the required column `referenciaResumo` to the `encaminhamento` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "encaminhamento" ADD COLUMN     "referenciaResumo" TEXT NOT NULL;
