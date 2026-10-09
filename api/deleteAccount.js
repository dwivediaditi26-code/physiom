// api/deleteAccount.js
//
// Permanently deletes the caller's OWN account. Via the ON DELETE CASCADE
// on patients.user_id -> auth.users(id) (see supabase_rls_setup.sql), this
// also immediately deletes every patient record that account owns -- this
// is what turns the Privacy Policy's "request deletion of your account and
// all associated patient data" line (LegalPages.jsx, section 6) into an
// enforced fact instead of a manual process someone has to remember to run.
//
// Password: the request must carry the account's own password, checked HERE
// on the server (a fresh sign-in with the caller's verified email), so a
// stolen or left-open session cannot delete an account without it. The
// browser dialog asks for it, but the check does not depend on the browser.
//
// Uploaded files: database rows cascade, but files in Supabase Storage (post
// photos/videos, profile pictures, CVs ...) do not. They are erased here
// first, from the caller's own folder `<userId>/` in every media bucket
// (src/physiofeed/data/mediaStorage.js: putMedia() always writes there). If
// that fails the account is NOT deleted and the person is told to retry, so
// the Privacy Policy's "your files are erased with your account" stays true.
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
// Public (publishable) key, same fallback src/supabase.js and cloudinarySign.js use.
const SUPABASE_PUBLIC_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_v-dPE6_pd7a88gOFVuoDag_DmLUbgrT';

// Every bucket putMedia() can write to. Keep in step with BUCKET_LIMIT_MB in
// src/physiofeed/data/mediaStorage.js (a test fails if they drift apart).
export const MEDIA_BUCKETS = ['post-images', 'profile-images', 'opportunity-covers', 'post-videos', 'post-documents', 'resumes'];

const PAGE = 100;
const MAX_PAGES = 200; // 20,000 files per bucket -- a stop so a stuck loop can never run forever

const isBucketMissing = (err) => /not found/i.test(err?.message || '') || String(err?.statusCode || err?.status) === '404';

// Erases every file in `<userId>/` of every media bucket. Throws if any file
// cannot be listed or removed. A bucket that does not exist has no files.
export async function removeUserFiles(admin, userId) {
  for (const bucket of MEDIA_BUCKETS) {
    const store = admin.storage.from(bucket);
    for (let page = 0; page < MAX_PAGES; page++) {
      const { data: files, error: listErr } = await store.list(userId, { limit: PAGE, offset: 0 });
      if (listErr) {
        if (isBucketMissing(listErr)) break;
        throw new Error(`list ${bucket}: ${listErr.message}`);
      }
      if (!files || files.length === 0) break;
      const { data: removed, error: removeErr } = await store.remove(files.map((f) => `${userId}/${f.name}`));
      if (removeErr) throw new Error(`remove ${bucket}: ${removeErr.message}`);
      if (!removed || removed.length === 0) throw new Error(`remove ${bucket}: nothing was removed`);
    }
  }
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

  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!password) {
    return res.status(400).json({ error: 'Enter your password to delete your account.', code: 'password_required' });
  }
  const email = userData.user.email;
  if (!email) {
    return res.status(400).json({ error: 'This account has no email address to check your password against. Please email support.' });
  }
  // A throwaway client: signing in on it changes nothing about the caller's own session.
  const verifier = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: signedIn, error: pwErr } = await verifier.auth.signInWithPassword({ email, password });
  if (pwErr || signedIn?.user?.id !== userId) {
    return res.status(403).json({ error: 'That password is not correct.', code: 'wrong_password' });
  }

  try {
    await removeUserFiles(admin, userId);
  } catch (e) {
    console.error('deleteAccount: could not erase uploaded files for', userId, e);
    return res.status(500).json({ error: 'Could not remove your uploaded files right now, so your account was not deleted. Please try again or email support.' });
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
