import { useSectionData, BRAND } from "./orthoFieldKit.jsx";
import HomeProtocolTab from "./HomeProtocolTab.jsx";

/* ============================================================
   orthoHomeProtocol.jsx — thin adapter so the Ortho pathway wizards
   (Outpatient/IPD/Post-op) can reuse the exact same real Home Protocol
   tool the old flow's Treatment > HEP tab already has (HomeProtocolTab.jsx:
   real ALL_EXERCISES library, per-exercise dose/instruction/video editing,
   live WhatsApp preview, "Send to <patient> — WhatsApp" via wa.me, and
   download-as-text) instead of building a second implementation.

   HomeProtocolTab itself is old-flow-shaped: it reads/writes flat fields
   (data.hep_programme, data.hep_precautions, data.soap_clinic, ...,
   data.dem_name, data.dem_phone) via a flat set(field, value). Ortho's own
   data is nested per-section instead, and Ortho Demographics doesn't even
   carry a phone field -- the patient's phone lives on the old-flow-shaped
   patientData record (patientData.dem_phone), the same record
   hasOldSubjectiveData/importOldSubjectiveData already read from for the
   Subjective step's "Load from existing" button. So this adapter:
     - keeps its own real Ortho section ("hep") for the programme/
       precautions/clinic fields HomeProtocolTab writes, via the same
       useSectionData every other Ortho section uses,
     - reads patient name from Ortho's own Demographics section (falling
       back to patientData.dem_name), and phone from patientData.dem_phone,
     - never touches HomeProtocolTab.jsx itself, so it can't drift from
       the real tool.
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

export function HomeProtocolSection({ data, setData, patientData }) {
  const [hep, setHep] = useSectionData(data, setData, "hep");
  const shimData = {
    ...hep,
    dem_name: data.demographics?.name || patientData?.dem_name,
    dem_phone: patientData?.dem_phone,
  };
  return <HomeProtocolTab data={shimData} set={setHep} PC={PC} />;
}

/* formatters[stepId] contract for orthoSummary.jsx: (section) => [{label, value}] */
export function formatHomeProtocolSection(section) {
  const programme = Array.isArray(section?.hep_programme) ? section.hep_programme : [];
  if (!programme.length) return [];
  return [
    { label: "Home exercises", value: programme.map((ex) => ex.name).join(", ") },
    ...(section.hep_precautions ? [{ label: "Precautions", value: section.hep_precautions }] : []),
  ];
}
