import { BRAND } from "./orthoFieldKit.jsx";

/* Shared stylesheet for every Ortho assessment module (IPD, Post-op
   Rehab, ...) — one visual system, imported as a template string so
   each module can drop it straight into its own <style> tag. */
export function orthoStyles() {
  return `
        * { box-sizing: border-box; }
        .app-shell {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Inter, sans-serif;
          background: linear-gradient(180deg, ${BRAND.purpleFaint} 0%, #FFFFFF 220px);
          min-height: 100vh;
          color: ${BRAND.ink};
          display: flex;
          justify-content: center;
        }
        .app-inner {
          width: 100%; max-width: 480px; height: calc(100dvh - 60px); display: flex; flex-direction: column;
          background: #fff; position: fixed; top: 0; left: 50%; transform: translateX(-50%);
          overflow: hidden; z-index: 1000;
        }
        @media (min-width: 860px) {
          .app-shell { align-items: flex-start; padding: 24px 0; }
          .app-inner { max-width: 640px; height: calc(100dvh - 48px); top: 24px; border-radius: 20px; box-shadow: 0 20px 60px rgba(20,10,60,.12); }
          .condition-grid { grid-template-columns: 1fr 1fr 1fr; }
        }
        .topbar {
          flex-shrink: 0; z-index: 20; background: #fff;
          border-bottom: 1px solid ${BRAND.border};
          padding: 14px 16px 6px;
        }
        .topbar-row { display: flex; align-items: center; gap: 10px; }
        .back-btn {
          border: none; background: ${BRAND.purpleFaint}; color: ${BRAND.purple};
          width: 32px; height: 32px; border-radius: 10px; font-size: 16px; cursor: pointer;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .topbar-title { font-weight: 700; font-size: 16px; flex: 1; }
        .topbar-breadcrumb { font-size: 12px; color: ${BRAND.gray}; margin-top: 2px; }
        .progress-label { font-size: 11px; color: ${BRAND.gray}; padding: 2px 2px 8px; }

        .step-nav { display: flex; gap: 6px; overflow-x: auto; padding: 8px 2px 2px; scrollbar-width: none; -ms-overflow-style: none; }
        .step-nav::-webkit-scrollbar { display: none; }
        .step-circle {
          flex: 0 0 auto; width: 30px; height: 30px; border-radius: 50%;
          border: 1.5px solid ${BRAND.border}; background: #fff; font-size: 13px;
          display: flex; align-items: center; justify-content: center; cursor: pointer;
          color: ${BRAND.grayLight}; transition: all .15s;
        }
        .step-active { border-color: ${BRAND.purple}; background: ${BRAND.purple}; color: #fff; transform: scale(1.14); box-shadow: 0 4px 10px rgba(108,77,255,.35); }
        .step-seen { border-color: ${BRAND.purple}; background: ${BRAND.purpleFaint}; color: ${BRAND.purpleDark}; }
        .step-add { border-style: dashed; border-color: ${BRAND.purple}; color: ${BRAND.purple}; font-weight: 800; font-size: 16px; background: #fff; }
        .stepnav-wrap { position: relative; }

        .ct-modal { position: absolute; inset: 0; background: #fff; z-index: 50; display: flex; flex-direction: column; border-radius: inherit; }
        .ct-modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 16px 10px; border-bottom: 1px solid ${BRAND.border}; }
        .ct-modal-title { font-weight: 800; font-size: 16px; }
        .ct-modal-close { border: none; background: ${BRAND.purpleFaint}; color: ${BRAND.purple}; width: 30px; height: 30px; border-radius: 10px; font-size: 14px; cursor: pointer; flex-shrink: 0; }
        .ct-search-wrap { padding: 10px 16px; border-bottom: 1px solid ${BRAND.border}; }
        .ct-search { width: 100%; border: 1.5px solid ${BRAND.border}; border-radius: 12px; padding: 10px 12px; font-size: 14px; outline: none; font-family: inherit; }
        .ct-modal-body { flex: 1; overflow-y: auto; padding: 14px 16px 16px; }
        .ct-group { margin-bottom: 20px; }
        .ct-group-title { font-weight: 700; font-size: 11.5px; color: ${BRAND.purpleDark}; text-transform: uppercase; letter-spacing: .04em; margin-bottom: 6px; }
        .ct-item { width: 100%; display: flex; align-items: center; gap: 10px; border: none; background: transparent; padding: 11px 4px; font-size: 14px; text-align: left; cursor: pointer; color: ${BRAND.ink}; border-radius: 10px; min-height: 44px; }
        .ct-item:active { background: ${BRAND.purpleFaint}; }
        .ct-item-checked { color: ${BRAND.purpleDark}; font-weight: 600; }
        .ct-checkbox { font-size: 16px; color: ${BRAND.purple}; flex-shrink: 0; }
        .ct-modal-footer { padding: 12px 16px calc(12px + env(safe-area-inset-bottom)); border-top: 1px solid ${BRAND.border}; }

        .content { flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch; padding: 18px 16px 24px; }

        .section-intro { display: flex; gap: 12px; align-items: flex-start; margin-bottom: 18px; }
        .section-intro-icon { font-size: 26px; line-height: 1; }
        .section-intro-title-row { display: flex; align-items: center; gap: 8px; }
        .section-intro-title { font-weight: 800; font-size: 19px; letter-spacing: -0.01em; }
        .section-intro-sub { font-size: 13px; color: ${BRAND.gray}; margin-top: 2px; }

        .subheading { font-weight: 700; font-size: 13px; color: ${BRAND.purpleDark}; text-transform: uppercase; letter-spacing: .04em; margin: 22px 0 10px; }

        .field-block { margin-bottom: 16px; }
        .field-label-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; flex-wrap: wrap; }
        .field-label { font-weight: 600; font-size: 14px; color: ${BRAND.ink}; }
        .hint { font-size: 12px; color: ${BRAND.gray}; margin-top: 6px; font-style: italic; line-height: 1.4; }

        .info-btn-wrap { position: relative; display: inline-flex; }
        .info-btn { border: 1px solid ${BRAND.purple}; background: ${BRAND.purpleFaint}; color: ${BRAND.purpleDark}; font-size: 13px; font-weight: 700; width: 26px; height: 26px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .info-btn-wrap-full { display: block; width: 100%; margin-top: 10px; }
        .info-btn-full { width: 100%; border: 1.5px solid ${BRAND.border}; background: #fff; color: ${BRAND.purple}; font-weight: 700; font-size: 12px; padding: 9px; border-radius: 10px; cursor: pointer; min-height: 36px; }

        /* Bottom sheet — used for "How to perform" so education is always a
           separate layer from the fast-fill assessment cards. */
        /* Same compact, centered dialog size as Cardio/Neuro's InfoCard.jsx
           (60vw x 60vh, capped 480x640) -- was previously a full-width
           bottom sheet growing to 82vh, which felt oversized next to the
           Cardio/Neuro card for the same "How to Perform" content. */
        .sheet-backdrop { position: fixed; inset: 0; background: rgba(20,10,45,.45); z-index: 1070; display: flex; align-items: center; justify-content: center; padding: 16px; animation: sheetFade .15s ease; }
        .sheet-panel { position: relative; z-index: 1071; background: #fff; border-radius: 22px; padding: 14px 18px calc(14px + env(safe-area-inset-bottom)); width: 60vw; height: 60vh; max-width: 480px; max-height: 640px; min-width: 300px; min-height: 380px; display: flex; flex-direction: column; box-shadow: 0 24px 60px rgba(40,10,90,.35); animation: sheetPop .18s cubic-bezier(.2,.9,.3,1); }
        .sheet-scroll { flex: 1; overflow-y: auto; min-height: 0; }
        @keyframes sheetFade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes sheetPop { from { opacity: 0; transform: scale(.96); } to { opacity: 1; transform: scale(1); } }
        .sheet-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; flex-shrink: 0; }
        .sheet-eyebrow { font-size: 11px; font-weight: 800; letter-spacing: .08em; color: ${BRAND.purple}; }
        .sheet-close { border: none; background: ${BRAND.purpleFaint}; color: ${BRAND.purpleDark}; width: 28px; height: 28px; border-radius: 50%; font-size: 13px; cursor: pointer; }
        .sheet-title { font-weight: 800; font-size: 18px; margin: 4px 0 10px; flex-shrink: 0; }
        .sheet-body { font-size: 14.5px; line-height: 1.7; color: ${BRAND.ink}; white-space: pre-line; padding-bottom: 4px; }

        /* Rich "How to perform" content -- real reference photo + the same
           labeled, tinted cards Study Mode shows for this exact item, so a
           therapist gets the full teaching card without leaving the
           assessment. Sheet itself grows via its existing max-height:82vh. */
        .sheet-subtitle { font-size: 13px; font-weight: 700; color: ${BRAND.purple}; margin: -6px 0 10px; flex-shrink: 0; }
        .sheet-hero { position: relative; background: ${BRAND.purpleFaint}; border-radius: 14px; overflow: hidden; margin-bottom: 10px; min-height: 90px; max-height: 150px; display: flex; align-items: center; justify-content: center; cursor: zoom-in; flex-shrink: 0; }
        .sheet-hero img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .sheet-hero-fallback { color: ${BRAND.grayLight}; font-size: 12px; padding: 40px 0; }
        .sheet-hero-zoom { position: absolute; bottom: 8px; right: 8px; width: 26px; height: 26px; border-radius: 50%; background: rgba(20,10,45,.55); color: #fff; font-size: 13px; display: flex; align-items: center; justify-content: center; }

        /* Full-screen lightbox for the reference photo -- tap the hero to
           enlarge, tap anywhere to dismiss. */
        .lightbox-backdrop { position: fixed; inset: 0; z-index: 90; background: rgba(10,5,25,.9); display: flex; align-items: center; justify-content: center; padding: 24px; cursor: zoom-out; }
        .lightbox-img { max-width: 100%; max-height: 100%; border-radius: 10px; object-fit: contain; }
        .lightbox-close { position: absolute; top: 18px; right: 18px; width: 34px; height: 34px; border-radius: 50%; border: none; background: rgba(255,255,255,.15); color: #fff; font-size: 15px; cursor: pointer; }

        /* Perform / Reference / Interpret tab strip -- splits a rich item's
           content across screens instead of one long scroll. */
        .sheet-tabs { display: flex; gap: 4px; background: #F8FAFC; border-radius: 10px; padding: 3px; margin-bottom: 12px; flex-shrink: 0; }
        .sheet-done-btn { flex: 0 0 auto; }
        .sheet-tab { flex: 1; border: none; background: transparent; color: ${BRAND.gray}; font-weight: 700; font-size: 11.5px; padding: 8px 4px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px; }
        .sheet-tab-num { width: 15px; height: 15px; border-radius: 50%; background: #E2E0F0; color: ${BRAND.gray}; font-size: 9px; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .sheet-tab-active { background: #fff; color: ${BRAND.purple}; box-shadow: 0 1px 4px rgba(20,10,60,.1); }
        .sheet-tab-active .sheet-tab-num { background: ${BRAND.purple}; color: #fff; }
        .info-card-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px; }
        .info-card { border-radius: 12px; padding: 11px 12px; margin-bottom: 10px; border: 1px solid transparent; }
        .info-card-label { font-size: 10.5px; font-weight: 800; text-transform: uppercase; letter-spacing: .05em; margin-bottom: 4px; display: flex; align-items: center; gap: 5px; }
        .info-card-body { font-size: 13px; line-height: 1.55; color: ${BRAND.ink}; }
        .info-card-violet { background: ${BRAND.purpleFaint}; border-color: ${BRAND.border}; }
        .info-card-violet .info-card-label { color: ${BRAND.purple}; }
        .info-card-green { background: ${BRAND.greenBg}; }
        .info-card-green .info-card-label { color: ${BRAND.green}; }
        .info-card-amber { background: ${BRAND.amberBg}; }
        .info-card-amber .info-card-label { color: ${BRAND.amber}; }
        .info-card-blue { background: #EFF6FF; }
        .info-card-blue .info-card-label { color: #2563EB; }
        .info-card-red { background: ${BRAND.redBg}; }
        .info-card-red .info-card-label { color: ${BRAND.red}; }
        .info-card-gray { background: #F8FAFC; border-color: #F1F5F9; }
        .info-card-gray .info-card-label { color: ${BRAND.grayLight}; }
        .info-anatomy-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px; }
        .info-anatomy-cell { background: #F8FAFC; border: 1px solid #F1F5F9; border-radius: 10px; padding: 8px 10px; }
        .info-anatomy-cell-label { font-size: 9.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: ${BRAND.grayLight}; margin-bottom: 2px; }
        .info-anatomy-cell-value { font-size: 12.5px; color: ${BRAND.ink}; }
        .info-protocol-label { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .05em; color: ${BRAND.purple}; margin: 4px 0 8px; }
        .info-protocol-row { display: flex; gap: 8px; align-items: flex-start; background: #F8FAFC; border-radius: 10px; padding: 8px 10px; margin-bottom: 6px; font-size: 12.5px; }
        .info-protocol-row b { color: ${BRAND.gray}; font-weight: 700; }

        /* Stepper — compact L/R numeric input with up/down mini-buttons.
           Colour communicates clinical meaning: green = normal, amber =
           mild finding, red = significant finding. Everything else stays
           white/neutral. */
        .stepper { display: flex; align-items: center; border: 1.5px solid ${BRAND.border}; border-radius: 9px; background: #fff; overflow: hidden; width: 62px; transition: border-color .15s, background .15s; }
        .stepper-input { flex: 1; border: none; outline: none; text-align: center; font-size: 13px; font-weight: 700; padding: 6px 0; width: 100%; min-width: 0; color: ${BRAND.ink}; }
        .stepper-arrows { display: flex; flex-direction: column; border-left: 1px solid ${BRAND.border}; }
        .stepper-arrow { border: none; background: ${BRAND.purpleFaint}; color: ${BRAND.purpleDark}; width: 18px; height: 15px; font-size: 7px; cursor: pointer; line-height: 1; display: flex; align-items: center; justify-content: center; }
        .stepper-arrow:first-child { border-bottom: 1px solid ${BRAND.border}; }
        .stepper-severe { border-color: #F4C6C6; background: ${BRAND.redBg}; }
        .stepper-severe .stepper-input { color: #B32424; background: transparent; }
        .stepper-mild { border-color: #F5DBA6; background: ${BRAND.amberBg}; }
        .stepper-mild .stepper-input { color: #8A5A0A; background: transparent; }
        .stepper-normal { border-color: #B8E6CC; background: ${BRAND.greenBg}; }
        .stepper-normal .stepper-input { color: #12603A; background: transparent; }
        /* legacy aliases */
        .stepper-low { border-color: #F5DBA6; background: ${BRAND.amberBg}; }
        .stepper-low .stepper-input { color: #8A5A0A; }
        .stepper-high { border-color: #B8E6CC; background: ${BRAND.greenBg}; }
        .stepper-high .stepper-input { color: #12603A; }

        /* Movement / muscle card — used by ROM + MMT. Large, scannable,
           tap-first — the therapist reads the name, taps a value or chip,
           and moves on. */
        .movement-card { border-top: 1px solid #F5F3FB; padding: 10px 0; }
        .movement-card:first-of-type { border-top: none; padding-top: 0; }
        .movement-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 6px; }
        .movement-name-row { display: flex; align-items: center; gap: 6px; }
        .movement-name { font-weight: 700; font-size: 13.5px; color: ${BRAND.ink}; letter-spacing: -.01em; }
        .muscle-subtitle { font-size: 11px; color: ${BRAND.grayLight}; margin-top: 1px; font-weight: 500; }
        .movement-lr { display: flex; gap: 10px; flex-shrink: 0; }
        .movement-lr-col { display: flex; align-items: center; gap: 3px; }
        .movement-lr-col-stack { display: flex; flex-direction: column; align-items: center; gap: 2px; min-width: 46px; }
        .movement-lr-tag { font-weight: 700; font-size: 10px; color: ${BRAND.purpleDark}; }
        .value-input { width: 46px; border: 1.5px solid ${BRAND.border}; border-radius: 8px; text-align: center; font-size: 13px; font-weight: 700; padding: 5px 2px; color: ${BRAND.ink}; background: #fff; }
        .value-input:focus { outline: none; border-color: ${BRAND.purple}; }
        .restriction-bar { width: 44px; height: 4px; border-radius: 999px; background: #F0EEF5; overflow: hidden; margin-top: 3px; }
        .restriction-bar-fill { height: 100%; border-radius: 999px; transition: width .15s; }
        .restriction-label { font-size: 8.5px; font-weight: 700; margin-top: 1px; white-space: nowrap; }

        /* MMT grade / Special Test result — native <select>, coloured to
           match the selected grade/outcome, exactly like the real app. */
        .grade-select { border: 1.5px solid ${BRAND.border}; border-radius: 9px; background: #fff; color: ${BRAND.ink}; font-size: 12.5px; font-weight: 700; padding: 6px 8px; min-height: 34px; min-width: 58px; cursor: pointer; }
        .grade-select:focus { outline: none; border-color: ${BRAND.purple}; }
        .test-card-title-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 4px; }
        .test-result-select { width: 100%; margin-top: 8px; min-width: 0; font-size: 12px; }
        .test-result-positive { border-color: #F4C6C6; background: ${BRAND.redBg}; color: #B32424; }
        .test-result-negative { border-color: #B8E6CC; background: ${BRAND.greenBg}; color: #12603A; }
        .chip-mini-row { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 5px; }
        .chip-mini { border: 1px solid ${BRAND.border}; background: #fff; color: ${BRAND.gray}; padding: 5px 9px; border-radius: 999px; font-size: 10.5px; font-weight: 600; cursor: pointer; min-height: 28px; }
        .chip-mini-active { border-color: ${BRAND.purple}; background: ${BRAND.purpleFaint}; color: ${BRAND.purpleDark}; }
        .pill-row { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
        .pill-tag { background: ${BRAND.purpleFaint}; color: ${BRAND.purpleDark}; font-size: 10.5px; font-weight: 600; padding: 4px 9px; border-radius: 999px; }
        .pill-tag-root { background: #F0F0F0; color: ${BRAND.gray}; }

        /* Compact meta row — Pain / End feel as tap-to-open pickers instead
           of a wall of always-visible chips. */
        .movement-meta-row { display: flex; gap: 6px; margin-top: 4px; flex-wrap: wrap; }
        .mini-select-wrap { position: relative; display: inline-block; }
        .mini-select-trigger { border: 1px solid ${BRAND.border}; background: #fff; color: ${BRAND.gray}; padding: 6px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; cursor: pointer; min-height: 30px; }
        .mini-select-filled { border-color: ${BRAND.purple}; background: ${BRAND.purpleFaint}; color: ${BRAND.purpleDark}; }
        .mini-select-caret { font-size: 9px; opacity: .6; }
        .mini-select-popover { width: 190px; z-index: 45; }
        .mini-select-severe { border-color: #F4C6C6; background: ${BRAND.redBg}; color: #B32424; }
        .mini-select-mild { border-color: #F5DBA6; background: ${BRAND.amberBg}; color: #8A5A0A; }
        .mini-select-normal { border-color: #B8E6CC; background: ${BRAND.greenBg}; color: #12603A; }

        .mmt-scale-bar { display: flex; align-items: center; gap: 6px; font-size: 11px; color: ${BRAND.gray}; margin-bottom: 10px; }
        .mmt-scale-label { font-weight: 800; letter-spacing: .04em; color: ${BRAND.purpleDark}; font-size: 10px; }

        .region-tab-badge { display: inline-flex; align-items: center; justify-content: center; min-width: 16px; height: 16px; padding: 0 4px; border-radius: 999px; background: rgba(255,255,255,.35); font-size: 10px; font-weight: 800; margin-left: 5px; }
        .region-tab:not(.region-tab-active) .region-tab-badge { background: ${BRAND.purple}; color: #fff; }

        .text-input-wrap, .select-wrap { position: relative; display: flex; align-items: center; gap: 6px; background: #fff; border: 1.5px solid ${BRAND.border}; border-radius: 14px; padding: 4px 6px 4px 12px; min-height: 44px; }
        .text-input, .select-input { flex: 1; border: none; outline: none; font-size: 14px; padding: 8px 4px; background: transparent; min-width: 0; }
        .select-input { cursor: pointer; }
        .combo-unit { font-size: 12px; color: ${BRAND.gray}; padding: 0 6px; white-space: nowrap; }
        .select-btn { flex-shrink: 0; border: none; background: ${BRAND.purpleFaint}; color: ${BRAND.purpleDark}; font-size: 11px; font-weight: 700; padding: 10px; border-radius: 10px; cursor: pointer; white-space: nowrap; min-height: 36px; }

        .select-popover { position: absolute; top: calc(100% + 6px); left: 0; right: 0; background: #fff; border: 1px solid ${BRAND.border}; border-radius: 14px; box-shadow: 0 10px 28px rgba(20,10,60,.16); z-index: 35; padding: 10px; max-height: 280px; overflow-y: auto; }
        .popover-head { display: flex; justify-content: space-between; align-items: center; font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: ${BRAND.gray}; margin-bottom: 8px; padding: 0 2px; }
        .popover-close { border: none; background: transparent; color: ${BRAND.grayLight}; cursor: pointer; font-size: 12px; }
        .popover-list { display: flex; flex-direction: column; gap: 3px; }
        .popover-item { display: flex; justify-content: space-between; align-items: center; border: none; background: ${BRAND.purpleFaint}; color: ${BRAND.ink}; padding: 11px 10px; border-radius: 9px; font-size: 13px; text-align: left; cursor: pointer; min-height: 44px; }
        .popover-item-active { background: ${BRAND.purple}; color: #fff; font-weight: 600; }
        .popover-check { font-size: 12px; }
        .popover-done { margin-top: 8px; width: 100%; border: none; background: ${BRAND.ink}; color: #fff; padding: 11px; border-radius: 10px; font-weight: 700; font-size: 12px; cursor: pointer; }

        .segmented { display: flex; background: ${BRAND.purpleFaint}; border-radius: 12px; padding: 4px; gap: 4px; }
        .segmented-wrap { flex-wrap: wrap; }
        .seg-btn { flex: 1; border: none; background: transparent; color: ${BRAND.gray}; padding: 11px 8px; border-radius: 9px; font-size: 13px; font-weight: 600; cursor: pointer; min-height: 40px; min-width: 64px; }
        .segmented-wrap .seg-btn { flex: 0 1 auto; }
        .seg-active { background: #fff; color: ${BRAND.purple}; box-shadow: 0 1px 4px rgba(20,10,60,.12); }

        .vitals-grid { display: flex; flex-wrap: wrap; gap: 10px 12px; margin-bottom: 6px; }
        .vital-field { flex: 1 1 45%; min-width: 130px; }
        .vital-label-row { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
        .vital-label { font-size: 12px; color: ${BRAND.gray}; font-weight: 600; }
        .vital-input-wrap { display: flex; align-items: center; border: 1.5px solid ${BRAND.border}; border-radius: 12px; padding: 8px 10px; background: #fff; min-height: 44px; }
        .vital-input { border: none; outline: none; font-size: 16px; width: 100%; font-weight: 600; background: transparent; }
        .vital-unit { font-size: 11px; color: ${BRAND.grayLight}; white-space: nowrap; }

        .row-2 { display: flex; gap: 12px; align-items: flex-end; }
        .row-2 > * { flex: 1; min-width: 0; }

        .textarea { width: 100%; border: 1.5px solid ${BRAND.border}; border-radius: 14px; padding: 12px; font-size: 14px; font-family: inherit; outline: none; resize: vertical; }

        .scale-wrap { display: flex; align-items: center; gap: 12px; }
        .scale-range { flex: 1; accent-color: ${BRAND.purple}; height: 32px; }
        .scale-readout { font-weight: 700; font-size: 15px; color: ${BRAND.purple}; min-width: 36px; text-align: right; }
        .scale-max { font-weight: 400; font-size: 11px; color: ${BRAND.grayLight}; }

        .alert { border-radius: 12px; padding: 12px 14px; font-size: 13px; margin-bottom: 14px; line-height: 1.5; font-weight: 500; }
        .alert-red { background: ${BRAND.redBg}; color: #8A1F1F; border: 1px solid #F4C6C6; }
        .alert-amber { background: ${BRAND.amberBg}; color: #8A5A0A; border: 1px solid #F5DBA6; }
        .alert-green { background: ${BRAND.greenBg}; color: #12603A; border: 1px solid #B8E6CC; }

        /* Region / condition pickers */
        .region-group { margin-bottom: 16px; }
        .region-group-title { font-weight: 700; font-size: 11px; color: ${BRAND.purpleDark}; letter-spacing: .05em; margin-bottom: 8px; }
        .region-chip-wrap { display: flex; flex-wrap: wrap; gap: 8px; }
        .region-chip-block { display: flex; flex-direction: column; gap: 6px; }
        .region-chip { border: 1.5px solid ${BRAND.border}; background: #fff; color: ${BRAND.ink}; padding: 10px 14px; border-radius: 12px; font-size: 13.5px; font-weight: 600; cursor: pointer; min-height: 44px; }
        .region-chip-active { border-color: ${BRAND.purple}; background: ${BRAND.purpleFaint}; color: ${BRAND.purpleDark}; }
        .side-row { display: flex; gap: 6px; }
        .side-chip { border: 1px solid ${BRAND.border}; background: #fff; color: ${BRAND.gray}; padding: 6px 10px; border-radius: 999px; font-size: 11.5px; font-weight: 600; cursor: pointer; }
        .side-chip-active { border-color: ${BRAND.purple}; background: ${BRAND.purple}; color: #fff; }

        .condition-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .condition-card { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; border: 1.5px solid ${BRAND.border}; background: #fff; border-radius: 14px; padding: 12px; cursor: pointer; text-align: left; min-height: 64px; }
        .condition-card-active { border-color: ${BRAND.purple}; background: ${BRAND.purpleFaint}; }
        .condition-icon { font-size: 18px; }
        .condition-label { font-size: 12.5px; font-weight: 600; line-height: 1.3; }

        /* ROM / MMT / joint mobility / special tests cards */
        .rom-card { border: 1.5px solid ${BRAND.border}; border-radius: 14px; padding: 12px 14px; margin-bottom: 12px; box-shadow: 0 1px 6px rgba(20,10,60,.03); }
        .rom-card-title { font-weight: 800; font-size: 14px; color: ${BRAND.purpleDark}; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; gap: 8px; letter-spacing: -.01em; }
        .funky-role-badge { font-size: 9px; font-weight: 800; letter-spacing: .04em; padding: 3px 8px; border-radius: 999px; text-transform: uppercase; }
        .funky-chip { border-width: 1.5px; border-style: solid; background: #fff; }
        .rom-table { border: 1px solid ${BRAND.border}; border-radius: 12px; overflow: hidden; margin-bottom: 8px; }
        .rom-row { display: flex; border-bottom: 1px solid ${BRAND.border}; align-items: center; }
        .rom-row:last-child { border-bottom: none; }
        .rom-head { background: ${BRAND.purpleFaint}; font-weight: 700; font-size: 11px; color: ${BRAND.purpleDark}; text-transform: uppercase; letter-spacing: .03em; }
        .rom-cell { flex: 1; padding: 8px 10px; font-size: 13px; display: flex; align-items: center; gap: 4px; }
        .rom-move { flex: 1.3; font-weight: 600; }
        .rom-input { width: 100%; border: none; outline: none; font-size: 15px; font-weight: 700; background: transparent; color: ${BRAND.purple}; min-width: 0; }
        .rom-deg { font-size: 11px; color: ${BRAND.grayLight}; }
        .add-row-btn { width: 100%; border: 1.5px dashed ${BRAND.purple}; background: #fff; color: ${BRAND.purple}; padding: 10px; border-radius: 10px; font-weight: 700; font-size: 12.5px; cursor: pointer; min-height: 40px; }
        .add-row-input { display: flex; gap: 6px; }
        .add-row-confirm { border: none; background: ${BRAND.purple}; color: #fff; padding: 0 14px; border-radius: 10px; font-weight: 700; font-size: 12.5px; cursor: pointer; }

        .grade-row { margin-bottom: 12px; }
        .grade-row-label { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; margin-bottom: 6px; }
        .grade-chips { display: flex; gap: 6px; }
        .grade-chip { flex: 1; border: 1.5px solid ${BRAND.border}; background: #fff; color: ${BRAND.gray}; padding: 9px 0; border-radius: 10px; font-weight: 700; font-size: 13px; cursor: pointer; min-height: 40px; }
        .grade-chip-active { border-color: ${BRAND.purple}; background: ${BRAND.purple}; color: #fff; }

        /* Region tab bar — sits above ROM / MMT / Joint Mobility / Special Tests */
        .region-tab-row-wrap { position: relative; margin-bottom: 14px; }
        .region-tab-row { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; -ms-overflow-style: none; padding-bottom: 2px; }
        .region-tab-row::-webkit-scrollbar { display: none; }
        .region-tab { flex: 0 0 auto; border: 1.5px solid ${BRAND.border}; background: #fff; color: ${BRAND.gray}; padding: 7px 12px; border-radius: 999px; font-weight: 700; font-size: 12px; cursor: pointer; white-space: nowrap; min-height: 32px; }
        .region-tab-active { border-color: ${BRAND.purple}; background: ${BRAND.purple}; color: #fff; }
        .region-tab-add { border-style: dashed; border-color: ${BRAND.purple}; color: ${BRAND.purpleDark}; background: ${BRAND.purpleFaint}; }
        .region-add-popover { top: calc(100% + 6px); left: 0; right: auto; width: 240px; }

        /* MMT left/right grade layout */
        .lr-grade-block { display: flex; flex-direction: column; gap: 6px; }
        .lr-grade-line { display: flex; align-items: center; gap: 8px; }
        .lr-grade-tag { flex: 0 0 18px; font-weight: 800; font-size: 11.5px; color: ${BRAND.purpleDark}; }
        .lr-endurance-tag { color: ${BRAND.gray}; font-weight: 500; font-size: 12px; }
        .rom-norm { font-size: 10.5px; color: ${BRAND.grayLight}; font-weight: 500; margin-top: 1px; }

        /* Special Tests — category filter + card + 3-way radio */
        .category-chip-row { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; -ms-overflow-style: none; margin-bottom: 12px; }
        .category-chip-row::-webkit-scrollbar { display: none; }
        .category-chip { flex: 0 0 auto; border: 1.5px solid ${BRAND.border}; background: #fff; color: ${BRAND.gray}; padding: 6px 11px; border-radius: 999px; font-weight: 700; font-size: 11px; cursor: pointer; white-space: nowrap; min-height: 30px; }
        .category-chip-active { border-color: ${BRAND.purple}; background: ${BRAND.purple}; color: #fff; }
        .test-card { border: 1px solid ${BRAND.border}; border-radius: 12px; padding: 12px; margin-bottom: 10px; }
        .test-card-title { font-weight: 700; font-size: 13.5px; margin-bottom: 8px; }
        .test-radio-row { display: flex; gap: 6px; flex-wrap: wrap; }
        .test-radio { flex: 1 1 auto; display: flex; align-items: center; justify-content: center; gap: 5px; border: 1.5px solid ${BRAND.border}; background: #fff; color: ${BRAND.gray}; padding: 8px 10px; border-radius: 10px; font-weight: 600; font-size: 12px; cursor: pointer; min-height: 38px; }
        .test-radio-red { border-color: #F4C6C6; color: #8A1F1F; }
        .test-radio-grey { border-color: ${BRAND.border}; color: ${BRAND.gray}; }
        .test-radio-selected { border-color: ${BRAND.green}; background: ${BRAND.greenBg}; color: #12603A; }
        .test-radio-selected-red { border-color: #F4C6C6; background: ${BRAND.redBg}; color: #8A1F1F; }
        .test-radio-dot { font-size: 11px; font-weight: 800; }

        /* Special Tests — progress bar + count above the test list */
        .test-progress-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
        .test-progress-label { font-weight: 800; font-size: 13px; }
        .test-progress-count { font-weight: 800; font-size: 12.5px; color: ${BRAND.purple}; }
        .test-progress-bar { height: 5px; border-radius: 999px; background: ${BRAND.border}; overflow: hidden; margin-bottom: 12px; }
        .test-progress-fill { height: 100%; background: ${BRAND.purple}; border-radius: 999px; transition: width .15s; }
        .test-detail-toggle { border: none; background: transparent; color: ${BRAND.purple}; font-weight: 700; font-size: 12px; padding: 8px 2px 2px; cursor: pointer; }
        .test-detail-block { margin-top: 10px; padding-top: 10px; border-top: 1px solid #F5F3FB; }

        .outcome-suggestions { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
        .outcome-suggestion { text-align: left; border: 1.5px dashed ${BRAND.purple}; background: ${BRAND.purpleFaint}; color: ${BRAND.purpleDark}; padding: 10px 12px; border-radius: 10px; font-weight: 600; font-size: 13px; cursor: pointer; }
        .outcome-remove { border: none; background: ${BRAND.redBg}; color: #8A1F1F; font-size: 10.5px; font-weight: 700; padding: 5px 8px; border-radius: 8px; cursor: pointer; }

        /* Outcome Measures — compact, physiom-style grouped list (category
           header + count pill + thin divider, small-font cards) instead of
           a separate region-filter control. */
        .om-group { margin-bottom: 4px; }
        .om-group-head { display: flex; align-items: center; gap: 8px; margin: 14px 2px 8px; }
        .om-group-title { font-size: 11px; font-weight: 800; color: ${BRAND.purple}; text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap; }
        .om-group-line { flex: 1; height: 1px; background: ${BRAND.border}; }
        .om-group-count { font-size: 10px; font-weight: 700; color: ${BRAND.gray}; background: #F8F8FB; border: 1px solid ${BRAND.border}; border-radius: 20px; padding: 1px 8px; }
        .om-card { background: #fff; border: 1px solid ${BRAND.border}; border-radius: 12px; margin-bottom: 8px; overflow: hidden; }
        .om-card-head { display: flex; align-items: center; gap: 8px; padding: 10px 12px; }
        .om-card-icon { font-size: 17px; line-height: 1; }
        .om-card-title-wrap { flex: 1; min-width: 0; }
        .om-card-title { font-weight: 700; font-size: 12.5px; color: ${BRAND.ink}; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
        .om-suggested-badge { font-size: 9px; font-weight: 800; color: ${BRAND.purpleDark}; background: ${BRAND.purpleFaint}; border-radius: 20px; padding: 1px 7px; }
        .om-card-meta { font-size: 10.5px; color: ${BRAND.gray}; margin-top: 1px; }
        .om-card-latest { font-weight: 600; }
        .om-card-score { text-align: right; flex-shrink: 0; }
        .om-card-score-num { font-size: 15px; font-weight: 800; }
        .om-card-score-unit { font-size: 9px; color: ${BRAND.grayLight}; }
        .om-card-trend { font-size: 10.5px; color: ${BRAND.gray}; padding: 0 12px 8px; }
        .om-card-actions { border-top: 1px solid ${BRAND.border}; display: flex; }
        .om-card-action { flex: 1; border: none; background: transparent; color: ${BRAND.purple}; font-weight: 700; font-size: 11px; padding: 8px 4px; cursor: pointer; font-family: inherit; }

        /* AI-assisted objective suggestion step */
        .suggest-card { width: 100%; display: flex; align-items: flex-start; gap: 10px; border: 1.5px solid ${BRAND.border}; background: #fff; border-radius: 14px; padding: 12px 14px; margin-bottom: 8px; cursor: pointer; text-align: left; }
        .suggest-card-active { border-color: ${BRAND.purple}; background: ${BRAND.purpleFaint}; }
        .suggest-check { font-size: 16px; color: ${BRAND.purple}; flex-shrink: 0; margin-top: 1px; }
        .suggest-title { font-weight: 700; font-size: 13.5px; color: ${BRAND.ink}; }
        .suggest-reason { font-size: 11.5px; color: ${BRAND.gray}; margin-top: 2px; line-height: 1.4; }

        .review-row { width: 100%; display: flex; align-items: center; gap: 10px; border: none; background: transparent; border-top: 1px solid #F5F3FB; padding: 10px 2px; cursor: pointer; text-align: left; font-size: 13.5px; color: ${BRAND.ink}; }
        .review-row:first-child { border-top: none; }
        .review-row-label { flex: 1; }
        .review-row-edit { font-size: 11px; color: ${BRAND.purple}; font-weight: 700; }

        .picker-grid { display: flex; flex-direction: column; gap: 10px; }
        .picker-card { display: flex; align-items: center; gap: 14px; border: 1.5px solid ${BRAND.border}; border-radius: 16px; padding: 14px; background: #fff; cursor: pointer; text-align: left; transition: all .15s; width: 100%; }
        .picker-card:active { transform: scale(0.98); }
        .picker-card.selected { border-color: ${BRAND.purple}; background: ${BRAND.purpleFaint}; }
        .picker-icon { font-size: 24px; width: 40px; text-align: center; flex-shrink: 0; }
        .picker-label { font-weight: 700; font-size: 15px; }
        .picker-desc { font-size: 12px; color: ${BRAND.gray}; margin-top: 1px; }
        .writein-card { margin-top: 10px; border-style: dashed; border-color: ${BRAND.purple}; }
        .writein-card.selected { border-style: solid; }

        .summary-card { border: 1.5px solid ${BRAND.border}; border-radius: 14px; padding: 12px 14px; margin-bottom: 12px; cursor: pointer; text-align: left; width: 100%; background: #fff; }
        .summary-title { font-weight: 700; font-size: 13px; color: ${BRAND.purpleDark}; margin-bottom: 8px; display: flex; align-items: center; gap: 6px; }
        .summary-row { display: flex; gap: 8px; font-size: 12.5px; padding: 3px 0; border-top: 1px solid #F5F3FB; }
        .summary-row:first-child { border-top: none; }
        .summary-key { flex: 0 0 42%; color: ${BRAND.gray}; text-transform: capitalize; }
        .summary-val { flex: 1; font-weight: 500; word-break: break-word; }
        .summary-empty { font-size: 12.5px; color: ${BRAND.grayLight}; font-style: italic; padding: 3px 0; }

        .bottombar { flex-shrink: 0; background: #fff; border-top: 1px solid ${BRAND.border}; padding: 12px 16px calc(12px + env(safe-area-inset-bottom)); display: flex; gap: 10px; }
        .ghost-btn { flex: 0 0 auto; border: 1.5px solid ${BRAND.border}; background: #fff; color: ${BRAND.ink}; padding: 13px 18px; border-radius: 14px; font-weight: 600; font-size: 14px; cursor: pointer; min-height: 46px; }
        .primary-btn { flex: 1; border: none; background: linear-gradient(90deg, ${BRAND.purple}, ${BRAND.purpleDark}); color: #fff; padding: 14px 18px; border-radius: 14px; font-weight: 700; font-size: 14px; cursor: pointer; box-shadow: 0 6px 16px rgba(108,77,255,.28); min-height: 46px; }
        .primary-btn:disabled { opacity: .4; cursor: not-allowed; box-shadow: none; }
        .saved-indicator { font-size: 11px; color: ${BRAND.green}; font-weight: 600; display: flex; align-items: center; gap: 4px; padding: 0 2px 8px; }

        /* Treatment Techniques log — recorded-entry cards */
        .tech-card { border: 1.5px solid ${BRAND.border}; border-radius: 14px; padding: 11px 13px; margin-bottom: 10px; }
        .tech-card-head { display: flex; align-items: flex-start; gap: 8px; }
        .tech-card-title { flex: 1; font-weight: 700; font-size: 13.5px; color: ${BRAND.ink}; line-height: 1.35; }
        .tech-card-actions { display: flex; gap: 6px; flex-shrink: 0; }
        .tech-card-edit, .tech-card-del { border: none; background: ${BRAND.purpleFaint}; color: ${BRAND.purpleDark}; width: 26px; height: 26px; border-radius: 8px; font-size: 12px; cursor: pointer; }
        .tech-card-del { background: ${BRAND.redBg}; color: ${BRAND.red}; }
        .tech-card-meta { font-size: 12px; color: ${BRAND.gray}; margin-top: 4px; }
        .tech-card-note { font-size: 12px; color: ${BRAND.gray}; margin-top: 6px; padding-top: 6px; border-top: 1px solid #F5F3FB; font-style: italic; }
  `;
}
