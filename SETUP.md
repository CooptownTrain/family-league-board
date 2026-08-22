# Turning on email logins

The board works without this. Do it only if you want your draft to follow you
between your laptop and your phone.

## 1. Make a free Supabase project
Go to supabase.com, sign up, click **New project**. Any name. Pick a password for
the database and save it somewhere — you will not need it again for this.

## 2. Create the table
In the project, open **SQL Editor**, paste everything in `schema.sql`, hit Run.
That makes one table with a rule that nobody can read anyone else's board.

## 3. Copy two values into config.js
In **Project Settings → API**, copy:
- **Project URL** into `FL_SUPABASE_URL`
- the **anon / public** key into `FL_SUPABASE_KEY`

The anon key is meant to be public — it is safe in a web page. The table rule is
what protects the data, not the key.

## 4. Allow the site to sign people in
In **Authentication → URL Configuration**, add the live site address to
**Redirect URLs**.

That is it. Anyone who opens the board can enter their email, click the link that
arrives, and their board follows them everywhere.
