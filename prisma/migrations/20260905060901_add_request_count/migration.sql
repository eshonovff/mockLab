-- CreateTable
CREATE TABLE "RequestCount" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RequestCount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RequestCount_projectId_idx" ON "RequestCount"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "RequestCount_projectId_date_key" ON "RequestCount"("projectId", "date");

-- AddForeignKey
ALTER TABLE "RequestCount" ADD CONSTRAINT "RequestCount_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
