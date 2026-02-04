-- AlterTable
ALTER TABLE "Bot" ADD COLUMN     "igUserId" TEXT,
ADD COLUMN     "igUsername" TEXT;

-- AlterTable
ALTER TABLE "Contact" ADD COLUMN     "platform" TEXT NOT NULL DEFAULT 'facebook';
