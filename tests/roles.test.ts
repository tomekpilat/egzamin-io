import { describe, expect, it } from "vitest";
import { isSelfServiceRole, isUserRole, roleLabels, selfServiceRoles } from "@/lib/roles";

describe("role registration policy", () => {
  it("allows only student and parent in self-service registration", () => {
    expect(selfServiceRoles).toEqual(["student", "parent"]);
    expect(isSelfServiceRole("student")).toBe(true);
    expect(isSelfServiceRole("parent")).toBe(true);
    expect(isSelfServiceRole("teacher")).toBe(false);
    expect(isSelfServiceRole("admin")).toBe(false);
    expect(isSelfServiceRole(null)).toBe(false);
  });

  it("recognizes every internally managed role", () => {
    expect(["student", "parent", "teacher", "admin"].every(isUserRole)).toBe(true);
    expect(isUserRole("owner")).toBe(false);
    expect(isUserRole(undefined)).toBe(false);
    expect(roleLabels.teacher).toBe("Nauczyciel");
  });
});
