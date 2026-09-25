import { useRef, useEffect } from "react";

// Wires a self-contained assessment wizard's own step (Demographics,
// Subjective, ROM, ...) to the browser's REAL history, so hardware/browser
// Back walks one step at a time instead of exiting the whole wizard in one
// jump (Aditi, 2026-09-22: "when we click on back it takes us to total home
// button ...even if we are in middle of assessment").
//
// AppFull.jsx already drives every top-level screen switch through one
// pushState-backed `navTo(key, ctx)` choke point -- but Ortho/Neuro/Cardio's
// guided wizards are each mounted under a single "opaque" key (e.g.
// "ortho_new_assessment") and manage their OWN 16-ish internal steps with
// plain local useState, so none of that ever reached history: no matter how
// many steps deep, one Back popped straight out of the whole wizard.
//
// This hook doesn't replace the wizard's own step state or its goNext/
// goBack/jumpTo functions -- it just watches whatever step id they land on
// (`stepId`) and mirrors it into a `wizardStep` field on the SAME opaque
// `navTo` key (AppFull.jsx's navTo specifically allows re-pushing when only
// `wizardStep` changes, see its own comment). When the browser instead moves
// FIRST (Back/Forward), it calls `onExternalStep`/`onBeforeFirstStep` with
// the SAME functions the wizard's own StepNav clicks already use (`jumpTo`/
// `onExit`), so this only ever re-triggers already-supported transitions
// from a new source -- it never invents a new one.
export function useWizardStepHistory({ wizardKey, stepId, onNav, navContext, onExternalStep, onBeforeFirstStep }) {
  const lastRef = useRef(null);
  const initializedRef = useRef(false);

  // Local step changed (goNext/goBack/jumpTo/StepNav/...) -> push it.
  useEffect(() => {
    if (!stepId || lastRef.current === stepId) return;
    lastRef.current = stepId;
    onNav?.(wizardKey, { ...navContext, wizardStep: stepId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepId]);

  // Browser moved first (Back/Forward) -> `navContext.wizardStep` prop
  // changes without us having pushed it -- replay through the wizard's own
  // existing jump/exit functions instead of touching step state directly.
  //
  // `navContext` itself goes `undefined` while AppFull.jsx is showing a
  // DIFFERENT tab and just keeping this wizard mounted in the background
  // (2026-09-24, see AppFull.jsx's own deferred-mount comment for
  // ortho_new_assessment/neuro_assessment/cardio_assessment) -- that
  // undefined is indistinguishable from a real `wizardStep` disappearing
  // UNLESS we check for it explicitly: without this guard, merely switching
  // to Learn/PhysioFeed and back looked exactly like "browser Back past the
  // first step" to this effect, wrongly firing onBeforeFirstStep and
  // resetting the wizard to its Setting/Mode picker every time (Aditi,
  // "whatever page I left off it should be on that page"). Skipping the
  // whole check while hidden -- rather than just no-oping on the
  // undefined case -- also leaves `lastRef` untouched, so the matching
  // "shown again" transition still reads as our own echo below.
  useEffect(() => {
    if (navContext === undefined) return;
    const incoming = navContext?.wizardStep || null;
    // Skip the synthetic first run: on mount `incoming` is still whatever
    // AppFull had BEFORE our own first push above lands back down as a prop.
    if (!initializedRef.current) {
      initializedRef.current = true;
      return;
    }
    if (incoming === lastRef.current) return; // our own echo
    lastRef.current = incoming;
    if (incoming) onExternalStep?.(incoming);
    else onBeforeFirstStep?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navContext?.wizardStep]);
}
