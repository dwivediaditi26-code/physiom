import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { authenticateAndRateLimit } from '../_lib/rateLimit.js';

// Lets an ADMIN replace a reference photo. The app uploads straight to Cloudinary with an unsigned
// preset (ml_default), and Cloudinary does not allow an unsigned preset to overwrite an existing
// photo -- so "Replace photo" never worked. A signed upload can overwrite. This endpoint checks the
// caller really is an admin (profiles.is_admin, server-side) and only then returns the signature
// for that one photo id. The Cloudinary secret never leaves the server.
//
// Needs two Vercel environment variables: CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://gkhcysvayjrkrufcnqvz.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

let adminClient = null;
function getAdminClient() {
  if (!SERVICE_ROLE_KEY) return null;
  if (!adminClient) adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  return adminClient;
}

// Cloudinary's rule: sort the parameters by name, join as name=value with &, add the secret, SHA-1.
export function signUpload(params, secret) {
  const toSign = Object.keys(params).sort().map((k) => `${k}=${params[k]}`).join('&');
  return crypto.createHash('sha1').update(toSign + secret).digest('hex');
}

// Photo ids look like "c_heart_rate_2" or "physiom_findings/<region>/<category>/<label>".
const PUBLIC_ID = /^[A-Za-z0-9_\-./ ]{1,200}$/;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const userId = await authenticateAndRateLimit(req, res, 'cloudinary-sign');
  if (!userId) return;
  const admin = getAdminClient();
  if (!admin) return res.status(500).json({ error: 'Server misconfigured.' });
  const { data: profile, error } = await admin.from('profiles').select('is_admin').eq('id', userId).maybeSingle();
  if (error || !profile?.is_admin) return res.status(403).json({ error: 'Admin access required.' });

  if (!API_KEY || !API_SECRET) return res.status(501).json({ error: 'not_configured' });
  const publicId = req.body?.public_id;
  if (typeof publicId !== 'string' || !PUBLIC_ID.test(publicId) || publicId.includes('..')) {
    return res.status(400).json({ error: 'Bad photo id.' });
  }
  const timestamp = Math.floor(Date.now() / 1000);
  const params = { invalidate: 'true', overwrite: 'true', public_id: publicId, timestamp };
  return res.status(200).json({ api_key: API_KEY, timestamp, public_id: publicId, signature: signUpload(params, API_SECRET) });
}
