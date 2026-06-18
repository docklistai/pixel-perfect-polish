Docklist is already wired to read `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from `src/lib/supabase/env.ts`. The published build currently lacks those variables, so `/auth` falls back to the "Sign-in isn't available in this environment yet" message. This plan adds only those two public variables in Lovable settings and republishes — no code, schema, auth, UI, or new Supabase project changes.

## Where to add the variables in Lovable

1. In the Lovable editor, click the project name in the top-left and choose **Project Settings**.
2. Go to the **Environment Variables** section (it may also be labeled **Build Environment** or nested under **Build**, depending on workspace plan).
3. Add two variables:
   - `VITE_SUPABASE_URL` — your Supabase project URL, e.g. `https://<project-ref>.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` — your Supabase public/anon key
4. Save the settings.

## Republish

Once those variables are saved in the project, republish the current build. No code changes are made. The new build will bundle the variables and the `/auth` route should no longer show the "Sign-in isn't available in this environment yet" fallback.

## Verification

After publish, visit `/auth` on the live URL and confirm the sign-in form loads instead of the environment-not-available message.