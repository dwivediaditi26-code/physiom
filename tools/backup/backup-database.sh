#!/bin/bash
# PhysioMind database backup (Mac).
#
# Copies the live Supabase database to an encrypted file on this computer:
#   - everything in the "public" schema (patients, profiles, posts, ...)
#   - the sign-in accounts (auth.users and auth.identities)
# and keeps the newest KEEP copies (default 30). Photos and videos uploaded to
# PhysioFeed live in Supabase Storage, not in the database, and are not copied.
#
# Setup and restore steps: docs/BACKUPS.md
#
# Usage:
#   backup-database.sh                 make a backup now
#   backup-database.sh --check [file]  open a backup (newest by default) and list what is in it
#   backup-database.sh --set-url       paste the database connection string once; it is saved and tested
#
# Settings come from ~/.physiomind-backup/config (see docs/BACKUPS.md) and the
# encryption password from the macOS Keychain item "physiomind-backup".
# Written for the Mac's own bash 3.2, so it avoids newer bash features.
set -euo pipefail

CONFIG="${PM_BACKUP_CONFIG:-$HOME/.physiomind-backup/config}"
KEYCHAIN_SERVICE="physiomind-backup"
NOTIFY="${NOTIFY:-1}"
BACKUP_DIR="$HOME/PhysioMind-Backups"
KEEP=30

log() {
  mkdir -p "$BACKUP_DIR" 2>/dev/null || true
  printf '%s  %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$1" >> "$BACKUP_DIR/backup.log" 2>/dev/null || true
}

notify() {
  [ "$NOTIFY" = "1" ] || return 0
  /usr/bin/osascript -e "display notification \"$2\" with title \"$1\"" >/dev/null 2>&1 || true
}

fail() {
  echo "ERROR: $1" >&2
  log "FAILED: $1"
  notify "PhysioMind backup FAILED" "$1"
  exit 1
}

# Hide the database password if a tool ever prints the connection string.
hide_password() {
  local text="$1"
  if [ -n "${DB_PASSWORD:-}" ]; then text="${text//"$DB_PASSWORD"/****}"; fi
  printf '%s' "$text"
}

find_tool() {
  local name="$1" override="${2:-}" d
  if [ -n "$override" ] && [ -x "$override" ]; then echo "$override"; return 0; fi
  if command -v "$name" >/dev/null 2>&1; then command -v "$name"; return 0; fi
  # A scheduled job has a very short PATH, so also look where Homebrew puts it.
  for d in /opt/homebrew/opt/libpq/bin /usr/local/opt/libpq/bin /opt/homebrew/opt/postgresql@17/bin /opt/homebrew/opt/postgresql@18/bin /Applications/Postgres.app/Contents/Versions/latest/bin; do
    if [ -x "$d/$name" ]; then echo "$d/$name"; return 0; fi
  done
  return 1
}

if [ "${1:-}" = "--help" ] || [ "${1:-}" = "-h" ]; then
  sed -n '2,18p' "$0" | sed 's/^# \{0,1\}//'
  exit 0
fi

if [ "${1:-}" = "--set-url" ]; then
  mkdir -p "$(dirname "$CONFIG")"
  printf 'Paste the connection string from Supabase and press Enter (nothing shows as you paste): '
  read -r -s URL; echo
  [ -n "$URL" ] || { echo "Nothing was pasted. Nothing was changed."; exit 1; }
  case "$URL" in postgresql://*|postgres://*) ;; *) echo "That does not look like a connection string: it should start with postgresql://. Nothing was changed."; exit 1 ;; esac
  case "$URL" in *'"'*|*'$'*|*'`'*|*'\'*|*' '*) echo "The string has a quote, space or special character that this tool cannot store. Use a database password of only letters and numbers. Nothing was changed."; exit 1 ;; esac
  case "$URL" in
    *"[YOUR-PASSWORD]"*)
      printf 'The string still has [YOUR-PASSWORD] in it. Type the database password and press Enter: '
      read -r -s NEWPW; echo
      [ -n "$NEWPW" ] || { echo "No password typed. Nothing was changed."; exit 1; }
      case "$NEWPW" in *[!A-Za-z0-9]*) echo "Use a database password of only letters and numbers (reset it in Supabase if needed). Nothing was changed."; exit 1 ;; esac
      URL="${URL//\[YOUR-PASSWORD\]/$NEWPW}"
      ;;
  esac
  {
    printf '# PhysioMind backup settings. Keep this file private: it holds the database password.\n'
    printf 'DATABASE_URL="%s"\n\n' "$URL"
    printf '# Where the copies are saved, and how many to keep (the oldest are deleted).\n'
    printf 'BACKUP_DIR="$HOME/PhysioMind-Backups"\nKEEP=30\n'
  } > "$CONFIG"
  chmod 600 "$CONFIG"
  echo "Saved to $CONFIG"
  DB_PASSWORD="${URL#*://}"; DB_PASSWORD="${DB_PASSWORD#*:}"; DB_PASSWORD="${DB_PASSWORD%%@*}"
  if PSQL="$(find_tool psql "${PSQL:-}")"; then
    if msg="$(PGCONNECT_TIMEOUT=20 "$PSQL" "$URL" -At -c 'select 1' 2>&1)"; then
      echo "Connected to the database OK."
    else
      echo "Saved, but the database did not accept the connection:"
      hide_password "$msg"; echo
      echo "Check the password (and that you copied the Session pooler string), then run --set-url again."
      exit 1
    fi
  else
    echo "Saved. (psql was not found, so the connection was not tested. Run: brew install libpq)"
  fi
  exit 0
fi

# ---- settings -------------------------------------------------------------
[ -f "$CONFIG" ] || fail "No settings file at $CONFIG. Follow docs/BACKUPS.md, step 3."
perm="$(stat -f %Lp "$CONFIG" 2>/dev/null || stat -c %a "$CONFIG")"
case "$perm" in *00) ;; *) chmod 600 "$CONFIG" ;; esac
# shellcheck disable=SC1090
. "$CONFIG"
DATABASE_URL="${DATABASE_URL:-}"
[ -n "$DATABASE_URL" ] || fail "DATABASE_URL is empty in $CONFIG."
case "$DATABASE_URL" in *"[YOUR-PASSWORD]"*) fail "Replace [YOUR-PASSWORD] in $CONFIG with the database password." ;; esac
DB_PASSWORD="${DATABASE_URL#*://}"; DB_PASSWORD="${DB_PASSWORD#*:}"; DB_PASSWORD="${DB_PASSWORD%%@*}"
case "$KEEP" in ''|*[!0-9]*) fail "KEEP in $CONFIG must be a whole number." ;; esac
[ "$KEEP" -ge 1 ] || fail "KEEP in $CONFIG must be at least 1."

# ---- password for the encrypted file -----------------------------------------
PM_BACKUP_PASS_INTERNAL="${PM_BACKUP_PASSPHRASE:-}"
if [ -z "$PM_BACKUP_PASS_INTERNAL" ]; then
  PM_BACKUP_PASS_INTERNAL="$(/usr/bin/security find-generic-password -s "$KEYCHAIN_SERVICE" -w 2>/dev/null || true)"
fi
[ -n "$PM_BACKUP_PASS_INTERNAL" ] || fail "No backup password in the Keychain. Follow docs/BACKUPS.md, step 4."
export PM_BACKUP_PASS_INTERNAL

PG_RESTORE="$(find_tool pg_restore "${PG_RESTORE:-}")" || fail "pg_restore not found. Install it with: brew install libpq"

TMP="$(mktemp -d)"
OUT_PARTIAL=""
cleanup() { rm -rf "$TMP"; if [ -n "$OUT_PARTIAL" ]; then rm -f "$OUT_PARTIAL"; fi; }
trap cleanup EXIT

decrypt() { openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -pass env:PM_BACKUP_PASS_INTERNAL -in "$1"; }

# ---- --check ---------------------------------------------------------------------
if [ "${1:-}" = "--check" ]; then
  FILE="${2:-}"
  if [ -z "$FILE" ]; then
    FILE="$(ls -1t "$BACKUP_DIR"/physiomind-*.tar.enc 2>/dev/null | head -n 1 || true)"
  fi
  [ -n "$FILE" ] && [ -f "$FILE" ] || fail "No backup file found in $BACKUP_DIR."
  decrypt "$FILE" > "$TMP/check.tar" 2>/dev/null || fail "Could not open $FILE. Wrong backup password?"
  tar -xf "$TMP/check.tar" -C "$TMP" || fail "$FILE opened but is not a valid backup."
  echo "File:  $FILE"
  echo "Size:  $(du -h "$FILE" | cut -f1)"
  cat "$TMP/manifest.txt"
  echo "Tables saved with their data:"
  "$PG_RESTORE" --list "$TMP/public.dump" | grep "TABLE DATA" | sed -E 's/.*TABLE DATA +([^ ]+) +([^ ]+).*/  \1.\2/' || true
  exit 0
fi

# ---- make a backup -------------------------------------------------------------------
PG_DUMP="$(find_tool pg_dump "${PG_DUMP:-}")" || fail "pg_dump not found. Install it with: brew install libpq"
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

dump() {
  local name="$1"; shift
  if ! "$PG_DUMP" --format=custom --no-owner --no-privileges "$@" --file="$TMP/$name.dump" "$DATABASE_URL" 2>"$TMP/$name.err"; then
    fail "Could not read the database ($name): $(hide_password "$(tail -n 3 "$TMP/$name.err" | tr '\n' ' ')")"
  fi
  [ -s "$TMP/$name.dump" ] || fail "The $name copy came out empty."
}

dump public --schema=public
dump auth --data-only --table=auth.users --table=auth.identities

TOC="$("$PG_RESTORE" --list "$TMP/public.dump")"
grep -q "TABLE DATA public patients" <<< "$TOC" || fail "The copy does not contain the patients table. Nothing was saved."
TABLES="$(grep -c "TABLE DATA" <<< "$TOC" || true)"

{
  echo "PhysioMind database backup"
  echo "Made:   $(date '+%Y-%m-%d %H:%M:%S %Z')"
  echo "Tool:   $("$PG_DUMP" --version)"
  echo "Tables with data in public: $TABLES"
} > "$TMP/manifest.txt"

tar -cf "$TMP/bundle.tar" -C "$TMP" public.dump auth.dump manifest.txt

STAMP="$(date +%Y-%m-%d-%H%M%S)"
OUT="$BACKUP_DIR/physiomind-$STAMP.tar.enc"
OUT_PARTIAL="$OUT.partial"
openssl enc -aes-256-cbc -pbkdf2 -iter 200000 -salt -pass env:PM_BACKUP_PASS_INTERNAL -in "$TMP/bundle.tar" -out "$OUT_PARTIAL"

# Prove the saved file opens before trusting it.
if ! decrypt "$OUT_PARTIAL" | tar -tf - >/dev/null 2>&1; then fail "The saved backup could not be opened again, so it was thrown away."; fi
mv "$OUT_PARTIAL" "$OUT"
OUT_PARTIAL=""
chmod 600 "$OUT"

# Keep only the newest KEEP copies.
ls -1t "$BACKUP_DIR"/physiomind-*.tar.enc | tail -n +"$((KEEP + 1))" | while IFS= read -r old; do rm -f -- "$old"; done

SIZE="$(du -h "$OUT" | cut -f1)"
log "OK: $OUT ($SIZE, $TABLES tables)"
notify "PhysioMind backup saved" "$SIZE saved to $BACKUP_DIR"
echo "Backup saved: $OUT ($SIZE, $TABLES tables)"
