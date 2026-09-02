import { BRAND } from "./orthoFieldKit.jsx";
import HomeProtocolTab from "./HomeProtocolTab.jsx";

/* ============================================================
   orthoHomeProtocol.jsx — thin adapter so the Ortho pathway wizards
   (Outpatient/IPD/Post-op) can reuse the exact same real Home Protocol
   tool the old flow's Treatment > HEP tab already has (HomeProtocolTab.jsx:
   real ALL_EXERCISES library, per-exercise dose/instruction/video editing,
   live WhatsApp preview, "Send to <patient> — WhatsApp" via wa.me, and
   download-as-text) instead of building a second implementation.

   Storage: HomeProtocolTab reads/writes flat top-level fields
   (hep_programme, hep_precautions, soap_clinic, soap_clinician,
   soap_clinic_phone, dem_name, dem_phone) -- and those exact same flat
   fields are what SpecialtyPatientProfile.jsx's own "Home" tab already
   reads (d.hep_programme) to show "Current Home Program" + its own
   Send-to-Patient/Download-PDF buttons on the patient's profile. An
   earlier version of this adapter stored the programme inside Ortho's
   own nested `data` (a "hep" section, only visible inside the
   `ortho_outpatient_assessment` JSON blob saveAssessment() writes) --
   invisible to the profile's Home tab, which is why it "wasn't showing"
   there. Fixed by writing through the real flat patientData/onSave pair
   instead -- the exact same one `dem_name` is already synced through
   on every save (see saveAssessment()'s own comment on that), so an
   exercise picked here shows up on the patient's profile immediately,
   same as the old flow.
   ============================================================ */
const PC = {
  accent: BRAND.purple,
  a2: BRAND.purpleDark,
  surface: BRAND.white,
  s2: BRAND.purpleFaint,
  s3: "#F8F7FC",
  border: BRAND.border,
  text: BRAND.ink,
  muted: BRAND.gray,
  isDark: false,
};

export function HomeProtocolSection({ patientData, onSave }) {
  const shimData = {
    hep_programme: patientData?.hep_programme,
    hep_precautions: patientData?.hep_precautions,
    soap_clinic: patientData?.soap_clinic,
    soap_clinician: patientData?.soap_clinician,
    soap_clinic_phone: patientData?.soap_clinic_phone,
    dem_name: patientData?.dem_name,
    dem_phone: patientData?.dem_phone,
  };
  return <HomeProtocolTab data={shimData} set={onSave} PC={PC} />;
}
