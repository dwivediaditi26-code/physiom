#!/bin/bash
# Sets up the daily PhysioMind database backup on this Mac.
#
#   bash tools/backup/install-mac-schedule.sh
#
# It copies the backup script to ~/.physiomind-backup (a scheduled job is not
# allowed to read the Downloads folder), creates the settings file if it is
# missing, and asks macOS to run the backup every day at 02:30. If the Mac is
# asleep then, macOS runs it as soon as the Mac wakes up.
# Full steps: docs/BACKUPS.md
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
DEST="$HOME/.physiomind-backup"
LABEL="com.physiomind.backup"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
BACKUP_DIR="$HOME/PhysioMind-Backups"

mkdir -p "$DEST" "$BACKUP_DIR" "$HOME/Library/LaunchAgents"
chmod 700 "$DEST" "$BACKUP_DIR"
cp "$HERE/backup-database.sh" "$DEST/backup-database.sh"
chmod 700 "$DEST/backup-database.sh"

if [ ! -f "$DEST/config" ]; then
  cat > "$DEST/config" <<'CONF'
# PhysioMind backup settings. Keep this file private: it holds the database password.
#
# Paste the connection string from Supabase between the quotes:
#   Supabase > physiomind-prod > Connect > Session pooler
# and replace [YOUR-PASSWORD] in it with the database password.
DATABASE_URL=""

# Where the copies are saved, and how many to keep (the oldest are deleted).
BACKUP_DIR="$HOME/PhysioMind-Backups"
KEEP=30
CONF
  chmod 600 "$DEST/config"
  echo "Created $DEST/config - open it and paste in the connection string."
fi

cat > "$PLIST" <<PLISTEND
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>$DEST/backup-database.sh</string>
  </array>
  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key><integer>2</integer>
    <key>Minute</key><integer>30</integer>
  </dict>
  <key>StandardOutPath</key><string>$BACKUP_DIR/launchd.log</string>
  <key>StandardErrorPath</key><string>$BACKUP_DIR/launchd.log</string>
</dict>
</plist>
PLISTEND

launchctl bootout "gui/$(id -u)/$LABEL" >/dev/null 2>&1 || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"

echo "Daily backup scheduled for 02:30 (or when the Mac wakes up after that)."
echo "Copies will be saved in $BACKUP_DIR"
echo "Next: docs/BACKUPS.md, steps 3 and 4, then run a first backup by hand."
