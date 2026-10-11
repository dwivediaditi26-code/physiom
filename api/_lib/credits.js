// api/_lib/credits.js
//
// AI credits for the paragraph box ("Fill in a paragraph" -> Generate with AI). The balance lives in
// Supabase (supabase/add_ai_credits.sql); this file only calls its server-side functions with the
// service key, so the browser can never change a balance.
//
// Order of events in api/parse.js:
//   1. reserveGeneration()  takes 1 credit BEFORE the AI is called (two taps at once cannot both get
//                           through on one credit), or says there are none left;
//   2. the AI runs;
//   3. completeGeneration() if it answered, refundGeneration() if it did not -- so a failed
//                           generation never costs a credit.
// The same request id is never charged twice (a retry after a lost reply is free).
//
// Before the SQL has been run, the functions do not exist: then credits are simply off
// (enabled: false) and the endpoint works as it always did. Any OTHER error fails closed.

import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://gkhcysvayjrkrufcnqvz.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

let client = null;
function getClient() {
  if (!SERVICE_ROLE_KEY) return null;
  if (!client) client = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  return client;
}

// Postgres / PostgREST say "the function is not there" in a few ways.
export function functionMissing(error) {
  if (!error) return false;
  return error.code === 'PGRST202' || error.code === '42883' || /could not find the function|function .* does not exist/i.test(error.message || '');
}

// The id the browser sends for one tap of Generate; anything odd gets a fresh one.
export function cleanRequestId(value) {
  const v = Array.isArray(value) ? value[0] : value;
  return typeof v === 'string' && /^[A-Za-z0-9_-]{8,100}$/.test(v) ? v : crypto.randomUUID();
}

// -> { enabled, ok, reason?, balance?, unlimited? }
export async function reserveGeneration(userId, requestId, db = getClient()) {
  if (!db) return { enabled: false, ok: true };
  const { data, error } = await db.rpc('ai_reserve_generation', { p_user: userId, p_request_id: requestId });
  if (functionMissing(error)) return { enabled: false, ok: true };
  if (error) {
    console.error('credits: reserve failed', error);
    return { enabled: true, ok: false, reason: 'error' };
  }
  return { enabled: true, ok: !!data?.ok, reason: data?.reason, balance: data?.balance, unlimited: !!data?.unlimited };
}

export async function completeGeneration(userId, requestId, db = getClient()) {
  if (!db) return;
  const { error } = await db.rpc('ai_complete_generation', { p_user: userId, p_request_id: requestId });
  if (error && !functionMissing(error)) console.error('credits: complete failed', error);
}

// -> balance after the refund, or undefined
export async function refundGeneration(userId, requestId, db = getClient()) {
  if (!db) return undefined;
  const { data, error } = await db.rpc('ai_refund_generation', { p_user: userId, p_request_id: requestId });
  if (error) {
    if (!functionMissing(error)) console.error('credits: REFUND FAILED -- credit may need to be given back by hand', { userId, requestId, error });
    return undefined;
  }
  return data?.balance;
}
