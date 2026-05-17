## Plan: Recover admin access for rihanlabibhussain@gmail.com

You only have one real account in the backend — `rihanlabibhussain@gmail.com` — and it currently has no admin role. The previous `rihan@gmail.com` / `ziad@gmail.com` rows were seeded against user IDs that don't exist, so they never worked.

### Steps

1. **Grant admin role** to user `rihanlabibhussain@gmail.com` (id `a99fe555-…`) via an `INSERT` into `public.user_roles` (role = `admin`).
2. **Trigger a password reset email** to `rihanlabibhussain@gmail.com` from the `/forgot-password` page so you can set a fresh password.
   - The existing `/reset-password` route handles the recovery link and lets you set a new password.
3. **Sign in** at `/admin/login` with the new password — admin role is already attached, so the console will open.
4. **Cleanup**: remove the stale `user_roles` rows that point to non-existent users for `rihan@gmail.com` / `ziad@gmail.com` (optional housekeeping).

### What I'll do vs. what you'll do

- I'll run: the role grant + the cleanup (database changes only, no code edits needed).
- You'll do: open `/forgot-password`, enter `rihanlabibhussain@gmail.com`, click the email link, set a new password, then sign in at `/admin/login`.

### Note on email delivery

Password reset emails go through Lovable's default email sender unless a custom email domain is configured. If you don't receive it within a minute, check spam — or tell me and I'll switch to option 2 (create a brand-new admin account with credentials you provide).

No code/UI changes are required; this is a backend-only recovery.