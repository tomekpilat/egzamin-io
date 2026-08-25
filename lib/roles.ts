export const selfServiceRoles = ["student", "parent"] as const;

export type SelfServiceRole = (typeof selfServiceRoles)[number];
export type UserRole = SelfServiceRole | "teacher" | "admin";

export const roleLabels: Record<UserRole, string> = {
  student: "Uczeń",
  parent: "Rodzic",
  teacher: "Nauczyciel",
  admin: "Administrator",
};

export function isSelfServiceRole(value: unknown): value is SelfServiceRole {
  return selfServiceRoles.includes(value as SelfServiceRole);
}

export function isUserRole(value: unknown): value is UserRole {
  return value === "teacher" || value === "admin" || isSelfServiceRole(value);
}
