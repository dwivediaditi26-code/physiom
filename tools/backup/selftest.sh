#!/bin/bash
# Checks backup-database.sh with stand-in pg_dump / pg_restore programs.
# No database is touched and nothing outside a temporary folder is written.
#   bash tools/backup/selftest.sh
set -uo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
SCRIPT="$HERE/backup-database.sh"
T="$(mktemp -d)"
trap 'rm -rf "$T"' EXIT
mkdir -p "$T/bin" "$T/home"
PASS=0; FAILS=0

cat > "$T/bin/pg_dump" <<'STUB'
#!/bin/bash
if [ "${1:-}" = "--version" ]; then echo "pg_dump (stand-in) 17.0"; exit 0; fi
for a in "$@"; do case "$a" in --file=*) f="${a#--file=}";; esac; done
if [ -n "${FAKE_DUMP_FAIL:-}" ]; then echo "connection to server failed for postgresql://u:SECRET123@host" >&2; exit 1; fi
if [ -n "${FAKE_DUMP_EMPTY:-}" ]; then : > "$f"; exit 0; fi
printf 'FAKE-DUMP-CONTENT\n' > "$f"
STUB
cat > "$T/bin/pg_restore" <<'STUB'
#!/bin/bash
if [ -n "${FAKE_NO_PATIENTS:-}" ]; then echo "100; 0 1 TABLE DATA public profiles postgres"; exit 0; fi
echo "100; 0 1 TABLE DATA public patients postgres"
echo "101; 0 2 TABLE DATA public profiles postgres"
STUB
cat > "$T/bin/psql" <<'STUB'
#!/bin/bash
if [ -n "${FAKE_PSQL_FAIL:-}" ]; then echo 'password authentication failed for "u" (postgresql://u:Secret1@host)' >&2; exit 2; fi
echo 1
STUB
chmod +x "$T/bin/pg_dump" "$T/bin/pg_restore" "$T/bin/psql"

write_config() { # keep, url
  cat > "$T/config" <<CONF
DATABASE_URL="$2"
BACKUP_DIR="$T/out"
KEEP=$1
CONF
}
run() {
  env HOME="$T/home" PM_BACKUP_CONFIG="$T/config" PG_DUMP="$T/bin/pg_dump" PG_RESTORE="$T/bin/pg_restore" PSQL="$T/bin/psql" \
      NOTIFY=0 PM_BACKUP_PASSPHRASE="${PASSPHRASE:-correct horse}" "$@" /bin/bash "$SCRIPT" ${ARGS:-} 2>&1
}
check() { # description, condition (0 = ok)
  if [ "$2" -eq 0 ]; then PASS=$((PASS+1)); echo "  ok    $1"; else FAILS=$((FAILS+1)); echo "  FAIL  $1"; fi
}
count_backups() { ls -1 "$T/out"/physiomind-*.tar.enc 2>/dev/null | wc -l | tr -d ' '; }

URL="postgresql://postgres.abc:SECRET123@host:5432/postgres"

echo "A normal backup"
write_config 30 "$URL"
out="$(run env)"; rc=$?
check "exits cleanly" $rc
check "saves exactly one file" $([ "$(count_backups)" = "1" ]; echo $?)
f="$(ls -1 "$T/out"/physiomind-*.tar.enc)"
check "file is not readable as plain text" $(grep -q "FAKE-DUMP-CONTENT" "$f"; [ $? -ne 0 ]; echo $?)
check "no unfinished .partial file left" $([ -z "$(ls "$T/out" | grep partial)" ]; echo $?)
check "file is private (600)" $([ "$(stat -f %Lp "$f")" = "600" ]; echo $?)
out="$(ARGS=--check run env)"; rc=$?
check "--check opens it with the right password" $rc
check "--check lists the patients table" $(grep -q "public.patients" <<< "$out"; echo $?)
out="$(PASSPHRASE='wrong password' ARGS=--check run env)"; rc=$?
check "--check refuses a wrong password" $([ $rc -ne 0 ]; echo $?)

echo "Keeping only the newest copies"
write_config 2 "$URL"
for i in 1 2 3; do sleep 1; run env >/dev/null; done
check "keeps only 2 files" $([ "$(count_backups)" = "2" ]; echo $?)

echo "Things going wrong"
before="$(count_backups)"
out="$(run env FAKE_DUMP_FAIL=1)"; rc=$?
check "a failed database read exits with an error" $([ $rc -ne 0 ]; echo $?)
check "the database password is never printed" $(grep -q "SECRET123" <<< "$out"; [ $? -ne 0 ]; echo $?)
check "no new file after a failed read" $([ "$(count_backups)" = "$before" ]; echo $?)
check "the failure is written to the log" $(grep -q "FAILED" "$T/out/backup.log"; echo $?)
out="$(run env FAKE_DUMP_EMPTY=1)"; rc=$?
check "an empty copy is refused" $([ $rc -ne 0 ]; echo $?)
out="$(run env FAKE_NO_PATIENTS=1)"; rc=$?
check "a copy without the patients table is refused" $([ $rc -ne 0 ]; echo $?)
check "still no new file" $([ "$(count_backups)" = "$before" ]; echo $?)
write_config 30 "postgresql://postgres.abc:[YOUR-PASSWORD]@host:5432/postgres"
out="$(run env)"; rc=$?
check "the [YOUR-PASSWORD] placeholder is caught" $([ $rc -ne 0 ]; echo $?)
rm -f "$T/config"
out="$(run env)"; rc=$?
check "a missing settings file is caught" $([ $rc -ne 0 ]; echo $?)

echo "Saving the connection string with --set-url"
rm -f "$T/config"
out="$(printf 'postgresql://postgres.abc:Secret1@host:5432/postgres\n' | ARGS=--set-url run env)"; rc=$?
check "a pasted string is saved and tested" $rc
check "the test says it connected" $(grep -q "Connected to the database OK" <<< "$out"; echo $?)
check "the password is not echoed back" $(grep -q "Secret1" <<< "$out"; [ $? -ne 0 ]; echo $?)
check "the settings file is private (600)" $([ "$(stat -f %Lp "$T/config")" = "600" ]; echo $?)
check "the string is stored in the settings file" $(grep -q 'DATABASE_URL="postgresql://postgres.abc:Secret1@host' "$T/config"; echo $?)
out="$(run env)"; rc=$?
check "a backup then works with the saved string" $rc
check "and it was saved under the (temporary) home folder, not the real one" $([ -d "$T/home/PhysioMind-Backups" ]; echo $?)
rm -f "$T/config"
out="$(printf 'postgresql://postgres.abc:[YOUR-PASSWORD]@host:5432/postgres\nRealPass9\n' | ARGS=--set-url run env)"; rc=$?
check "[YOUR-PASSWORD] is filled in from a typed password" $rc
check "the typed password ends up in the string" $(grep -q 'abc:RealPass9@host' "$T/config"; echo $?)
rm -f "$T/config"
out="$(printf 'not-a-url\n' | ARGS=--set-url run env)"; rc=$?
check "something that is not a connection string is refused" $([ $rc -ne 0 ]; echo $?)
check "and no settings file is written" $([ ! -f "$T/config" ]; echo $?)
out="$(printf 'postgresql://postgres.abc:pa"ss@host:5432/postgres\n' | ARGS=--set-url run env)"; rc=$?
check "a string with a quote in it is refused" $([ $rc -ne 0 ]; echo $?)
out="$(printf 'postgresql://postgres.abc:Secret1@host:5432/postgres\n' | ARGS=--set-url run env FAKE_PSQL_FAIL=1)"; rc=$?
check "a connection the database rejects is reported" $([ $rc -ne 0 ]; echo $?)
check "and the password is hidden in that message" $(grep -q "Secret1" <<< "$out"; [ $? -ne 0 ]; echo $?)

echo
echo "$PASS passed, $FAILS failed"
[ "$FAILS" -eq 0 ]
