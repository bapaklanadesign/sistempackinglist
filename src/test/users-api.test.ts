import { describe, expect, it, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { validateNewUser } from "@/lib/users-api";

const ok = { email: " Admin@Example.com ", password: "1234567890", fullName: "Budi", role: "admin1" };

describe("account creation rules", () => {
  it("normalises email to lowercase without spaces", () => {
    expect(validateNewUser(ok).email).toBe("admin@example.com");
  });
  it("rejects passwords shorter than 10 characters", () => {
    expect(() => validateNewUser({ ...ok, password: "123456789" })).toThrow("Password minimal 10 karakter");
  });
  it("rejects passwords longer than 72 characters", () => {
    expect(() => validateNewUser({ ...ok, password: "a".repeat(73) })).toThrow("Password minimal 10 karakter");
  });
  it("requires a name", () => {
    expect(() => validateNewUser({ ...ok, fullName: "  " })).toThrow("Nama wajib diisi");
  });
  it("rejects unknown roles", () => {
    expect(() => validateNewUser({ ...ok, role: "owner" })).toThrow("Peran tidak valid");
  });
});
