import { describe, it, expect } from "vitest";
import { doctorFirstName } from "../userName.js";

describe("doctorFirstName", () => {
  it("uses the name typed at sign-up and drops a leading Dr", () => {
    expect(doctorFirstName({ user_metadata: { full_name: "Dr Meera Nair" } })).toBe("Meera");
    expect(doctorFirstName({ user_metadata: { full_name: "Dr. Chandan Nagar" } })).toBe("Chandan");
    expect(doctorFirstName({ user_metadata: { full_name: "Aditi Sharma" } })).toBe("Aditi");
  });
  it("also accepts name stored under other keys", () => {
    expect(doctorFirstName({ user_metadata: { name: "Ravi Kumar" } })).toBe("Ravi");
    expect(doctorFirstName({ name: "Sana Khan" })).toBe("Sana");
  });
  it("falls back to the start of the email only when there is no name", () => {
    expect(doctorFirstName({ email: "priya.s@clinic.com" })).toBe("priya.s");
  });
  it("returns null when there is nothing to use (never invents a name)", () => {
    expect(doctorFirstName(null)).toBeNull();
    expect(doctorFirstName({})).toBeNull();
    expect(doctorFirstName({ user_metadata: { full_name: "  " } })).toBeNull();
  });
});
