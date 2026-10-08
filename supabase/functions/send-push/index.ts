// send-push — sends a web push notification to one user's registered
// devices, or to every registered device when `broadcast: true` is passed
// instead of `user_id` (2026-10-02, for career_news: a new job/conference/
// regulation posting isn't "for" any one user the way a message or
// connection request is, so there's no single `notifications` row to hang
// a trigger off -- the daily cron calls this directly once it finds
// genuinely new rows). Called from server-side/trusted contexts only (this
// function runs with the service role key, so it can read every user's
// subscriptions).
//
// Security (2026-09-29 fix): `verify_jwt: true` on its own only checks
// that SOME valid Supabase JWT was sent -- any signed-in student's own
// token would have passed, and the handler never checked that the caller
// was the same person as `user_id` in the body. That meant any logged-in
// user could push a fake notification to any OTHER user by id. Fixed by
// requiring the caller's JWT to have role='service_role' -- only
// server-side callers (a DB trigger using the service role key, see
// supabase/add_push_notification_trigger.sql) can invoke this now, never
// a browser using its own session.
//
// Deploy: supabase functions deploy send-push --no-verify-jwt
// (--no-verify-jwt is what lets the newer sb_secret_ key through; the check in
// isServiceCaller below is what keeps everyone else out.)
// Secrets required (set once via the Supabase dashboard or CLI, never
// committed to the repo):
//   supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:you@example.com
//
// Invoke (service role only):
//   POST /functions/v1/send-push
//   Authorization: Bearer <service_role_key>
//   { "user_id": "...", "title": "...", "body": "...", "url": "/optional/deep-link" }
//   or, to every registered device instead of one user's:
//   { "broadcast": true, "title": "...", "body": "...", "url": "/optional/deep-link" }
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3";

// Who may call this: server code that holds the project's service key -- the
// Vercel API routes and the database trigger. The key can be the older long
// service_role JWT (eyJ...) or the newer secret key (sb_secret_...); the newer
// one is not a JWT at all, so the platform's own JWT check has to be off for
// it (deploy with --no-verify-jwt) and this function checks the caller itself.
//
// The check is "can this key do something only a service key can": list users
// through the admin API. Supabase verifies the key for that, so a forged token
// or the public anon key fails. It deliberately does NOT decode the token and
// read its `role` -- with the platform check off, nothing has verified that
// token's signature, so anyone could write a token that says service_role.
function callerToken(req: Request): string {
  const auth = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  return auth || (req.headers.get("apikey") || "").trim();
}

async function isServiceCaller(token: string): Promise<boolean> {
  if (!token) return false;
  try {
    const probe = createClient(SUPABASE_URL, token, { auth: { persistSession: false, autoRefreshToken: false } });
    const { error } = await probe.auth.admin.listUsers({ page: 1, perPage: 1 });
    return !error;
  } catch {
    return false;
  }
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:support@physiomindapp.com";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const token = callerToken(req);
  if (!(await isServiceCaller(token))) {
    return new Response(JSON.stringify({ error: "Forbidden -- service role only" }), { status: 403 });
  }

  let payload: { user_id?: string; title?: string; body?: string; url?: string; broadcast?: boolean };
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400 });
  }

  const { user_id, title, body, url, broadcast } = payload;
  if (!title || (!user_id && !broadcast)) {
    return new Response(JSON.stringify({ error: "title and (user_id or broadcast) are required" }), { status: 400 });
  }

  // The caller's own key (already shown above to be a service key) -- works the
  // same whichever key style the project uses.
  const supabase = createClient(SUPABASE_URL, token);
  const subsQuery = supabase.from("push_subscriptions").select("id, endpoint, p256dh, auth");
  const { data: subs, error } = broadcast ? await subsQuery : await subsQuery.eq("user_id", user_id);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
  if (!subs || subs.length === 0) {
    return new Response(JSON.stringify({ sent: 0, note: broadcast ? "no subscriptions registered" : "no subscriptions for this user" }), { status: 200 });
  }

  const notificationPayload = JSON.stringify({ title, body: body || "", url: url || "/" });

  const results = await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        notificationPayload,
      ).catch(async (err) => {
        // 404/410 means the browser unregistered this subscription (app
        // uninstalled, permission revoked) — the endpoint is dead forever,
        // so clean it up now rather than retrying it on every future push.
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        }
        throw err;
      })
    )
  );

  const sent = results.filter((r) => r.status === "fulfilled").length;
  // Why a device was refused (e.g. 403 = the app's push key does not match the
  // one this phone registered with), so a failed test can say so.
  const failed = results
    .filter((r): r is PromiseRejectedResult => r.status === "rejected")
    .slice(0, 3)
    .map((r) => ({ status: r.reason?.statusCode ?? null, body: String(r.reason?.body ?? r.reason?.message ?? "").slice(0, 200) }));
  return new Response(JSON.stringify({ sent, total: subs.length, ...(failed.length ? { failed } : {}) }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
