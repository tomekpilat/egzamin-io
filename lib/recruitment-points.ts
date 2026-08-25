export const MAX_EXAM_POINTS = 100;
export const MAX_CERTIFICATE_POINTS = 100;
export const MAX_RECRUITMENT_POINTS = 200;
export const MAX_ACHIEVEMENT_POINTS = 18;

export const GRADE_POINTS = {
  2: 2,
  3: 8,
  4: 14,
  5: 17,
  6: 18,
} as const;

export type RecruitmentGrade = keyof typeof GRADE_POINTS;

export type RecruitmentPointsInput = {
  polishExamPercent: number;
  mathematicsExamPercent: number;
  foreignLanguageExamPercent: number;
  grades: [RecruitmentGrade, RecruitmentGrade, RecruitmentGrade, RecruitmentGrade];
  honorsCertificate: boolean;
  volunteering: boolean;
  achievementPoints: number;
};

export type RecruitmentPointsResult = {
  exam: {
    polish: number;
    mathematics: number;
    foreignLanguage: number;
    total: number;
    remainingPotential: number;
  };
  certificate: {
    grades: number;
    honors: number;
    volunteering: number;
    achievements: number;
    total: number;
  };
  total: number;
};

function clamp(value: number, minimum: number, maximum: number) {
  if (!Number.isFinite(value)) return minimum;
  return Math.min(maximum, Math.max(minimum, value));
}

function roundPoints(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function pointsForGrade(grade: RecruitmentGrade) {
  return GRADE_POINTS[grade];
}

export function calculateRecruitmentPoints(input: RecruitmentPointsInput): RecruitmentPointsResult {
  const polish = roundPoints(clamp(input.polishExamPercent, 0, 100) * 0.35);
  const mathematics = roundPoints(clamp(input.mathematicsExamPercent, 0, 100) * 0.35);
  const foreignLanguage = roundPoints(clamp(input.foreignLanguageExamPercent, 0, 100) * 0.3);
  const examTotal = roundPoints(polish + mathematics + foreignLanguage);

  const gradePoints = input.grades.reduce<number>((total, grade) => total + pointsForGrade(grade), 0);
  const honors = input.honorsCertificate ? 7 : 0;
  const volunteering = input.volunteering ? 3 : 0;
  const achievements = roundPoints(clamp(input.achievementPoints, 0, MAX_ACHIEVEMENT_POINTS));
  const certificateTotal = roundPoints(Math.min(MAX_CERTIFICATE_POINTS, gradePoints + honors + volunteering + achievements));

  return {
    exam: {
      polish,
      mathematics,
      foreignLanguage,
      total: examTotal,
      remainingPotential: roundPoints(MAX_EXAM_POINTS - examTotal),
    },
    certificate: {
      grades: gradePoints,
      honors,
      volunteering,
      achievements,
      total: certificateTotal,
    },
    total: roundPoints(examTotal + certificateTotal),
  };
}

export function compareWithThreshold(total: number, threshold: number | null) {
  if (threshold === null || !Number.isFinite(threshold)) return null;

  const normalizedThreshold = roundPoints(clamp(threshold, 0, MAX_RECRUITMENT_POINTS));
  const difference = roundPoints(total - normalizedThreshold);

  return {
    threshold: normalizedThreshold,
    reached: difference >= 0,
    difference: Math.abs(difference),
  };
}
