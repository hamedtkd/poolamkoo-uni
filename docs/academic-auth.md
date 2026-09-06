# Academic account layer

This branch adds the server-side account requirement requested for the university project while preserving Poolamkoo's local-first financial privacy boundary.

## Architecture

- **Server database (Supabase PostgreSQL):** user id, email, display name, password hash, sessions.
- **Browser IndexedDB:** incomes, allocations, funds, investments, transactions, reports and other financial records.
- The raw session token is kept only in an HttpOnly cookie; the server database stores only its SHA-256 hash.
- Passwords are stored as Node.js `scrypt` hashes with a random salt.
- A non-secret `poolamkoo_scope` cookie contains only the account id so the browser can isolate IndexedDB per account.

## Set up the account database

1. Create a Supabase project.
2. Open SQL Editor and run `supabase/academic-auth.sql`.
3. Add these server-only variables to `.env.local` and the deployment environment:

```env
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

Never prefix the service role key with `NEXT_PUBLIC_` and never expose it to client components.

## Local database isolation

The first account used on an existing browser becomes the owner of the legacy `poolyar-local` IndexedDB so an existing user's data is not made to disappear after enabling accounts. Additional accounts receive their own `poolyar-local-<account-id>` database.

This means multiple accounts on the same browser do not share financial records, while existing local-first data remains available to the first account that adopts the browser profile.

## Demo checklist

1. Register account A and add a local financial record.
2. Log out.
3. Register account B and verify account A's financial data is not visible.
4. Log out and sign back into account A; the original local data should still be present.
5. Show Supabase `app_users` / `app_sessions` to demonstrate server-side account records without financial data.
