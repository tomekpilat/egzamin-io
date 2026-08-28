import { BookOpenText, Calculator, FileCheck2, Languages, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export const SUBJECT_KEYS = ["mathematics", "polish", "english", "french", "spanish", "german", "russian", "italian"] as const;
export type SubjectKey = typeof SUBJECT_KEYS[number];
export type SubjectCategoryKey = SubjectKey | "cke";

export function isSubjectKey(value: unknown): value is SubjectKey {
  return typeof value === "string" && SUBJECT_KEYS.includes(value as SubjectKey);
}

type SubjectCategory = {
  key: SubjectCategoryKey;
  label: string;
  Icon: LucideIcon;
};

export const SUBJECT_CATEGORIES: SubjectCategory[] = [
  { key: "mathematics", label: "Matematyka", Icon: Calculator },
  { key: "polish", label: "Język polski", Icon: BookOpenText },
  { key: "english", label: "Język angielski", Icon: Languages },
  { key: "french", label: "Język francuski", Icon: Languages },
  { key: "spanish", label: "Język hiszpański", Icon: Languages },
  { key: "german", label: "Język niemiecki", Icon: Languages },
  { key: "russian", label: "Język rosyjski", Icon: Languages },
  { key: "italian", label: "Język włoski", Icon: Languages },
  { key: "cke", label: "Arkusze CKE", Icon: FileCheck2 },
];

export const subjectLabels: Record<SubjectKey, string> = Object.fromEntries(
  SUBJECT_CATEGORIES.filter((item): item is SubjectCategory & { key: SubjectKey } => item.key !== "cke")
    .map((item) => [item.key, item.label]),
) as Record<SubjectKey, string>;

const subjectIcons = Object.fromEntries(SUBJECT_CATEGORIES.map((item) => [item.key, item.Icon])) as Record<SubjectCategoryKey, LucideIcon>;

export function SubjectIcon({ subject, className }: { subject: SubjectCategoryKey; className?: string }) {
  const Icon = subjectIcons[subject];
  return <span className={cn("subject-category-icon", `subject-category-icon-${subject}`, className)}><Icon aria-hidden="true" /></span>;
}
