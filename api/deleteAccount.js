// api/deleteAccount.js
//
// Permanently deletes the caller's OWN account. Via the ON DELETE CASCADE
// on patients.user_id -> auth.users(id) (see supabase_rls_setup.sql), this
// also immediately deletes every patient record that account owns -- this
// is what turns the Privacy Policy's "request deletion of your account and
// all associated patient data" line (LegalPages.jsx, section 6) into an
// enforced fact instead of a manual process someone has to remember to run.
//
// Auth: verifies the caller's own Supabase JWT server-side (same
// getUser(token) pattern as api/_lib/rateLimit.js) and deletes ONLY that
// verified user's id -- never a client-supplied id, so there is no way to
// delete someone else's account by tampering with the request body.
//
// Deliberately NOT routed through authenticateAndRateLimit() -- that helper
// also logs every call into the api_calls table for the Groq-cost rate
// limiter, which has nothing to do with this endpoint.
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://gkhcysvayjrkrufcnqvz.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Deletes everything under "<user id>/" in the private patient-files bucket. Returns true when there is
// nothing left (including when the bucket was never set up), false when something could not be removed.
export async function removeAllPatientFiles(admin, userId) {
  const bucket = admin.storage.from('patient-files');
  for (let round = 0; round < 50; round++) { // 50 x 1000 files is far beyond a 5 MB-per-file account
    const { data, error } = await bucket.list(userId, { limit: 1000 });
    if (error) return /not found/i.test(error.message || '') ? true : (console.error('deleteAccount: could not list patient files', userId, error), false);
    if (!data || data.length === 0) return true;
    const { error: removeErr } = await bucket.remove(data.map((o) => `${userId}/${o.name}`));
    if (removeErr) { console.error('deleteAccount: could not remove patient files', userId, removeErr); return false; }
  }
  return false;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!SERVICE_ROLE_KEY) {
    console.error('deleteAccount: SUPABASE_SERVICE_ROLE_KEY env var is not set on this deployment');
    return res.status(500).json({ error: 'Server misconfigured (missing service role key). Account deletion is unavailable right now — please email support instead.' });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const authHeaderRaw = req.headers['authorization'] || req.headers['Authorization'] || '';
  const token = authHeaderRaw.startsWith('Bearer ') ? authHeaderRaw.slice(7).trim() : null;
  if (!token) return res.status(401).json({ error: 'Sign in required.' });

  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData?.user) {
    return res.status(401).json({ error: 'Your session has expired — please sign in again.' });
  }
  const userId = userData.user.id;

  // The files this person attached to patients live in private storage, not in the database, so the
  // cascade below does not reach them. Remove them first; if that fails, stop here rather than
  // delete the account and leave patient documents behind.
  const filesRemoved = await removeAllPatientFiles(admin, userId);
  if (!filesRemoved) {
    return res.status(500).json({ error: 'Could not remove your attached files right now, so your account was not deleted. Please try again or email support.' });
  }

  // Immediate, not a 30-day queued job -- well within the Privacy Policy's
  // stated upper bound on deletion time.
  const { error: deleteErr } = await admin.auth.admin.deleteUser(userId);
  if (deleteErr) {
    console.error('deleteAccount: failed to delete user', userId, deleteErr);
    return res.status(500).json({ error: 'Could not delete your account right now. Please try again or email support.' });
  }

  return res.status(200).json({ deleted: true });
}
