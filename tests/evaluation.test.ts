import { EmploymentType, EvaluationStatus, QuestionType } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  calculateScore,
  canAutosave,
  canManagerEvaluate,
  getDeadline,
  getDeadlineDays,
  getQuestionTypeByEmploymentType,
  getRemainingDays,
  isDeadlineExpired,
  isReadOnly,
  resolveFinalStatus,
  validateAnswerPayload,
} from "@/lib/evaluation";

describe("evaluation rules", () => {
  it("maps employment type to question type", () => {
    expect(getQuestionTypeByEmploymentType(EmploymentType.EFETIVO)).toBe(QuestionType.BASE_60);
    expect(getQuestionTypeByEmploymentType(EmploymentType.PROBATORIO)).toBe(QuestionType.BASE_50);
  });

  it("calculates capped scores", () => {
    expect(calculateScore(QuestionType.BASE_60, ["A", "A", "B"])).toBe(21);
    expect(calculateScore(QuestionType.BASE_50, ["A", "A", "A", "A", "A", "A"])).toBe(50);
    expect(calculateScore(QuestionType.BASE_60, ["Z"])).toBe(0);
  });

  it("defines deadline windows", () => {
    expect(getDeadlineDays("self")).toBe(15);
    expect(getDeadlineDays("manager")).toBe(17);
    expect(getDeadline(new Date("2026-04-01T12:00:00.000Z"), "self").toISOString()).toContain("2026-04-16");
  });

  it("tracks remaining time and expiration", () => {
    const deadline = new Date("2026-04-16T00:00:00.000Z");
    expect(getRemainingDays(deadline, new Date("2026-04-10T00:00:00.000Z"))).toBe(6);
    expect(isDeadlineExpired(deadline, new Date("2026-04-17T00:00:00.000Z"))).toBe(true);
  });

  it("blocks autosave when frozen", () => {
    const deadline = new Date("2026-04-16T00:00:00.000Z");
    expect(canAutosave(EvaluationStatus.DRAFT, deadline, new Date("2026-04-10T00:00:00.000Z"))).toBe(true);
    expect(canAutosave(EvaluationStatus.AUTO_DONE, deadline, new Date("2026-04-10T00:00:00.000Z"))).toBe(false);
    expect(canAutosave(EvaluationStatus.ARCHIVED, deadline, new Date("2026-04-10T00:00:00.000Z"))).toBe(false);
    expect(canAutosave(EvaluationStatus.DRAFT, deadline, new Date("2026-04-17T00:00:00.000Z"))).toBe(false);
  });

  it("respects manager unlock rules", () => {
    expect(canManagerEvaluate(EvaluationStatus.PENDING)).toBe(false);
    expect(canManagerEvaluate(EvaluationStatus.AUTO_DONE)).toBe(true);
    expect(canManagerEvaluate(EvaluationStatus.MANAGER_DONE)).toBe(false);
    expect(canManagerEvaluate(EvaluationStatus.PENDING)).toBe(false);
    expect(canManagerEvaluate(EvaluationStatus.DRAFT)).toBe(false);
    expect(canManagerEvaluate(EvaluationStatus.AUTO_DONE)).toBe(true);
    expect(canManagerEvaluate(EvaluationStatus.COMPLETED)).toBe(false);
    expect(canManagerEvaluate(EvaluationStatus.ARCHIVED)).toBe(false);
  });

  it("marks read only states per phase", () => {
    expect(isReadOnly(EvaluationStatus.AUTO_DONE, "self")).toBe(true);
    expect(isReadOnly(EvaluationStatus.MANAGER_DONE, "manager")).toBe(true);
    expect(isReadOnly(EvaluationStatus.DRAFT, "self")).toBe(false);
    expect(isReadOnly(EvaluationStatus.ARCHIVED, "manager")).toBe(true);
  });

  it("resolves final statuses", () => {
    expect(resolveFinalStatus(EvaluationStatus.MANAGER_DONE, "self")).toBe(EvaluationStatus.COMPLETED);
    expect(resolveFinalStatus(EvaluationStatus.PENDING, "self")).toBe(EvaluationStatus.AUTO_DONE);
    expect(resolveFinalStatus(EvaluationStatus.AUTO_DONE, "manager")).toBe(EvaluationStatus.COMPLETED);
    expect(resolveFinalStatus(EvaluationStatus.PENDING, "manager")).toBe(EvaluationStatus.MANAGER_DONE);
  });

  it("rejects answer payloads with options from another question", () => {
    const result = validateAnswerPayload(
      [
        {
          id: "q1",
          options: [
            { id: "o1", label: "A" },
            { id: "o2", label: "B" },
          ],
        },
        {
          id: "q2",
          options: [{ id: "o3", label: "A" }],
        },
      ],
      {
        q1: "o3",
        q2: "o3",
      },
      true,
    );

    expect(result).toEqual({
      ok: false,
      message: "Respostas inválidas para esta avaliação.",
    });
  });

  it("accepts partial draft payloads only with valid question-option pairs", () => {
    const result = validateAnswerPayload(
      [
        {
          id: "q1",
          options: [
            { id: "o1", label: "A" },
            { id: "o2", label: "B" },
          ],
        },
        {
          id: "q2",
          options: [{ id: "o3", label: "C" }],
        },
      ],
      {
        q1: "o2",
      },
      false,
    );

    expect(result).toEqual({
      ok: true,
      selectedLabels: ["B"],
    });
  });
});
