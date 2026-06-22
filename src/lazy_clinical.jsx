// Thin re-export wrapper — SOAP docs tab uses the same LiveSOAPPanel as the live overlay
import React from "react";
import { LiveSOAPPanel } from "./ClinicalModules.jsx";

// LazySOAP is called with { data, set, onNav, initialTab? }
// LiveSOAPPanel expects { data, onNavigate }
// This wrapper bridges the two prop names so both tabs use identical rendering.
const SOAPDocWrapper = ({ data, onNav }) => (
  <LiveSOAPPanel data={data} onNavigate={onNav} />
);

export default SOAPDocWrapper;
