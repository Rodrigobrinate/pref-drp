-- CreateIndex
CREATE INDEX "Document_evaluationId_createdAt_idx" ON "Document"("evaluationId", "createdAt");

-- CreateIndex
CREATE INDEX "Evaluation_cycleId_evaluatedId_current_idx" ON "Evaluation"("cycleId", "evaluatedId", "current");

-- CreateIndex
CREATE INDEX "Evaluation_cycleId_current_status_idx" ON "Evaluation"("cycleId", "current", "status");

-- CreateIndex
CREATE INDEX "Option_questionId_sortOrder_idx" ON "Option"("questionId", "sortOrder");

-- CreateIndex
CREATE INDEX "Question_cycleId_type_sortOrder_idx" ON "Question"("cycleId", "type", "sortOrder");

-- CreateIndex
CREATE INDEX "UserCycle_cycleId_managerId_role_idx" ON "UserCycle"("cycleId", "managerId", "role");
