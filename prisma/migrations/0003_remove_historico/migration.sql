-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "versaoAnterior" TEXT;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "BookingHistory";
PRAGMA foreign_keys=on;

