import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const updateUser = vi.fn().mockResolvedValue({ error: null });
vi.mock("../supabase.js", () => ({ supabase: { auth: { updateUser: (...a) => updateUser(...a) } } }));

import ClinicDetailsCard from "../ClinicDetailsCard.jsx";
import PdfReportsModal from "../PdfReportsModal.jsx";

function pdfHtml(data, user) {
  let html = "";
  vi.spyOn(window, "open").mockReturnValue({ document: { open() {}, write(h) { html = h; }, close() {} }, print() {} });
  render(<PdfReportsModal data={data} onClose={() => {}} currentUser={user} />);
  return html;
}

describe("clinic details", () => {
  beforeEach(() => updateUser.mockClear());

  it("saves the four fields to the account", async () => {
    render(<ClinicDetailsCard currentUser={{ id: "u1", user_metadata: { clinic_name: "Old" } }} />);
    fireEvent.change(screen.getByPlaceholderText(/Street, city/), { target: { value: "12 Road, Pune" } });
    fireEvent.change(screen.getByPlaceholderText(/98765/), { target: { value: "98765" } });
    fireEvent.click(screen.getByText("Save clinic details"));
    await waitFor(() => expect(updateUser).toHaveBeenCalled());
    expect(updateUser.mock.calls[0][0].data).toMatchObject({ clinic_name: "Old", clinic_address: "12 Road, Pune", clinic_phone: "98765" });
    expect(await screen.findByRole("status")).toBeTruthy();
  });

  it("guests cannot save", () => {
    render(<ClinicDetailsCard currentUser={null} isGuest />);
    expect(screen.getByText("Save clinic details").disabled).toBe(true);
  });

  it("PDF fills the header from the account and hides the nudge", () => {
    const h = pdfHtml({ dem_name: "P" }, { user_metadata: { full_name: "Mehta", clinic_name: "Care", clinic_address: "12 Road", clinic_phone: "98765" } });
    expect(h).toContain("Dr. Mehta"); expect(h).toContain("12 Road"); expect(h).toContain("98765");
    expect(h).not.toContain("Clinic details are blank");
  });

  it("PDF shows a screen-only nudge pointing at Settings when details are missing", () => {
    const h = pdfHtml({ dem_name: "P" }, null);
    expect(h).toContain("Settings → Clinic details for reports");
    expect(h).toContain("@media print{.no-print{display:none!important}}");
  });
});
