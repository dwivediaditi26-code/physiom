// api/uploadPresign.js
//
// Cloudflare R2 upload (2026-09-21, Aditi: set up R2 for PhysioFeed's post
// composer image/video uploads -- R2 has no egress fees, unlike Supabase
// Storage). R2 is S3-compatible, so this is the standard presigned-PUT-URL
// pattern any S3-compatible store uses: the client asks THIS endpoint for a
// short-lived signed URL, then uploads the file bytes straight to R2, not
// through this function -- a Vercel serverless function has request-size
// and duration limits a multi-MB video would hit, and routing the bytes
// through here would also cost twice the bandwidth for nothing.
//
// Auth: verifies the caller's own Supabase JWT server-side, same
// Bearer-token / admin.auth.getUser(token) check as api/deleteAccount.js.
// An unauthenticated presign endpoint would let anyone mint upload URLs
// into this bucket -- free storage and a spam vector, even though R2 itself
// has no egress cost. Deliberately NOT routed through
// api/_lib/rateLimit.js's authenticateAndRateLimit() -- same reasoning as
// deleteAccount.js: that helper's counters are tuned for Groq API cost and
// log to a table meant for that, not uploads.
//
// Needs five env vars set on Vercel (Project Settings -> Environment
// Variables) AND in a local .env.local for `npm run dev` -- see
// .env.local.example for where each one comes from:
//   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME,
//   R2_PUBLIC_BASE_URL
// Fails with a clear 500 (not a silent/broken upload) when any of these
// are missing, same "real error, not a fake success" rule as every other
// real-write endpoint in this app (see db.js's updateProfile() comments).
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://gkhcysvayjrkrufcnqvz.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'physiofeed-uploads';
// The bucket's public base URL (its r2.dev dev URL, or a custom domain once
// one's attached) -- Cloudflare only shows you this AFTER you enable public
// access on the bucket, so it's a 5th value beyond the 3 R2_* credentials.
// No trailing slash.
const R2_PUBLIC_BASE_URL = process.env.R2_PUBLIC_BASE_URL;

// Whitelist, not "accept anything" -- an upload endpoint that took any
// contentType would let someone stash arbitrary files (executables, huge
// archives) behind what's supposed to be a "physiofeed post image" URL.
// Same formats lib/media.js's validateImageFile/validateVideoFile already
// accept for the Supabase-backed upload path.
const ALLOWED_TYPES = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
  'video/mp4': 'mp4', 'video/quicktime': 'mov', 'video/webm': 'webm',
};
// Matches lib/media.js's MAX_VIDEO_MB (images are already compressed
// client-side to a few hundred KB before this is ever called).
const MAX_BYTES = 100 * 1024 * 1024;

let s3 = null;
function getR2Client() {
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) return null;
  if (!s3) {
    s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
    });
  }
  return s3;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const client = getR2Client();
  if (!client || !R2_PUBLIC_BASE_URL) {
    console.error('uploadPresign: R2 env vars are not fully set on this deployment (need R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_PUBLIC_BASE_URL)');
    return res.status(500).json({ error: 'Uploads are not configured on this deployment yet.' });
  }
  if (!SERVICE_ROLE_KEY) {
    console.error('uploadPresign: SUPABASE_SERVICE_ROLE_KEY env var is not set on this deployment');
    return res.status(500).json({ error: 'Server misconfigured (missing service role key).' });
  }

  // Same inline Supabase-JWT check as api/deleteAccount.js -- see that
  // file's comment for why this doesn't go through getAdminClient() in
  // api/_lib/rateLimit.js instead.
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  const authHeaderRaw = req.headers['authorization'] || req.headers['Authorization'] || '';
  const token = authHeaderRaw.startsWith('Bearer ') ? authHeaderRaw.slice(7).trim() : null;
  if (!token) return res.status(401).json({ error: 'Sign in required.' });
  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData?.user) return res.status(401).json({ error: 'Your session has expired -- please sign in again.' });
  const userId = userData.user.id;

  const { contentType, sizeBytes } = req.body || {};
  const ext = ALLOWED_TYPES[contentType];
  if (!ext) return res.status(400).json({ error: 'Unsupported file type.' });
  if (typeof sizeBytes === 'number' && sizeBytes > MAX_BYTES) {
    return res.status(400).json({ error: `Files must be under ${Math.round(MAX_BYTES / (1024 * 1024))}MB.` });
  }

  // <user-id>/<timestamp>_<random>.<ext> -- same shape db.js's
  // uploadToBucket() already uses for Supabase Storage, so every uploader's
  // files sort into their own "folder" without a client-supplied filename
  // (which could collide, or carry path-traversal characters).
  const key = `${userId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const command = new PutObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key, ContentType: contentType });
  // 5 minutes: long enough for a slow upload to start, short enough that a
  // leaked URL (e.g. in a browser history or proxy log) is useless soon after.
  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 300 });

  return res.status(200).json({ uploadUrl, publicUrl: `${R2_PUBLIC_BASE_URL}/${key}` });
}
