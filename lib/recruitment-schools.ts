export type RecruitmentThresholdRecord = {
  threshold_id: string;
  school_name: string;
  school_type: "liceum" | "technikum";
  city: string;
  class_name: string;
  class_code: string;
  profile_subjects: string[];
  threshold_points: number;
  recruitment_year: number;
  source_label: string;
  source_url: string;
  verified_at: string;
};

export function normalizeSchoolSearch(value: string) {
  return value.trim().replace(/\s+/g, " ").slice(0, 120);
}

export function schoolThresholdLabel(record: RecruitmentThresholdRecord) {
  return `${record.school_name} — ${record.class_name}`;
}
