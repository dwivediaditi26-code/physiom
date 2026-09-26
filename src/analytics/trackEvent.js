import { supabase } from '../supabase.js';

// The one centralized place either half of the app (clinical engine or
// PhysioFeed) logs an analytics event. Fire-and-forget: never throws, never
// blocks the caller's real action on logging succeeding. No anonymous
// events for now -- keeps the insert policy (auth.uid() = user_id) simple.
export async function trackEvent(eventName, { entityType, entityId, properties } = {}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from('analytics_events').insert({
      event_name: eventName,
      user_id: user.id,
      entity_type: entityType ?? null,
      entity_id: entityId != null ? String(entityId) : null,
      properties: properties ?? {},
    });
    if (error) throw error;
  } catch (e) {
    console.warn(`trackEvent(${eventName}) failed:`, e?.message || e);
  }
}
