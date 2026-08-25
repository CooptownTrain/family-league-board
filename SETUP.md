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

---

## 5. The AI gate (added 2026-08-24)

The anon key above is public by design, and it used to be the ONLY thing standing between
anyone with the league URL and the OpenAI key behind `/functions/v1/ask`. During testing that
endpoint was called 68 times using nothing but the key printed on the public page.

**This repo is public** (github.com/CooptownTrain/family-league-board), so the fix could not
be "put a password in config.js" — anything committed here is readable by anyone who finds
the repo. It would not be a secret at all.

So the key lives in **your browser**, never in the repo:

- `.secrets/ask_token.txt` — the token. `.secrets/` is git-ignored and the file is chmod 600.
- Supabase secret `ASK_TOKEN` — what the function compares against:

      cd supa && supabase secrets set ASK_TOKEN="$(cat ../.secrets/ask_token.txt)" \
        --project-ref <your-project-ref>

**To turn the assistant on in a browser**, open the private board once with the key on the
end of the address:

      https://<your private board url>/#t=<paste the token here>

The page saves it to that browser and immediately strips it back out of the address bar, so
it does not sit in your history. Every visit after that is just the normal address —
**bookmark the plain URL, not the one with the key.** Do this once per device (laptop,
phone). Until you do, the board works completely; only the AI answers are switched off, and
the status line tells you so.

If `ASK_TOKEN` is not set on the server the gate stays open, so a missing secret can never
take the assistant down mid-draft — but it also means nothing is protected. Check it before
a draft.

**To rotate it:** write a new value into `.secrets/ask_token.txt`, run `supabase secrets set
ASK_TOKEN=...`, then re-open each browser once with the new `#t=` address.

**Also note:** the shared league edition (`site/index.html`) no longer ships the assistant at
all. `make_basic.py` empties the research findings and hard-disables the model call, and
`qa/page_integrity.js` checks both editions for opposite things — the shared one must NOT
have them, the private one MUST, and NEITHER may contain the token itself.
