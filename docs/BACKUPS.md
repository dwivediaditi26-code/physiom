# Keeping a copy of the PhysioMind database on your computer

This sets up a daily, encrypted copy of the live database on your Mac. It is free and works on any Supabase plan. It is a second safety net: if you also buy Supabase Pro, you will have Supabase's own daily backups as well as this copy.

## What is copied, and what is not

- **Copied:** everything in the database: patients, assessments, profiles, posts, messages, and the sign-in accounts (emails and password hashes).
- **Not copied:** photos and videos uploaded to PhysioFeed. They live in Supabase Storage, not in the database. Patient records do not.
- **When it runs:** every day at 02:30. If the Mac is asleep or off then, it runs as soon as the Mac wakes up. A day is skipped only if the Mac stays off all day.
- **Where it goes:** `~/PhysioMind-Backups` (the `PhysioMind-Backups` folder in your home folder). The newest 30 copies are kept and older ones are deleted.
- **A Mac notification** tells you after each backup, and also if one fails.

The copies contain real patient data and hashed passwords. They are encrypted with a password only you know, so the files are unreadable without it. Keep FileVault turned on (System Settings, Privacy & Security, FileVault), and never email or upload these files anywhere.

## Set it up (about 15 minutes, once)

**1. Install the one tool it needs.**

```bash
brew install libpq
```

**2. Install the daily schedule.** Run this from the project folder.

```bash
bash tools/backup/install-mac-schedule.sh
```

It creates a settings file at `~/.physiomind-backup/config`.

**3. Put the database connection in the settings file.**

- In Supabase, open the **physiomind-prod** project (not the test one), click **Connect**, choose **Session pooler**, and copy the connection string.
- Open the settings file: `open -e ~/.physiomind-backup/config`
- Paste the string between the quotes after `DATABASE_URL=`.
- Replace `[YOUR-PASSWORD]` in it with the database password. If you do not know it, go to Project Settings, Database, and reset it. Choose a password of only letters and numbers, so it does not need special handling inside the string. Resetting only affects tools that connect straight to the database; ask first if you are unsure.
- Save the file.

**4. Choose a backup password and store it in the Keychain.** This is the password that locks every backup file.

```bash
security add-generic-password -a "$USER" -s physiomind-backup -w
```

It asks you to type the password. **Also save it in your password manager.** If it is lost, the backup files cannot be opened by anyone.

**5. Make the first backup by hand.**

```bash
~/.physiomind-backup/backup-database.sh
```

If the Mac asks whether the script may use the Keychain, choose **Always Allow**. When it works you will see "Backup saved" and a new file in `~/PhysioMind-Backups`.

**6. Check what is inside it.**

```bash
~/.physiomind-backup/backup-database.sh --check
```

This opens the newest backup and lists the tables saved. `public.patients` must be on the list. If it is not, tell me before relying on the backups.

## Look after it

- **Once a week,** copy the `PhysioMind-Backups` folder to an external drive or another safe place, so a stolen or broken Mac does not take the backups with it.
- **If you see "PhysioMind backup FAILED"**, the message says why. Common causes: the database password was reset (update `~/.physiomind-backup/config`), or `brew install libpq` was not done.
- The daily log is `~/PhysioMind-Backups/backup.log`.

## If you ever need to restore

Do not restore on top of the live database. Create a new, empty Supabase project, then restore into that, and ask me to help the first time.

```bash
# 1. Unlock a backup (it asks for the backup password)
openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -in ~/PhysioMind-Backups/physiomind-DATE.tar.enc -out backup.tar
tar -xf backup.tar

# 2. Put the data into the new project (use its Session pooler connection string)
pg_restore --no-owner --dbname "NEW-PROJECT-CONNECTION-STRING" public.dump
pg_restore --no-owner --data-only --dbname "NEW-PROJECT-CONNECTION-STRING" auth.dump
```

Delete `backup.tar`, `public.dump` and `auth.dump` afterwards: they are not encrypted.

## How this was checked

The script's own logic is checked by `bash tools/backup/selftest.sh`, which uses stand-in database programs and touches no database. It covers encryption, wrong-password refusal, keeping only the newest copies, refusing an empty or incomplete copy, and never printing the database password. A real database copy has not been made by this script yet: the first manual run (step 5) and the check (step 6) are that test.
