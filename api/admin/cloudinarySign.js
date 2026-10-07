import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

// Lets an ADMIN replace a reference photo. The app uploads straight to Cloudinary with an unsigned
// preset (ml_default), and Cloudinary does not allow an unsigned preset to overwrite an existing
// photo -- so "Replace photo" never worked. A signed upload can overwrite. This endpoint checks the
// caller really is an admin (profiles.is_admin, server-side) and only then returns the signature
// for that one photo id. The Cloudinary secret never leaves the server.
//
// The admin check uses the caller's OWN login (Supabase verifies the token) and the public
// (publishable) key, so it needs no Supabase service-role secret. Profiles are publicly readable
// (policy profiles_select_all), so reading the is_admin flag works with the public key.
//
// Needs two Vercel environment variables: CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://gkhcysvayjrkrufcnqvz.supabase.co';
// The same public key the app itself ships in its code (src/supabase.js); not a secret.
const SUPABASE_PUBLIC_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_v-dPE6_pd7a88gOFVuoDag_DmLUbgrT';
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

let publicClient = null;
function getPublicClient() {
  if (!publicClient) publicClient = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  return publicClient;
}

// A few signatures a minute per person is plenty for tapping Replace photo.
const recent = new Map();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 30;
function tooMany(userId) {
  const now = Date.now();
  const hits = (recent.get(userId) || []).filter((t) => now - t < WINDOW_MS);
  hits.push(now);
  recent.set(userId, hits);
  return hits.length > MAX_PER_WINDOW;
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

  const authHeader = req.headers['authorization'] || req.headers['Authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  if (!token) return res.status(401).json({ error: 'Sign in required.' });
  const client = getPublicClient();
  const { data: userData, error: userErr } = await client.auth.getUser(token);
  if (userErr || !userData?.user) return res.status(401).json({ error: 'Your session has expired -- please sign in again.' });
  const userId = userData.user.id;
  if (tooMany(userId)) return res.status(429).json({ error: 'Too many requests -- wait a moment.' });
  const { data: profile, error } = await client.from('profiles').select('is_admin').eq('id', userId).maybeSingle();
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
