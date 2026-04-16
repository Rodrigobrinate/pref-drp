import { QuestionType } from "@prisma/client";
const { QUESTION_BANK_DATA } = require("./question-bank-data");

export const QUESTION_BANK = {
  [QuestionType.BASE_60]: QUESTION_BANK_DATA.BASE_60,
  [QuestionType.BASE_50]: QUESTION_BANK_DATA.BASE_50,
} as const;

export function getDefaultOptions(type: QuestionType) {
  const scores =
    type === QuestionType.BASE_50 ? [10, 8, 6, 3, 1] : [7.5, 6, 4, 2.25, 0.75];
  const labels = ["A", "B", "C", "D", "E"];

  return labels.map((label, index) => ({
    label,
    score: scores[index],
  }));
}
