-- CreateTable
CREATE TABLE "History" (
    "id" SERIAL NOT NULL,
    "subject" TEXT NOT NULL,
    "originalEmail" TEXT NOT NULL,
    "reply" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "tone" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "History_pkey" PRIMARY KEY ("id")
);
