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
          min-height: 100vh; min-height: 100dvh;
          color: ${BRAND.ink};
          display: flex;
          justify-content: center;
        }
        .app-inner {
          width: 100%; max-width: 480px; min-height: 100vh; min-height: 100dvh; display: flex; flex-direction: column;
          background: #fff; position: relative; overflow-x: clip; overflow-y: visible;
        }
        @media (min-width: 860px) {
          .app-shell { align-items: flex-start; padding: 24px 0; }
          .app-inner { max-width: 640px; }
          .bottombar { max-width: 640px; }
          .condition-grid { grid-template-columns: 1fr 1fr 1fr; }
        }
        /* Fix: was position:fixed with height:calc(100dvh - Npx) -- on
           mobile, dvh recalculates live as the browser's address bar
           shows/hides during scroll, which visibly resized/repositioned
           this whole fixed box while a clinician was mid-way through
           filling a field (the "page moves while I fill it in" report).
           Cardio's assessment (CardiopulmonaryAssessment.jsx) hit and
           fixed this exact class of bug already: normal document flow
           (position:relative/min-height:100vh) + a real sticky header +
           a real viewport-fixed bottom bar, so the browser's own natural
           reflow handles toolbar show/hide instead of this box fighting
           it. Mirrored that same fix here. */
        .topbar {
          position: sticky; top: 0; z-index: 20; background: #fff;
          border-bottom: 1px solid ${BRAND.border};
          padding: 9px 16px 5px;
          transform: translateZ(0); -webkit-transform: translateZ(0);
          contain: paint; isolation: isolate;
        }
        /* body is the real scrolling element on mobile (see utils.jsx),
           and .pm-mobile-hdr (64px, z-index 101) is sticky at top:0 within
           that same scroll -- without an offset here the two collide and
           this topbar renders overlapped/hidden behind it once scrolled.
           --pm-mobile-hdr-h (utils.jsx) is that header's own real height
           including the safe-area inset, so this always pins flush under
           it with no dead gap, on notched phones too. */
        @media (max-width: 767px) {
          .topbar { top: var(--pm-mobile-hdr-h, 64px); }
        }
        .topbar-row { display: flex; align-items: center; gap: 10px; }
        .back-btn {
          border: none; background: ${BRAND.purpleFaint}; color: ${BRAND.purple};
          width: 32px; height: 32px; border-radius: 10px; font-size: 16px; cursor: pointer;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .topbar-title { font-weight: 700; font-size: 15px; line-height: 1.25; flex: 1; }
        .topbar-breadcrumb { font-size: 11.5px; color: ${BRAND.gray}; margin-top: 1px; }
        .topbar-step-count { color: ${BRAND.purple}; font-weight: 700; }
        .progress-label { font-size: 11px; color: ${BRAND.gray}; padding: 2px 2px 8px; }

        .step-nav { display: flex; gap: 4px; overflow-x: auto; padding: 5px 2px 0; scrollbar-width: none; -ms-overflow-style: none; }
        .step-nav::-webkit-scrollbar { display: none; }
        /* Icon circle + label underneath, not a bare icon circle
           (2026-09-16, Aditi: "for new or old person it['s] very difficult
           to know which [icon] have what... I want it to be written") --
           every step already carries a real label (STEP_META), this just
           makes it visible instead of tooltip-only. Shrunk (2026-09-16,
           Aditi: "not able to see the screen when I'm filling the
           assessment" -- this strip plus the two lines above it and the
           progress row below it were eating a third of the viewport) --
           label text kept, just smaller and tighter, not removed. */
        .step-circle {
          flex: 0 0 auto; width: 48px; display: flex; flex-direction: column; align-items: center;
          gap: 3px; background: none; border: none; padding: 0; cursor: pointer; color: ${BRAND.grayLight};
        }
        .step-circle-ring {
          width: 27px; height: 27px; border-radius: 50%; border: 1.5px solid ${BRAND.border}; background: #fff;
          display: flex; align-items: center; justify-content: center; position: relative; transition: all .15s;
        }
        .step-circle-icon { display: flex; align-items: center; justify-content: center; font-size: 12px; line-height: 1; }
        .step-circle-label { font-size: 9.5px; font-weight: 600; line-height: 1.1; text-align: center; color: inherit; max-width: 48px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .step-active .step-circle-ring { border-color: ${BRAND.purple}; background: ${BRAND.purple}; color: #fff; box-shadow: 0 4px 10px rgba(108,77,255,.35); }
        .step-active .step-circle-label { color: ${BRAND.purple}; font-weight: 800; }
        .step-seen .step-circle-ring { border-color: ${BRAND.purple}; color: ${BRAND.purple}; }
        .step-seen .step-circle-label { color: ${BRAND.purple}; font-weight: 800; }
        .step-add .step-circle-ring { border-style: dashed; border-color: ${BRAND.purple}; color: ${BRAND.purple}; }
        .step-add .step-circle-icon { font-size: 16px; }
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

        .content { flex: 1; padding: 18px 16px 150px; }

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

        .lr-grid { border: 1.5px solid ${BRAND.border}; border-radius: 14px; overflow: hidden; }
        .lr-row { display: flex; border-bottom: 1px solid ${BRAND.border}; }
        .lr-row:last-child { border-bottom: none; }
        .lr-head { background: ${BRAND.purpleFaint}; }
        .lr-cell { flex: 1; padding: 8px 6px; font-size: 12px; display: flex; align-items: center; }
        .lr-zone { flex: 1.4; font-weight: 600; color: ${BRAND.ink}; }
        .lr-colhead { font-weight: 700; color: ${BRAND.purpleDark}; justify-content: center; }
        .lr-select { width: 100%; border: 1px solid ${BRAND.border}; border-radius: 8px; padding: 5px 4px; font-size: 11.5px; background: #fff; }

        .collapsible-head { width: 100%; display: flex; align-items: center; justify-content: space-between; background: ${BRAND.purpleFaint}; border: 1px solid ${BRAND.border}; border-radius: 10px; padding: 9px 12px; margin-bottom: 10px; font-weight: 700; font-size: 13px; color: ${BRAND.purpleDark}; cursor: pointer; font-family: inherit; }
        .collapsible-chevron { transition: transform 0.15s; }
        .collapsible-chevron.open { transform: rotate(180deg); }

        .ai-intake-toggle { width: 100%; padding: 12px; margin-bottom: 14px; border: 1.5px dashed ${BRAND.purple}; border-radius: 12px; background: ${BRAND.purpleFaint}; color: ${BRAND.purpleDark}; font-weight: 700; font-size: 13px; cursor: pointer; font-family: inherit; }
        .ai-intake-panel { border: 1.5px solid ${BRAND.purple}; border-radius: 14px; padding: 14px; margin-bottom: 16px; background: linear-gradient(180deg, ${BRAND.purpleFaint}, #fff 60%); }
        .ai-intake-head { display: flex; align-items: center; justify-content: space-between; font-weight: 800; font-size: 13.5px; color: ${BRAND.purpleDark}; margin-bottom: 8px; }
        .ai-intake-textarea { width: 100%; border: 1.5px solid ${BRAND.border}; border-radius: 10px; padding: 10px; font-size: 13px; font-family: inherit; outline: none; resize: vertical; margin: 8px 0; }
        .ai-intake-actions { display: flex; gap: 8px; margin-top: 8px; }
        .ai-intake-actions .primary-btn, .ai-intake-actions .ghost-btn { flex: 1; }
        .ai-intake-error { margin-top: 8px; padding: 8px 10px; background: #FDECEC; border: 1px solid #F7D3D3; border-radius: 8px; color: #B91C1C; font-size: 12px; }
        .ai-intake-review { margin-top: 4px; }
        .ai-intake-row { font-size: 12.5px; color: ${BRAND.ink}; padding: 5px 0; border-top: 1px solid #EDE4FB; line-height: 1.5; }
        .ai-intake-row:first-of-type { border-top: none; }
        .ai-intake-flag { color: #B91C1C; }

        .info-btn-wrap { position: relative; display: inline-flex; }
        /* Raised "3D" pill -- solid gradient fill + hard bottom edge (button
           side) + soft drop shadow (elevation) + inset top highlight (glossy
           top face), pressing down flat on :active. Was a pale, flat, barely-
           visible outline circle (2026-09-03, Aditi: "it is so much boring,
           and we cannot see it or use it" -- also genuinely hard to tap at
           26px with a 1px border for contrast). White glyph on saturated
           purple reads at a glance instead of purple-on-near-white. */
        .info-btn { border: none; background: linear-gradient(155deg, #A78BFA, ${BRAND.purple} 55%, ${BRAND.purpleDark}); color: #fff; font-size: 14px; font-weight: 800; width: 28px; height: 28px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 2px 0 ${BRAND.purpleDark}, 0 4px 7px rgba(109,40,217,0.35), inset 0 1px 1px rgba(255,255,255,0.55); transition: transform 0.08s ease, box-shadow 0.08s ease; }
        .info-btn:active { transform: translateY(2px); box-shadow: 0 0 0 ${BRAND.purpleDark}, 0 1px 2px rgba(109,40,217,0.35), inset 0 1px 1px rgba(255,255,255,0.3); }
        .info-btn-wrap-full { display: block; width: 100%; margin-top: 10px; }
        .info-btn-full { width: 100%; border: 1.5px solid ${BRAND.border}; background: #fff; color: ${BRAND.purple}; font-weight: 700; font-size: 12px; padding: 9px; border-radius: 10px; cursor: pointer; min-height: 36px; }
        .info-img-trigger { flex: 0 0 auto; width: 96px; height: 96px; border-radius: 16px; border: none; padding: 0; overflow: hidden; background: #F6F5FA; display: flex; align-items: center; justify-content: center; cursor: pointer; }
        .info-img-trigger img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .info-img-trigger i { font-size: 34px; color: ${BRAND.grayLight}; }
        /* Compact variant for inline list rows (Add Treatment's exercise
           results, 2026-09-16, Aditi: "the photos... small photos beside
           the exercise name") -- same trigger, same sheet, just sized down
           to sit next to a name/target line instead of a full tile. */
        .info-img-trigger-sm { width: 40px; height: 40px; border-radius: 10px; }
        .info-img-trigger-sm i { font-size: 18px; }
        /* Medium variant for the plain (non-AI) ROM/MMT/Special Tests rows
           (2026-09-16, Aditi: "put the image square but make it a bit
           larger... not be bigger like in the AI") -- between the sm inline
           thumbnail and the full 96px AI Objective Assessment tile. */
        .info-img-trigger-md { width: 60px; height: 60px; border-radius: 14px; }
        .info-img-trigger-md i { font-size: 24px; }

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

        /* Compact "fill this in before saving" confirm dialog -- reuses
           .sheet-backdrop above but its own small, auto-height panel
           instead of .sheet-panel's big educational-sheet sizing. */
        .missing-dem-panel { position: relative; z-index: 1071; background: #fff; border-radius: 20px; padding: 24px 22px; width: 100%; max-width: 340px; text-align: center; box-shadow: 0 24px 60px rgba(40,10,90,.35); animation: sheetPop .18s cubic-bezier(.2,.9,.3,1); }
        .missing-dem-icon { font-size: 34px; line-height: 1; margin-bottom: 10px; }
        .missing-dem-title { font-weight: 800; font-size: 17px; color: ${BRAND.ink}; margin-bottom: 8px; text-transform: capitalize; }
        .missing-dem-body { font-size: 13px; color: ${BRAND.gray}; line-height: 1.5; margin-bottom: 18px; }
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
        /* aspect-ratio:1/1 instead of a min/max-height range (2026-09-16,
           Aditi: "put the images of the exercises in a square box") -- the
           reference photo is usually a 2x2 numbered step grid baked into
           one image, and the old height range let object-fit:cover crop it
           unevenly depending on the sheet's width. A fixed square keeps the
           whole 2x2 grid visible and consistent everywhere it's shown. */
        .sheet-hero { position: relative; background: ${BRAND.purpleFaint}; border-radius: 14px; overflow: hidden; margin-bottom: 10px; aspect-ratio: 1 / 1; width: 100%; display: flex; align-items: center; justify-content: center; cursor: zoom-in; flex-shrink: 0; }
        .sheet-hero img { width: 100%; height: 100%; object-fit: contain; display: block; }
        .sheet-hero-fallback { color: ${BRAND.grayLight}; font-size: 12px; padding: 40px 0; }
        .sheet-hero-zoom { position: absolute; bottom: 8px; right: 8px; width: 26px; height: 26px; border-radius: 50%; background: rgba(20,10,45,.55); color: #fff; font-size: 13px; display: flex; align-items: center; justify-content: center; }
        /* Upload/replace straight into this reference-photo slot -- same
           deterministic-Cloudinary-id scheme Cardio/Neuro's InfoCard.jsx
           already uses, now on Ortho's own ROM/MMT/Special Test/Neuro
           Screen sheets too. */
        .sheet-hero-empty { cursor: pointer; }
        .sheet-hero-replace { position: absolute; top: 8px; right: 8px; width: 30px; height: 30px; border-radius: 50%; border: none; background: rgba(20,10,45,.55); color: #fff; font-size: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0; }
        .sheet-hero-replace:disabled { opacity: 0.6; cursor: default; }

        /* Full-screen lightbox for the reference photo -- tap the hero to
           enlarge, tap anywhere to dismiss. */
        .lightbox-backdrop { position: fixed; inset: 0; z-index: 90; background: rgba(10,5,25,.9); display: flex; align-items: center; justify-content: center; padding: 24px; cursor: zoom-out; }
        .lightbox-img { max-width: 100%; max-height: 100%; border-radius: 10px; object-fit: contain; }
        .lightbox-close { position: absolute; top: 18px; right: 18px; width: 34px; height: 34px; border-radius: 50%; border: none; background: rgba(255,255,255,.15); color: #fff; font-size: 15px; cursor: pointer; }
        .lightbox-replace { position: absolute; top: 18px; right: 62px; padding: 8px 14px; border-radius: 20px; border: none; background: rgba(255,255,255,.15); color: #fff; font-weight: 700; font-size: 13px; cursor: pointer; }
        .lightbox-replace:disabled { opacity: 0.6; cursor: default; }

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
        .stepper { display: flex; align-items: center; border: 1.5px solid ${BRAND.border}; border-radius: 9px; background: #fff; overflow: hidden; width: 68px; transition: border-color .15s, background .15s; }
        /* 2026-09-02, Aditi: "I'm not able to see the whole number" on ROM's
           degree Stepper -- two compounding causes:
           1) this input never suppressed the browser's own native
              number-input spinner, so on real mobile Chrome/Safari it
              rendered its OWN spin buttons stacked on top of/beside the
              custom .stepper-arrows, squeezing the digits into a sliver.
              appearance:none removes it.
           2) the REAL culprit: utils.jsx's global mobile stylesheet forces
              min-height:44px, font-size:16px, padding:10px 12px, all
              !important, onto every plain input element (same rule that
              already needed a .pm-compact-select escape hatch for MMT's
              grade dropdowns, see that comment in utils.jsx) -- 24px of forced
              horizontal padding alone doesn't fit in a 62-68px-wide
              stepper box, so PART OF THE DIGITS RENDERED OUTSIDE the
              padding box and got clipped by .stepper's overflow:hidden.
              A plain (non-!important) rule here can never win against
              that -- !important beats higher specificity outright -- so
              every size property below needs its own !important too.
              The box is widened slightly as well so a 3-digit value (a
              180° shoulder flexion norm, say) always has clear room. */
        .stepper-input { flex: 1; border: none; outline: none; text-align: center; font-size: 13px !important; font-weight: 700; padding: 6px 2px !important; min-height: 0 !important; width: 100%; min-width: 0; color: ${BRAND.ink}; -moz-appearance: textfield; appearance: none; }
        .stepper-input::-webkit-outer-spin-button, .stepper-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        .stepper-arrows { display: flex; flex-direction: column; border-left: 1px solid ${BRAND.border}; }
        .stepper-arrow { border: none; background: ${BRAND.purpleFaint}; color: ${BRAND.purpleDark}; width: 18px; height: 15px; font-size: 7px; cursor: pointer; line-height: 1; display: flex; align-items: center; justify-content: center; }
        .stepper-arrow:first-child { border-bottom: 1px solid ${BRAND.border}; }
        /* Larger variant for ROM's degree box (2026-09-16, Aditi: "make the
           rom grade button larger then now") -- same !important escape
           hatch .stepper-input already needs against the global mobile
           input rule, just bigger numbers. */
        .stepper-lg { width: 84px; border-radius: 10px; }
        .stepper-lg .stepper-input { font-size: 16px !important; padding: 8px 2px !important; }
        .stepper-lg .stepper-arrow { width: 22px; height: 19px; font-size: 9px; }
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
        /* Square variant (2026-09-11, Aditi: first pass with separate
           [−]/[+] side buttons was "totally wrong" -- back to the
           original up/down-arrow shape, just bigger, with the number box
           and the arrow block staying two visually separate pieces with a
           real gap between them, not fused into one bordered container
           like the pre-2026-09-11 62x62 box (whose arrows were a
           22px-wide column of 8px-font ▲▼, below any real tap-target
           size). Arrow buttons here are roughly double that. Used by the
           Care Plan dose form (Sets/Reps/Hold, goal weeks) and the
           Technique section's Sets/Duration/Frequency steppers; the base
           .stepper class every other numeric field (ROM, MMT, etc.) uses
           is untouched. */
        .stepper-sq-row { display: flex; align-items: stretch; gap: 6px; width: 100%; }
        .stepper-sq-input { flex: 1 1 auto; min-width: 0; height: 56px; border: 1.5px solid ${BRAND.border}; border-radius: 10px; background: #fff; text-align: center; font-size: 19px !important; font-weight: 700; padding: 0 !important; min-height: 0 !important; color: ${BRAND.ink}; outline: none; -moz-appearance: textfield; appearance: none; }
        .stepper-sq-input::-webkit-outer-spin-button, .stepper-sq-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        .stepper-sq-arrows { flex: 0 0 34px; display: flex; flex-direction: column; gap: 4px; }
        .stepper-sq-arrow { flex: 1; border: 1.5px solid ${BRAND.border}; border-radius: 8px; background: ${BRAND.purpleFaint}; color: ${BRAND.purpleDark}; font-size: 13px; cursor: pointer; line-height: 1; display: flex; align-items: center; justify-content: center; touch-action: manipulation; }
        .stepper-sq-arrow:active { background: ${BRAND.purple}; color: #fff; }
        .stepper-sq-row.stepper-severe .stepper-sq-input { border-color: #F4C6C6; background: ${BRAND.redBg}; color: #B32424; }
        .stepper-sq-row.stepper-mild .stepper-sq-input { border-color: #F5DBA6; background: ${BRAND.amberBg}; color: #8A5A0A; }
        .stepper-sq-row.stepper-normal .stepper-sq-input, .stepper-sq-row.stepper-high .stepper-sq-input { border-color: #B8E6CC; background: ${BRAND.greenBg}; color: #12603A; }
        .stepper-sq-row.stepper-low .stepper-sq-input { border-color: #F5DBA6; background: ${BRAND.amberBg}; color: #8A5A0A; }

        /* Movement / muscle card — used by ROM + MMT. Large, scannable,
           tap-first — the therapist reads the name, taps a value or chip,
           and moves on. */
        .movement-card { border-top: 1px solid #F5F3FB; padding: 10px 0; }
        .movement-card:first-of-type { border-top: none; padding-top: 0; }
        /* flex-wrap so the L/R grade selects drop to their own line instead
           of overflowing past the viewport when a muscle/movement name is
           long ("External + Internal Obliques", "Transversus Abdominis") --
           .movement-info takes the min-width:0 + flex:1 a flex child needs
           to actually shrink/wrap its text instead of forcing the row wider
           than its container. Still used by orthoAdvancedTools.jsx's other
           movement lists (RomSection moved to the .rom-row table layout
           below; MMT moved to the stacked .mmt-row/.mmt-grades-row layout
           just below -- 2026-09-16, Aditi tried grades stacked under the
           name, then beside the photo instead, then on an actual narrow
           phone the beside-photo row had no room left for the name column
           at all and wrapped/overlapped, so back to stacked: name+photo on
           their own row, L/R grades on the row under it, full width to
           breathe instead of squeezed beside a fixed-width photo). */
        .movement-head { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 6px; }
        .movement-info { flex: 1 1 160px; min-width: 0; }
        .movement-name-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
        .mmt-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
        .mmt-name-col { min-width: 0; }
        .mmt-grades-row { display: flex; gap: 10px; }
        /* Sub-row toggle for ROM's pain-quality/end-feel chips -- only that
           detail collapses, not the whole movement row (degree steppers
           stay visible since they're filled for every movement). */
        .rom-detail-toggle { padding: 6px 2px; margin-bottom: 4px; border: none; border-radius: 8px; }
        .rom-detail-toggle:hover { background: ${BRAND.purpleFaint}; }

        /* ROM as a compact table -- one line per movement (name | L | R),
           columns aligned across every row via a shared grid template so
           the degree fields line up regardless of movement-name length. */
        .rom-row { border-top: 1px solid #F5F3FB; padding: 7px 0; }
        .rom-row:first-of-type { border-top: none; padding-top: 0; }
        .rom-row-grid { display: grid; grid-template-columns: 1fr 84px 84px; align-items: center; gap: 8px; }
        .rom-table-head { padding-bottom: 6px; border-bottom: 1.5px solid ${BRAND.border}; margin-bottom: 2px; font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: ${BRAND.grayLight}; }
        .rom-table-head span:not(:first-child) { text-align: center; }
        .rom-row-name { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; min-width: 0; }
        .rom-row-cell { display: flex; flex-direction: column; align-items: center; gap: 2px; }
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
        /* Title row also carries the side selector (2026-09-16, Aditi: "put
           the special test name beside the photo... right left and
           bilateral... in the right corner") -- photo+name stay grouped on
           the left, side chips pinned to the far right of the same row,
           wrapping to their own line only when the card gets too narrow. */
        .test-card-title-row { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 6px 12px; margin-bottom: 4px; }
        .test-card-title-main { display: flex; align-items: center; gap: 10px; min-width: 0; }
        .test-card-title-row .test-card-title { margin-bottom: 0; }
        .test-result-select { width: 100%; margin-top: 8px; min-width: 0; font-size: 12px; }
        .test-result-positive { border-color: #F4C6C6; background: ${BRAND.redBg}; color: #B32424; }
        .test-result-negative { border-color: #B8E6CC; background: ${BRAND.greenBg}; color: #12603A; }
        .chip-mini-row { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 5px; }
        .chip-mini { border: 1px solid ${BRAND.border}; background: #fff; color: ${BRAND.gray}; padding: 5px 9px; border-radius: 999px; font-size: 10.5px; font-weight: 600; cursor: pointer; min-height: 28px; }
        .chip-mini-active { border-color: ${BRAND.purple}; background: ${BRAND.purpleFaint}; color: ${BRAND.purpleDark}; }

        /* Stacked full-width option list -- ROM's Pain quality/End feel
           (2026-09-02, Aditi: "make the pain end feel in listing format"),
           tap-to-select/tap-again-to-clear same as chip-mini above, just
           one option per row instead of wrapped pills. */
        .mini-list-label { font-size: 10.5px; font-weight: 700; color: ${BRAND.grayLight}; text-transform: uppercase; letter-spacing: .04em; margin: 8px 0 4px; }
        .mini-list { border: 1px solid ${BRAND.border}; border-radius: 10px; overflow: hidden; margin-bottom: 6px; }
        .mini-list-row { display: flex; align-items: center; justify-content: space-between; width: 100%; text-align: left; border: none; border-top: 1px solid ${BRAND.border}; background: #fff; color: ${BRAND.ink}; padding: 9px 12px; font-size: 12.5px; font-weight: 600; cursor: pointer; min-height: 38px; }
        .mini-list-row:first-child { border-top: none; }
        .mini-list-row-active { background: ${BRAND.purpleFaint}; color: ${BRAND.purpleDark}; font-weight: 700; }
        .mini-list-check { color: ${BRAND.purple}; font-weight: 800; font-size: 13px; }
        .rom-normal-btn { border: 1px solid ${BRAND.green}50; background: ${BRAND.greenBg}; color: ${BRAND.green}; padding: 5px 9px; border-radius: 999px; font-size: 10.5px; font-weight: 700; cursor: pointer; min-height: 28px; }
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
        .age-select-wrap { display: flex; align-items: center; gap: 4px; background: #fff; border: 1.5px solid ${BRAND.border}; border-radius: 14px; padding: 4px 6px 4px 12px; min-height: 44px; }
        .age-select { flex: 1; border: none; outline: none; font-size: 15px; font-weight: 600; padding: 8px 0; background: transparent; min-width: 0; width: 100%; color: ${BRAND.ink}; }
        /* Age fixed-width + Gender flexible, not an even 50/50 split -- at
           50% the 3-pill Gender row had no room and wrapped to a 2nd line,
           leaving Age's single-line box floating with empty space beside
           it (2026-09-16, Aditi: "so much gap... make it compact"). A
           narrow, content-sized Age column keeps both fields one line tall. */
        .age-gender-row > *:first-child { flex: 0 0 108px; }
        .age-gender-row > *:last-child { flex: 1 1 auto; min-width: 0; }
        .age-gender-row .segmented { flex-wrap: nowrap; }
        .age-gender-row .seg-btn { flex: 1 1 0; padding-left: 6px; padding-right: 6px; text-align: center; }
        .select-btn { flex-shrink: 0; border: none; background: ${BRAND.purpleFaint}; color: ${BRAND.purpleDark}; font-size: 11px; font-weight: 700; padding: 10px; border-radius: 10px; cursor: pointer; white-space: nowrap; min-height: 36px; }

        .select-popover { position: absolute; top: calc(100% + 6px); right: 0; width: min(78%, 260px); background: #fff; border: 1px solid ${BRAND.border}; border-radius: 14px; box-shadow: 0 10px 28px rgba(20,10,60,.16); z-index: 35; padding: 8px 10px 10px; display: flex; flex-direction: column; max-height: min(52vh, 320px); }
        .popover-head { display: flex; justify-content: space-between; align-items: center; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: ${BRAND.gray}; padding: 2px 2px 6px; flex-shrink: 0; }
        .popover-close { border: none; background: transparent; color: ${BRAND.grayLight}; cursor: pointer; font-size: 13px; padding: 4px; line-height: 1; }
        .popover-list { display: flex; flex-direction: column; overflow-y: auto; flex: 1 1 auto; min-height: 0; }
        /* flex-shrink:0 (2026-09-17, Aditi: multi-select checklists like
           "Mechanism type" showing every row's text overlapping the next)
           -- min-height:0 above (added so rows aren't forced to a touch-
           target height) also strips flexbox's default protection against
           shrinking a flex item below its own content size. With enough
           options to exceed .select-popover's capped max-height, every
           row's flex-shrink:1 default let the column collapse each button
           down to one line's height even when its label actually wraps to
           2-3 lines, so the extra lines painted straight over the next
           row instead of the list just scrolling (which .popover-list's
           own overflow-y:auto already supports). Pinning shrink to 0 keeps
           every row at its real, correctly-wrapped height. */
        .popover-item { display: flex; align-items: center; gap: 9px; border: none; border-bottom: 1px solid ${BRAND.border}; background: transparent; color: ${BRAND.ink}; padding: 10px 2px; border-radius: 0; font-size: 13px; text-align: left; cursor: pointer; line-height: 1.3; min-height: 0; flex-shrink: 0; }
        .popover-item:last-child { border-bottom: none; }
        .popover-item-label { flex: 1; }
        .popover-check-icon { flex-shrink: 0; width: 16px; height: 16px; border-radius: 4px; border: 1.5px solid ${BRAND.border}; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #fff; }
        .popover-check-icon-radio { border-radius: 50%; }
        .popover-check-icon-active { background: ${BRAND.purple}; border-color: ${BRAND.purple}; }
        .popover-item-active { color: ${BRAND.purpleDark}; font-weight: 600; }
        .popover-done { margin-top: 8px; flex-shrink: 0; width: 100%; border: none; background: ${BRAND.purple}; color: #fff; padding: 10px; border-radius: 10px; font-weight: 700; font-size: 12.5px; cursor: pointer; }
        .date-wheel-popover { width: min(90%, 300px); }
        .date-wheel-row { display: flex; gap: 6px; }
        .date-wheel-col { flex: 1; max-height: 180px; overflow-y: auto; scroll-snap-type: y proximity; border: 1px solid ${BRAND.border}; border-radius: 10px; background: ${BRAND.purpleFaint}; display: flex; flex-direction: column; }
        .date-wheel-item { border: none; background: transparent; padding: 9px 4px; font-size: 13px; font-weight: 600; color: ${BRAND.ink}; cursor: pointer; scroll-snap-align: center; text-align: center; }
        .date-wheel-item-active { background: ${BRAND.purple}; color: #fff; border-radius: 8px; }

        /* Refined-chip look (2026-08-27, user request) -- individually
           bordered pills instead of the old shared lavender tray, applied
           to every Segmented control via these same class names so no
           call site needed to change. */
        .segmented { display: flex; flex-wrap: wrap; gap: 8px; }
        .segmented-wrap { flex-wrap: wrap; }
        .seg-btn {
          flex: 0 1 auto; border: 1.5px solid ${BRAND.border}; background: #fff; color: ${BRAND.ink};
          padding: 10px 14px; border-radius: 11px; font-size: 13px; font-weight: 600; cursor: pointer;
          min-height: 40px; transition: transform .1s ease-out, box-shadow .1s ease-out, background .1s ease-out;
        }
        .segmented-wrap .seg-btn { flex: 0 1 auto; }
        .seg-btn:active { transform: scale(.95); }
        .seg-active { background: ${BRAND.purple}; color: #fff; border-color: ${BRAND.purple}; box-shadow: 0 4px 10px rgba(108,77,255,.24); }

        /* Segmented variant="chips" -- individually bordered pills instead
           of the shared lavender tray above, for pickers like Treatment
           Techniques' type selector where that tray reads as visually flat. */
        .chip-row { display: flex; flex-wrap: wrap; gap: 8px; }
        .chip-btn {
          display: flex; align-items: center; gap: 6px;
          border: 1.5px solid ${BRAND.border}; border-radius: 11px; padding: 9px 13px;
          background: #fff; color: ${BRAND.ink}; font-size: 13px; font-weight: 600; cursor: pointer;
          font-family: inherit; transition: transform .1s ease-out, box-shadow .1s ease-out, background .1s ease-out;
        }
        .chip-btn:active { transform: scale(.95); }
        .chip-active { background: ${BRAND.purple}; border-color: ${BRAND.purple}; color: #fff; box-shadow: 0 4px 10px rgba(108,77,255,.24); }
        .chip-icon { font-size: 14px; }

        /* Vertical list of tap-to-apply rows -- e.g. Exercise Prescription's
           collapsed "Quick-apply protocol" list, instead of a wrapped chip row. */
        .template-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px; }
        .template-row {
          width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 10px;
          border: 1.5px solid ${BRAND.border}; border-radius: 12px; padding: 12px 14px;
          background: #fff; cursor: pointer; font-family: inherit; text-align: left;
          transition: transform .1s ease-out, background .1s ease-out;
        }
        .template-row:active { transform: scale(.98); background: ${BRAND.purpleFaint}; }
        .template-row-label { font-weight: 700; font-size: 13.5px; color: ${BRAND.ink}; }
        .template-row-note { font-size: 11.5px; color: ${BRAND.gray}; margin-top: 3px; line-height: 1.4; }
        .template-row-arrow { color: ${BRAND.purple}; font-weight: 800; font-size: 16px; flex-shrink: 0; }

        .vitals-grid { display: flex; flex-wrap: wrap; gap: 10px 12px; margin-bottom: 6px; }
        .vital-field { flex: 1 1 45%; min-width: 130px; }
        .vital-label-row { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
        .vital-label { font-size: 12px; color: ${BRAND.gray}; font-weight: 600; }
        .vital-input-wrap { display: flex; align-items: center; border: 1.5px solid ${BRAND.border}; border-radius: 12px; padding: 8px 10px; background: #fff; min-height: 44px; }
        .vital-input { border: none; outline: none; font-size: 16px; width: 100%; font-weight: 600; background: transparent; }
        .vital-unit { font-size: 11px; color: ${BRAND.grayLight}; white-space: nowrap; }

        .vital-chip { flex: 1 1 45%; min-width: 140px; border: 1.5px solid ${BRAND.border}; border-radius: 12px; background: #fff; }
        .vital-chip-open { border-color: ${BRAND.purple}; }
        .vital-chip-head { display: flex; align-items: center; gap: 6px; padding: 10px 10px; min-height: 44px; cursor: pointer; }
        .vital-chip-label { font-size: 12px; color: ${BRAND.gray}; font-weight: 600; }
        .vital-chip-value { flex: 1; text-align: right; font-size: 14px; font-weight: 700; color: ${BRAND.ink}; }
        .vital-chip-toggle { flex-shrink: 0; width: 24px; height: 24px; border-radius: 7px; border: none; background: ${BRAND.purpleFaint}; color: ${BRAND.purpleDark}; font-size: 15px; font-weight: 800; line-height: 1; cursor: pointer; display: flex; align-items: center; justify-content: center; }
        .vital-chip-body { padding: 0 10px 10px; }

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
        /* 2026-09-02, Aditi: "the ROM button is not fixed" -- a second,
           dead ".rom-row { display: flex; ... }" rule used to live here,
           left over from an old table-based ROM layout (.rom-table/
           .rom-head/.rom-cell/.rom-move/.rom-input/.rom-deg) that no JSX
           has referenced in a long time. Coming AFTER the real ".rom-row"
           rule above (orthoRegionAssessments.jsx's actual card layout,
           block + rom-row-grid), it silently won the cascade and flexed
           every child of a ROM movement row -- including the expanded
           "Pain quality & end feel" chip rows -- into a squeezed
           side-by-side column instead of stacking normally, which is
           exactly the "collapsible goes off screen, half showing" glitch.
           Removed the whole dead block rather than only the offending
           rule, since none of it is reachable from any component anymore. */
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

        .obj-card { border: 1.5px solid ${BRAND.border}; background: #fff; border-radius: 14px; padding: 12px 14px; margin-bottom: 10px; }
        .obj-card-active { border-color: ${BRAND.purple}; background: ${BRAND.purpleFaint}; }
        .obj-card-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
        .obj-card-badge { font-size: 9.5px; font-weight: 800; letter-spacing: .04em; text-transform: uppercase; color: ${BRAND.gray}; }
        .obj-card-badge-ai { color: ${BRAND.purple}; }
        .obj-card-check { font-size: 10.5px; font-weight: 800; color: ${BRAND.purple}; }
        .obj-card-title { font-weight: 700; font-size: 14px; color: ${BRAND.ink}; display: flex; align-items: center; gap: 6px; }
        /* Small (i) variant, sized to sit inline right next to a test/card
           name -- the full 26px .info-btn reads oversized next to 13-14px
           text. Replaces the old separate "Why?"/"How?" text links: one
           icon opens both, right beside the name it explains. */
        .info-btn-sm { border: 1px solid ${BRAND.purple}; background: ${BRAND.purpleFaint}; color: ${BRAND.purpleDark}; font-size: 10px; font-weight: 700; width: 18px; height: 18px; border-radius: 50%; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; padding: 0; line-height: 1; }
        .obj-card-reason { font-size: 11.5px; color: ${BRAND.gray}; margin-top: 2px; line-height: 1.4; }
        .obj-card-actions { display: flex; align-items: center; gap: 12px; margin-top: 10px; }
        .obj-card-link { border: none; background: none; padding: 0; color: ${BRAND.purpleDark}; font-weight: 700; font-size: 12px; cursor: pointer; font-family: inherit; }
        .obj-card-add { border: 1.5px solid ${BRAND.purple}; background: #fff; color: ${BRAND.purple}; font-weight: 800; font-size: 12px; padding: 6px 12px; border-radius: 20px; cursor: pointer; font-family: inherit; }
        .obj-card-jump { border: none; background: ${BRAND.purple}; color: #fff; font-weight: 800; font-size: 12px; padding: 6px 12px; border-radius: 20px; cursor: pointer; font-family: inherit; }
        .obj-card-remove { border: 1px solid ${BRAND.border}; background: #fff; color: ${BRAND.gray}; width: 26px; height: 26px; border-radius: 50%; cursor: pointer; font-size: 11px; }

        .obj-why-text { font-size: 13px; color: ${BRAND.ink}; line-height: 1.6; margin: 0 0 6px; }
        .obj-what-list { margin: 0 0 4px; padding-left: 18px; font-size: 12.5px; color: ${BRAND.ink}; line-height: 1.7; }
        .obj-how-row { margin-bottom: 12px; }
        .obj-how-label { font-size: 10px; font-weight: 800; letter-spacing: .05em; text-transform: uppercase; color: ${BRAND.purple}; margin-bottom: 3px; }
        .obj-how-val { font-size: 13px; color: ${BRAND.ink}; line-height: 1.5; }
        .obj-steps-list { margin: 0; padding-left: 18px; font-size: 12.5px; color: ${BRAND.ink}; line-height: 1.8; }

        .obj-item-lr { display: flex; align-items: center; gap: 10px; }
        .obj-item-lr-field { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; color: ${BRAND.gray}; }
        .obj-item-lr-field input, .obj-item-lr-field select { width: 64px; border: 1.5px solid ${BRAND.border}; border-radius: 8px; padding: 6px 8px; font-size: 16px; font-family: inherit; text-align: center; }
        .obj-item-unit { font-size: 11px; color: ${BRAND.gray}; }
        .obj-item-side-row { display: flex; gap: 6px; margin-bottom: 8px; }

        /* Collapsed-by-default item row (ItemCardShell) -- replaces every
           named ROM/MMT/Special Test/Observation item always rendering its
           full input widget expanded, which is what made a single
           Suggested Objective step run thousands of px of scroll.
           Three visual states layered on the same shell:
             plain border   -- Suggested, not yet selected
             purple border  -- Selected, awaiting a result
             green border   -- answered AND the result is a finding */
        .obj-item { border: 1.5px solid ${BRAND.border}; background: #fff; border-radius: 12px; margin-bottom: 6px; overflow: hidden; }
        .obj-item-answered { border-color: ${BRAND.purple}; }
        .obj-item-selected { border-color: ${BRAND.purple}; }
        .obj-item-finding { border-color: ${BRAND.green}; background: ${BRAND.greenBg}; }
        .obj-item-row { display: flex; align-items: center; gap: 10px; padding: 10px 12px; cursor: pointer; }
        .obj-item-row-label { flex: 1; min-width: 0; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
        .obj-item-row-name { font-weight: 700; font-size: 13px; color: ${BRAND.ink}; }
        .obj-item-finding .obj-item-row-name { color: #12603A; }
        .obj-item-row-sub { font-size: 11px; color: ${BRAND.gray}; }
        .obj-item-row-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
        .obj-item-row-summary { font-size: 12px; font-weight: 700; color: ${BRAND.purpleDark}; background: ${BRAND.purpleFaint}; padding: 3px 8px; border-radius: 8px; white-space: nowrap; }
        .obj-item-finding .obj-item-row-summary { color: #12603A; background: #fff; }
        .obj-item-chevron { font-size: 12px; color: ${BRAND.grayLight}; transition: transform .15s; }
        .obj-item-chevron.open { transform: rotate(180deg); color: ${BRAND.purple}; }
        .obj-item-body { padding: 0 12px 12px; border-top: 1px solid ${BRAND.border}; padding-top: 10px; }
        .obj-item-select-btn { flex-shrink: 0; border: none; background: ${BRAND.purple}; color: #fff; font-weight: 800; font-size: 11.5px; padding: 7px 12px; border-radius: 20px; cursor: pointer; font-family: inherit; white-space: nowrap; }

        /* Every text/number/select/textarea on this step at >=16px --
           below that, iOS Safari auto-zooms the whole page on focus
           regardless of the viewport's user-scalable=no. Scoped to this
           step (rather than changing .text-input/.textarea globally)
           since those shared classes are also used by pages that weren't
           part of this redesign. Specificity (class + tag) beats the
           shared single-class rules those inputs already carry, so this
           wins regardless of source order. */
        .obj-no-zoom input, .obj-no-zoom select, .obj-no-zoom textarea { font-size: 16px; }

        /* Possible Matches -- horizontal condition-pathway cards above the
           suggested list. Purely informational context (real Phase 0.5
           numbers, tapping never adds/removes anything); restyled from the
           old always-expanded LumbarDifferentialCard rows into a compact
           swipeable row so the reasoning is visible without owning the page. */
        .obj-match-row { display: flex; gap: 6px; overflow-x: auto; padding: 2px 2px 10px; margin-bottom: 4px; scrollbar-width: none; }
        .obj-match-row::-webkit-scrollbar { display: none; }
        /* Compact + a distinct color per card, cycling through a fixed
           6-color palette by list position (2026-09-17, Aditi: "can you
           make it compact and colorful each one should be colorful of
           different color") -- tinted background + matching border/%
           color, so conditions are visually distinguishable at a glance
           instead of every card reading identically until tapped. */
        .obj-match-card { flex: 0 0 auto; min-width: 112px; max-width: 138px; text-align: left; border: 1.5px solid transparent; border-radius: 10px; padding: 7px 9px; cursor: pointer; font-family: inherit; transition: transform .1s, box-shadow .1s; }
        .obj-match-card:active { transform: scale(0.97); }
        .obj-match-pct { display: block; font-size: 14px; font-weight: 800; letter-spacing: -.01em; }
        .obj-match-name { display: block; font-size: 10.5px; font-weight: 700; color: ${BRAND.ink}; margin-top: 1px; line-height: 1.2; }
        .obj-match-card-active { box-shadow: 0 3px 10px rgba(20,10,45,.14); }
        .obj-match-c0 { background: #EFF6FF; } .obj-match-c0 .obj-match-pct { color: #2563EB; } .obj-match-c0.obj-match-card-active { border-color: #2563EB; }
        .obj-match-c1 { background: #ECFDF5; } .obj-match-c1 .obj-match-pct { color: #059669; } .obj-match-c1.obj-match-card-active { border-color: #059669; }
        .obj-match-c2 { background: #FFFBEB; } .obj-match-c2 .obj-match-pct { color: #D97706; } .obj-match-c2.obj-match-card-active { border-color: #D97706; }
        .obj-match-c3 { background: #FDF2F8; } .obj-match-c3 .obj-match-pct { color: #DB2777; } .obj-match-c3.obj-match-card-active { border-color: #DB2777; }
        .obj-match-c4 { background: #F0FDFA; } .obj-match-c4 .obj-match-pct { color: #0D9488; } .obj-match-c4.obj-match-card-active { border-color: #0D9488; }
        .obj-match-c5 { background: #EEF2FF; } .obj-match-c5 .obj-match-pct { color: #4F46E5; } .obj-match-c5.obj-match-card-active { border-color: #4F46E5; }

        /* Objective Assessment subtopic tab bar -- horizontal, scrollable row
           of individual "3D piano key" tiles; the active tile pops up solid
           purple with a raised keycap shadow (2026-09-11, per chat reference:
           "make it piano 3rd button"). Replaces the old all-sections-stacked
           -on-one-page layout with one subtopic shown at a time. */
        /* Neutral resting state, purple reserved for the active tab only
           (2026-09-16, Aditi: "this is too much purple" -- bar background,
           inactive-tab tint and inactive-tab text were all purple on top
           of each other). Matches .region-tab's own gray-resting/
           purple-active convention. */
        .obj-subtopic-bar { position: relative; display: flex; align-items: center; gap: 4px; background: #F6F5FA; border-radius: 18px; padding: 8px; margin: 14px 0 12px; }
        .obj-subtopic-scroll-btn { flex: 0 0 auto; background: transparent; border: none; color: ${BRAND.gray}; font-size: 16px; display: flex; align-items: center; justify-content: center; padding: 4px; cursor: pointer; opacity: 0.6; }
        .obj-subtopic-scroll-btn:active { opacity: 1; }
        .obj-subtopic-tabs { flex: 1; display: flex; align-items: stretch; gap: 6px; overflow-x: auto; scroll-behavior: smooth; scroll-snap-type: x proximity; scrollbar-width: none; padding: 4px calc(50% - 42px); }
        .obj-subtopic-tab { scroll-snap-align: center; }
        .obj-subtopic-tabs::-webkit-scrollbar { display: none; }
        .obj-subtopic-tab { flex: 0 0 auto; display: flex; flex-direction: row; align-items: center; justify-content: center; gap: 5px; padding: 7px 10px; border-radius: 8px; cursor: pointer; border: none; font-family: inherit;
          background: linear-gradient(180deg, #fff, #F7F7F9);
          box-shadow: 0 1px 0 #fff inset, 0 2px 0 rgba(20,10,45,.05), 0 4px 8px rgba(20,10,45,.06);
          transition: transform .12s ease, box-shadow .12s ease; }
        .obj-subtopic-tab i { font-size: 13px; color: ${BRAND.gray}; }
        .obj-subtopic-tab span { font-size: 10.5px; font-weight: 700; color: ${BRAND.gray}; line-height: 1.2; text-align: center; white-space: nowrap; }
        .obj-subtopic-tab-active {
          background: linear-gradient(180deg, #7C5CEA, #5A3FC0);
          transform: translateY(-2px);
          box-shadow: 0 1px 0 rgba(255,255,255,.25) inset, 0 3px 0 #4a339e, 0 6px 12px rgba(76,58,168,.4);
        }
        .obj-subtopic-tab-active i, .obj-subtopic-tab-active span { color: #fff; opacity: 1; }
        .obj-subtopic-page { background: #fff; border: 1px solid ${BRAND.border}; border-radius: 12px; padding: 4px 2px 6px; margin-bottom: 12px; }
        .obj-subtopic-nav { display: flex; justify-content: space-between; gap: 10px; padding: 14px 4px 4px; }
        .obj-subtopic-nav-btn { padding: 9px 16px; border-radius: 9px; font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit; }
        .obj-subtopic-nav-btn.back { border: 1px solid ${BRAND.border}; background: #fff; color: ${BRAND.ink}; }
        .obj-subtopic-nav-btn.next { border: none; background: ${BRAND.purple}; color: #fff; }
        .obj-subtopic-nav-btn:disabled { opacity: 0.4; cursor: default; }

        /* "Suggest probable objective assessment" button (2026-09-10, Aditi:
           "make 3d button and motion graphic when we click on it") — solid
           raised fill + press-in feedback instead of the faint outline
           look, plus a brief "thinking" state (pulsing brain, shimmer
           sweep) between tap and the ranked conditions appearing. */
        /* Glossy/skeuomorphic pick (2026-09-17, Aditi: "3rd" of 5 button-style
           mockups) -- top highlight + darker base + soft drop shadow,
           classic raised-glass button instead of a flat tint. */
        .obj-ai-suggest-btn { background: linear-gradient(180deg, #EDE7FE 0%, #D9CFFB 100%); border: 1px solid #B7A9EE; box-shadow: inset 0 1px 0 rgba(255,255,255,.7), 0 3px 6px rgba(124,58,237,.25); transition: transform .12s ease, box-shadow .12s ease; }
        .obj-ai-suggest-btn:active { transform: scale(0.97); box-shadow: inset 0 1px 0 rgba(255,255,255,.5), 0 1px 3px rgba(124,58,237,.2); }
        .obj-ai-suggest-btn .obj-ai-suggest-title { color: ${BRAND.purpleDark}; }
        .obj-ai-suggest-btn .obj-ai-suggest-sub { color: ${BRAND.purple}; opacity: .8; }
        .obj-ai-suggest-btn .obj-ai-suggest-cta { color: ${BRAND.purpleDark}; }
        @keyframes objAiShimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        .obj-ai-suggest-btn.thinking { background: linear-gradient(90deg, #D9CFFB 0%, #EDE7FE 50%, #D9CFFB 100%); background-size: 200% 100%; animation: objAiShimmer 1s linear infinite; cursor: default; }
        @keyframes objAiPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.22); } }
        .obj-ai-thinking-icon { display: inline-block; animation: objAiPulse .6s ease-in-out infinite; }

        /* Condition-specific assessment module cards — interactive checkboxes */
        .cmod-list { display: flex; flex-direction: column; gap: 8px; margin: 8px 0 12px; }
        .cmod-card { border: 1.5px solid ${BRAND.border}; border-radius: 10px; background: #fff; overflow: hidden; }
        .cmod-card-open { border-color: ${BRAND.purple}; }
        .cmod-header { display: flex; align-items: center; gap: 8px; padding: 10px 12px; width: 100%; border: none; background: none; cursor: pointer; font-family: inherit; text-align: left; }
        .cmod-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
        .cmod-label { flex: 1; font-size: 13px; font-weight: 600; color: ${BRAND.ink}; }
        .cmod-chev { font-size: 16px; color: ${BRAND.grayLight}; transition: transform .15s; }
        .cmod-chev.open { transform: rotate(180deg); }
        .cmod-body { padding: 0 12px 12px; }
        .cmod-detail { font-size: 12.5px; line-height: 1.55; color: ${BRAND.gray}; background: ${BRAND.purpleFaint}; border-left: 3px solid ${BRAND.purple}; border-radius: 6px; padding: 10px 12px; margin-bottom: 10px; }
        .cmod-detail-title { font-size: 10.5px; font-weight: 700; letter-spacing: .06em; color: ${BRAND.purple}; text-transform: uppercase; margin-bottom: 4px; }
        .cmod-checks { display: flex; flex-direction: column; gap: 6px; }
        .cmod-check-row { display: flex; align-items: flex-start; gap: 8px; cursor: pointer; font-size: 13px; color: ${BRAND.ink}; line-height: 1.4; padding: 2px 0; }
        .cmod-checkbox { width: 18px; height: 18px; margin: 0; flex-shrink: 0; accent-color: ${BRAND.purple}; cursor: pointer; border-radius: 3px; }
        .cmod-check-text { flex: 1; padding-top: 1px; }
        .cmod-redirect-btn { width: 100%; padding: 9px 12px; border-radius: 8px; border: 1.5px solid ${BRAND.purple}; background: #fff; color: ${BRAND.purple}; font-size: 12.5px; font-weight: 700; font-family: inherit; cursor: pointer; text-align: center; }
        .cmod-redirect-btn:active { background: ${BRAND.purpleFaint}; }
        .cmod-redirect-done { font-size: 12.5px; font-weight: 600; color: ${BRAND.green}; padding: 4px 0; }
        .cmod-note { font-size: 12px; line-height: 1.5; color: ${BRAND.gray}; }

        /* Findings summary -- collapsible drawer built purely by scanning
           already-answered rom/mmt/specialTests/observation data for a
           positive/abnormal/recorded result; no separate state to keep in sync. */
        .obj-findings-toggle { display: flex; align-items: center; justify-content: space-between; width: 100%; border: none; background: ${BRAND.greenBg}; color: #12603A; border-radius: 10px; padding: 9px 12px; margin-bottom: 14px; cursor: pointer; font-weight: 700; font-size: 12.5px; font-family: inherit; }
        .obj-findings-toggle .obj-findings-chev { transition: transform .15s; }
        .obj-findings-toggle.open .obj-findings-chev { transform: rotate(180deg); }
        .obj-findings-drawer { display: flex; flex-direction: column; gap: 6px; margin: -8px 0 14px; padding: 0 2px; }
        .obj-findings-drawer div { font-size: 12.5px; color: ${BRAND.ink}; }
        .obj-findings-drawer b { color: #12603A; margin-right: 4px; }
        .obj-findings-empty { font-size: 12px; color: ${BRAND.grayLight}; margin: -8px 0 14px; padding: 0 2px; }

        /* Sticky Selected tray -- appears once anything has been selected on
           this step; View Assessment swaps the step into review mode inline
           (same component, no extra wizard step) so only selected items and
           the findings that came from them are shown. */
        .obj-tray { position: sticky; bottom: 0; left: 0; right: 0; display: flex; align-items: center; gap: 12px; background: #fff; border: 1.5px solid ${BRAND.border}; border-radius: 16px; padding: 10px 14px; margin: 16px 0; box-shadow: 0 12px 28px -14px rgba(20,10,45,.28); }
        .obj-tray-info { flex: 1; min-width: 0; }
        .obj-tray-count { font-weight: 800; font-size: 13px; color: ${BRAND.ink}; }
        .obj-tray-chips { display: flex; gap: 5px; margin-top: 4px; overflow: hidden; white-space: nowrap; }
        .obj-tray-chip { font-size: 10.5px; font-weight: 700; color: ${BRAND.gray}; background: ${BRAND.purpleFaint}; padding: 3px 8px; border-radius: 999px; white-space: nowrap; }
        .obj-tray-cta { flex-shrink: 0; border: none; background: ${BRAND.purple}; color: #fff; font-weight: 800; font-size: 12.5px; padding: 11px 16px; border-radius: 12px; cursor: pointer; font-family: inherit; }

        .obj-review-head { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
        .obj-review-back { border: none; background: none; color: ${BRAND.purple}; font-weight: 700; font-size: 13px; padding: 0; cursor: pointer; font-family: inherit; }
        .obj-review-findings { background: ${BRAND.greenBg}; border-radius: 12px; padding: 14px 14px 10px; margin: 14px 0 20px; }
        .obj-review-findings h4 { margin: 0 0 8px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .05em; color: #12603A; }
        .obj-review-findings div { font-size: 12.5px; color: ${BRAND.ink}; margin-bottom: 6px; }
        .obj-review-findings b { color: #12603A; margin-right: 4px; }
        .obj-review-done { width: 100%; margin: 8px 0 24px; border: none; background: ${BRAND.purple}; color: #fff; font-weight: 800; font-size: 13.5px; padding: 13px; border-radius: 12px; cursor: pointer; font-family: inherit; }

        .review-row { width: 100%; display: flex; align-items: center; gap: 10px; border: none; background: transparent; border-top: 1px solid #F5F3FB; padding: 10px 2px; cursor: pointer; text-align: left; font-size: 13.5px; color: ${BRAND.ink}; }
        .review-row:first-child { border-top: none; }
        .review-row-label { flex: 1; }
        .review-row-edit { font-size: 11px; color: ${BRAND.purple}; font-weight: 700; }

        .picker-grid { display: flex; flex-direction: column; gap: 10px; }
        .picker-card { display: flex; align-items: center; gap: 14px; border: 1.5px solid ${BRAND.border}; border-radius: 16px; padding: 14px; background: #fff; cursor: pointer; text-align: left; transition: all .15s; width: 100%; }
        .picker-card:active { transform: scale(0.98); }
        .picker-card.selected { border-color: ${BRAND.purple}; background: ${BRAND.purpleFaint}; }
        .picker-card-ai { border: 1.5px solid ${BRAND.purple}; background: linear-gradient(135deg, ${BRAND.purpleFaint}, #fff 70%); }
        .picker-icon { font-size: 24px; width: 40px; text-align: center; flex-shrink: 0; }
        /* Tabler-glyph variant (2026-09-16, Aditi: "the ortho still have
           emoji... make it like svg") -- a purple circle badge instead of
           a bare emoji character, same slot in the row. */
        .picker-icon-glyph { height: 40px; border-radius: 11px; background: ${BRAND.purpleFaint}; display: flex; align-items: center; justify-content: center; font-size: 20px; color: ${BRAND.purple}; }
        .picker-label { font-weight: 700; font-size: 15px; }
        .picker-desc { font-size: 12px; color: ${BRAND.gray}; margin-top: 1px; }
        .writein-card { margin-top: 10px; border-style: dashed; border-color: ${BRAND.purple}; }
        .writein-card.selected { border-style: solid; }

        /* Compact 2-up tile grid -- treatment-type pickers (Exercise
           Prescription's category tiles, Add Treatment's "TREATMENT TYPES")
           (2026-09-16, Aditi: "you have presented this way [the chat mockup],
           it should be this way" -- these used to reuse .picker-grid, which
           is a single stacked column meant for the big Pathway/Condition
           cards, not a real 2-column grid). Raised "3D" card: a soft resting
           shadow that flattens under :active for tactile press feedback. */
        .tile-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .tile-card {
          display: flex; flex-direction: column; align-items: flex-start; gap: 4px; text-align: left;
          padding: 12px; border-radius: 14px; border: 1px solid ${BRAND.border}; background: #fff;
          cursor: pointer; font-family: inherit; width: 100%;
          box-shadow: 0 2px 0 rgba(20,10,45,.06), 0 1px 5px rgba(20,10,45,.07);
          transition: transform .08s ease, box-shadow .08s ease;
        }
        .tile-card:active { transform: translateY(1px) scale(.97); box-shadow: 0 0 0 rgba(0,0,0,0); }
        .tile-card.selected { border-color: ${BRAND.purple}; background: ${BRAND.purpleFaint}; box-shadow: 0 2px 0 rgba(124,58,237,.14), 0 1px 5px rgba(124,58,237,.16); }
        .tile-card-icon { font-size: 18px; color: ${BRAND.purple}; }
        .tile-card-label { font-weight: 700; font-size: 13px; color: ${BRAND.ink}; line-height: 1.25; }
        .tile-card.selected .tile-card-label { color: ${BRAND.purpleDark}; }
        .tile-card-desc { font-size: 11px; color: ${BRAND.gray}; }

        /* Compact "3D" source-picker row (General Library / Evidence-Based
           Protocol / My Clinic Protocol) -- replaces the old chunky
           solid-fill-when-active SourceTab with the same raised-card +
           press-flattens language as .tile-card above, just sized for a
           3-across row (2026-09-16, Aditi: "make these three buttons very
           beautiful 3D but smaller... motion clicking"). */
        .source-tab {
          flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px;
          text-align: center; padding: 8px 4px; border-radius: 12px; cursor: pointer; font-family: inherit; min-width: 0;
          border: 1px solid ${BRAND.border}; background: #fff;
          box-shadow: 0 2px 0 rgba(20,10,45,.06), 0 1px 5px rgba(20,10,45,.07);
          transition: transform .08s ease, box-shadow .08s ease;
        }
        .source-tab:active { transform: translateY(1px) scale(.96); box-shadow: 0 0 0 rgba(0,0,0,0); }
        .source-tab.active { border-color: ${BRAND.purple}; background: ${BRAND.purpleFaint}; box-shadow: 0 2px 0 rgba(124,58,237,.16), 0 1px 5px rgba(124,58,237,.18); }
        .source-tab-icon { font-size: 15px; }
        .source-tab-label { font-weight: 700; font-size: 10px; line-height: 1.2; color: ${BRAND.ink}; }
        .source-tab.active .source-tab-label { color: ${BRAND.purpleDark}; }
        .source-tab-sub { font-size: 8px; font-weight: 800; letter-spacing: .2px; color: ${BRAND.purple}; }

        /* AI-assisted entry's 5-stage journey indicator (Subjective / Region
           / AI / Objective / Summary) -- shown on the pre-wizard Subjective
           and Region screens so a student new to the app can see the whole
           path ahead instead of wondering what comes after "Continue". */
        /* Fix: "DEMOGRAPHICS"/"AI OBJECTIVE" are wider than a 40px column --
           with white-space:nowrap + align-items:center on the parent, each
           label's own box rendered wider than its column and got centered
           on top of it, overflowing evenly left/right. For the first stage
           that left overflow ran past the screen edge and got clipped (the
           "cutting the d" report); for every stage the overflow silently
           overlapped the neighboring dot/line, so a tap could land on that
           non-interactive overlap instead of the actual button underneath
           it (2026-09-16, Aditi: labels clipped AND dots not jumping --
           same root cause). Wrapping to 2 lines inside a fixed max-width
           keeps every label's real box within its own column, so nothing
           overflows or overlaps a neighbor. */
        /* AI journey strip -- deliberately its own palette (deep ink +
           champagne-gold accent), not the app's purple, so this reads as a
           distinct "AI-guided" progress indicator rather than one more
           purple bar (2026-09-16, Aditi: "dnt make it purple"). */
        .ai-journey-dots {
          display: flex; align-items: flex-start; margin: 6px 0 20px;
          padding: 10px 10px 12px; border-radius: 14px;
          background: linear-gradient(155deg, #FCFAF6 0%, #F6F1E7 100%);
          box-shadow: inset 0 0 0 1px rgba(184,141,87,0.18);
        }
        .ai-journey-step { display: flex; flex-direction: column; align-items: center; gap: 6px; flex-shrink: 0; width: 56px; }
        .ai-journey-dot {
          width: 11px; height: 11px; border-radius: 50%; background: #fff;
          box-shadow: inset 0 0 0 1.5px #DCD3C0; transition: all .2s cubic-bezier(.2,.8,.3,1); flex-shrink: 0;
          position: relative;
        }
        .ai-journey-dot.done {
          background: linear-gradient(145deg, #C9A15B, #8C6D3F); box-shadow: none;
        }
        .ai-journey-dot.done::after {
          content: "✓"; position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
          font-size: 7px; font-weight: 900; color: #fff;
        }
        .ai-journey-dot.active {
          background: radial-gradient(circle at 35% 30%, #E4C486, #B8863F);
          box-shadow: 0 0 0 4px rgba(184,141,87,0.22), 0 2px 6px rgba(140,109,63,0.35);
          transform: scale(1.25);
        }
        .ai-journey-label { font-size: 8.5px; color: #9A9082; font-weight: 700; white-space: normal; text-transform: uppercase; letter-spacing: .04em; text-align: center; line-height: 1.2; max-width: 56px; }
        .ai-journey-label.active { color: #7A5E2E; font-weight: 800; }
        .ai-journey-label-btn { font-size: 8.5px; color: #8C6D3F; font-weight: 700; white-space: normal; text-transform: uppercase; letter-spacing: .04em; text-align: center; line-height: 1.2; max-width: 56px; background: none; border: none; padding: 0; cursor: pointer; text-decoration: underline; text-decoration-color: transparent; }
        .ai-journey-label-btn:active { text-decoration-color: currentColor; }
        .ai-journey-line { flex: 1; height: 1.5px; background: #E4DCC9; margin: 5px 2px 0; border-radius: 1px; }
        .ai-journey-line.done { background: linear-gradient(90deg, #C9A15B, #8C6D3F); }

        /* AI-assisted entry's Subjective landing -- two equal-weight cards
           (AI Parse / Manual) instead of an always-open panel + a throwaway
           "skip" link, so both paths read as real, intentional choices. */
        .ai-choice-grid { display: flex; flex-direction: column; gap: 12px; margin-top: 4px; }
        .ai-choice-card { display: flex; align-items: center; gap: 12px; border: 1.5px solid ${BRAND.border}; border-radius: 16px; padding: 16px; background: #fff; cursor: pointer; text-align: left; width: 100%; transition: all .15s; }
        .ai-choice-card:active { transform: scale(0.98); }
        .ai-choice-card.ai-choice-primary { border-color: ${BRAND.purple}; background: linear-gradient(135deg, ${BRAND.purpleFaint}, #fff 70%); }
        .ai-choice-icon { font-size: 26px; width: 42px; text-align: center; flex-shrink: 0; }
        .ai-choice-body { flex: 1; min-width: 0; }
        .ai-choice-title { font-weight: 700; font-size: 15px; color: ${BRAND.ink}; }
        .ai-choice-desc { font-size: 12.5px; color: ${BRAND.gray}; margin-top: 2px; line-height: 1.4; }
        .ai-choice-cta { font-weight: 700; font-size: 13px; color: ${BRAND.purple}; flex-shrink: 0; white-space: nowrap; }

        /* AI-assisted entry's "Summary" stage (Problem List/Goals/Treatment/
           Sessions/Progress/Techniques/Exercise Rx/Home Protocol/Final
           Review) -- a non-linear pill nav instead of forced Next-Next-Next,
           so every item is reachable from every other one. */
        .ai-hub-nav { display: flex; gap: 8px; overflow-x: auto; padding: 2px 2px 12px; margin: -2px -2px 4px; scrollbar-width: none; -ms-overflow-style: none; }
        .ai-hub-nav::-webkit-scrollbar { display: none; }
        .ai-hub-pill { flex: 0 0 auto; border: 1.5px solid ${BRAND.border}; background: #fff; color: ${BRAND.gray}; font-weight: 600; font-size: 12.5px; padding: 8px 14px; border-radius: 999px; cursor: pointer; white-space: nowrap; }
        .ai-hub-pill.visited { border-color: #D7CFF5; color: ${BRAND.ink}; }
        .ai-hub-pill.active { border-color: ${BRAND.purple}; background: ${BRAND.purple}; color: #fff; }

        .summary-card { border: 1.5px solid ${BRAND.border}; border-radius: 14px; padding: 12px 14px; margin-bottom: 12px; cursor: pointer; text-align: left; width: 100%; background: #fff; }
        .summary-title { font-weight: 700; font-size: 15px; color: ${BRAND.ink}; margin-bottom: 8px; display: flex; align-items: center; gap: 6px; }
        .summary-row { display: flex; gap: 8px; font-size: 14px; padding: 4px 0; border-top: 1px solid #F5F3FB; }
        .summary-row:first-child { border-top: none; }
        .summary-key { flex: 0 0 42%; color: ${BRAND.gray}; text-transform: capitalize; }
        .summary-val { flex: 1; font-weight: 500; word-break: break-word; color: ${BRAND.ink}; }
        .summary-empty { font-size: 14px; color: ${BRAND.grayLight}; font-style: italic; padding: 4px 0; }
        .summary-group { margin-top: 10px; }
        .summary-group:first-child { margin-top: 0; }
        .summary-group-heading { font-size: 11px; font-weight: 800; letter-spacing: 0.4px; text-transform: uppercase; color: ${BRAND.purple}; margin-bottom: 2px; }

        /* fixed (not sticky) for the same reason as Cardio's identical rule:
           .content/.app-inner don't scroll themselves anymore (see .app-inner
           fix above), so sticky has nothing of its own to stick within --
           fixed pins to the real viewport, sitting directly on top of
           physiom's own fixed bottom nav bar (.pm-bnav). --pm-bnav-h is that
           bar's real measured height (ResizeObserver in AppFull.jsx, already
           includes its own env(safe-area-inset-bottom) padding) -- a plain
           "60px" guess here left a visible gap of the page's grey background
           between the two bars on devices where the guess ran short (looked
           like this bar was "floating" above the tab bar on real iPhones). */
        .bottombar { position: fixed; left: 50%; transform: translateX(-50%); bottom: var(--pm-bnav-h, calc(60px + env(safe-area-inset-bottom))); width: 100%; max-width: 480px; z-index: 25; background: #fff; border-top: 1px solid ${BRAND.border}; padding: 8px 16px calc(8px + env(safe-area-inset-bottom)); display: flex; gap: 10px; }
        .ghost-btn { flex: 0 0 auto; border: 1.5px solid ${BRAND.border}; background: #fff; color: ${BRAND.ink}; padding: 13px 18px; border-radius: 14px; font-weight: 600; font-size: 14px; cursor: pointer; min-height: 46px; }
        .primary-btn {
          flex: 1; border: none; background: linear-gradient(90deg, ${BRAND.purple}, ${BRAND.purpleDark}); color: #fff;
          padding: 14px 18px; border-radius: 14px; font-weight: 700; font-size: 14px; cursor: pointer;
          box-shadow: 0 6px 16px rgba(108,77,255,.28); min-height: 46px;
          position: relative; overflow: hidden;
          transition: transform .1s ease-out, box-shadow .1s ease-out, filter .1s ease-out;
        }
        /* Real press feedback -- depress + flatten shadow + slight darken (ripple itself comes from rippleEffect.js, injected via JS since .primary-btn is duplicated across several independently-loaded modules rather than one shared stylesheet). */
        .primary-btn:active { transform: scale(.97); box-shadow: 0 2px 6px rgba(108,77,255,.22); filter: brightness(.96); }
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
