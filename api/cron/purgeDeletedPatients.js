// api/cron/purgeDeletedPatients.js
//
// Permanently erases patient records that a clinician deleted more than 30
// days ago. Deleting a patient in the app only hides the record
// (patients.deleted_at, see supabase/soft_delete_patients.sql) so a misclick
// can be undone; this is the second half that makes the Privacy Policy's
// "erased within 30 days" true instead of leaving hidden records forever.
//
// Only rows that were already deleted by their owner AND are older than the
// grace period are touched -- a live patient (deleted_at is null) can never
// match. Runs with the service role key because patients has no delete policy
// for other callers on purpose.
//
// Trigger: Vercel Cron (see vercel.json "crons"), once daily. Like the other
// cron job it is protected by CRON_SECRET (Vercel sends `Authorization:
// Bearer $CRON_SECRET` automatically for a configured cron job).
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://gkhcysvayjrkrufcnqvz.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const GRACE_DAYS = 30;

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const authHeader = req.headers['authorization'] || '';
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (!SERVICE_ROLE_KEY) {
    console.error('purgeDeletedPatients: SUPABASE_SERVICE_ROLE_KEY not set on this deployment');
    return res.status(500).json({ error: 'Server misconfigured.' });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  const cutoff = new Date(Date.now() - GRACE_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await admin
    .from('patients')
    .delete()
    .not('deleted_at', 'is', null)
    .lt('deleted_at', cutoff)
    .select('id');

  if (error) {
    console.error('purgeDeletedPatients: delete failed', error);
    return res.status(500).json({ error: 'Purge failed.' });
  }
  return res.status(200).json({ purged: data?.length ?? 0, olderThan: cutoff });
}
