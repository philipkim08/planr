# Enable username and password accounts

Run the database migration **before deploying this version**. No existing trips or
accounts are deleted. Passwords are stored and verified by Supabase Auth, never
by the username table.

1. Open your production Supabase project → SQL Editor → New query.
2. Paste all of `supabase/migrations/002_usernames.sql` and click Run.
   “Success. No rows returned” is expected. This reserves new usernames during
   signup and creates the private username lookup used by the server.
3. In Authentication → Sign In / Providers → Email, keep Email enabled and
   Confirm email enabled. Set the minimum password length to at least 8.
   Keep the existing Resend SMTP settings.
4. In Authentication → URL Configuration, keep Site URL `https://planr.win`
   and add these exact Redirect URLs if absent:
   - `https://planr.win/plans`
   - `https://planr.win/reset-password`
   - `http://localhost:5173/plans`
   - `http://localhost:5173/reset-password`
5. Keep the existing Render variables: SUPABASE_URL, SUPABASE_SECRET_KEY,
   VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY. Never put the secret key
   in a variable beginning with VITE_. No new secrets are needed.
6. Push the prepared commit to GitHub and wait for Render to show Live.
7. Existing users: sign in via the email-link fallback, open My Plans →
   Account settings, and choose a username and password. The same account ID
   is retained, so existing plans remain owned by that user.
8. New users: Create an account → username, email, password → confirm email once.
   Later sign-ins use the username and password. Usernames are 3–24 ASCII
   letters/numbers/underscores, are stored lowercase, and are unique.

## Verify before inviting more users

- Create a new test account and confirm the email; sign out and sign in by username.
- Check mixed-case usernames (Jake / JAKE) identify the same account.
- Try a taken username and confirm it cannot be claimed by another account.
- Set a username/password on an existing account; verify its plans still appear.
- Use Forgot password, open the emailed link, save a new password and sign in.
- Confirm incorrect credentials never reveal a private email address.
- Verify public itinerary links still work signed out.

The password endpoint has per-username and per-IP attempt limits in server memory.
They reset on restart and are per instance; use shared rate-limit storage before
scaling to multiple backend instances. The Express proxy setting assumes the
existing single Render reverse proxy.

## Rollback

Revert the username/password application commit and redeploy. Existing email-link
sign-in and plans still work. The extra database table and signup trigger may
remain: the old signup flow does not supply a username, so the trigger skips it.
