# Classic Events Connect — Complete Supabase Production Setup

This package is prepared for a real multi-user Supabase backend. The website does not use localStorage as the source of truth for accounts, providers, projects, events, bookings, reviews, messages or notifications once Supabase is configured.

## 1. Create Supabase
Open Supabase and create a new project.

## 2. Run the database
In Supabase: **SQL Editor → New query**. Open `database.sql`, copy the complete file, paste it into SQL Editor and click **Run**.

The SQL creates:
- profiles and automatic profile creation after signup
- providers and approval/verification/featured states
- project_media for cloud project galleries
- events
- bookings
- reviews
- messages
- notifications
- admin/moderator roles
- site settings
- audit log
- Row Level Security policies
- `provider-media` Storage bucket and Storage security policies

The SQL is designed to be rerun safely.

## 3. Configure Authentication
In Supabase → **Authentication → Providers**, enable **Email**.

In Authentication → URL Configuration:
- Site URL: `https://classiceventsamos.netlify.app`
- Redirect URL for password recovery: `https://classiceventsamos.netlify.app/#admin-reset`

If you later use a custom domain, add that domain too.

## 4. Configure the website
Open `supabase-config.js` and replace:
- `YOUR_SUPABASE_PROJECT_URL`
- `YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY`

Use the browser-safe Publishable/anon key only. **Never use a service_role/secret key in the website.**

## 5. Create your administrator
Create the administrator in Supabase → Authentication → Users. Copy the user's UUID.

Then run:
```sql
insert into public.user_roles(user_id,role)
values ('YOUR-AUTH-USER-UUID','admin')
on conflict (user_id) do update set role='admin';
```

## 6. Cloud image storage
Provider profile photos and former-project photos are uploaded to:
`provider-media/<user-id>/profiles/...`
`provider-media/<user-id>/projects/...`

The resulting URLs are stored in the provider record and project_media table.

## 7. Deploy to Netlify
Upload the website folder/ZIP after putting your Supabase URL and public key in `supabase-config.js`.

After deployment, open the site in a private/incognito browser once to avoid an old cached JavaScript version.

## 8. Verify the connection
Open the website and check the Admin/System status. It should say **Production backend connected**.

Test in this order:
1. Create a normal account.
2. Confirm the profile appears in Supabase → Table Editor → profiles.
3. Log in.
4. Submit a provider profile with a profile image and former-project images.
5. Check providers and project_media in Supabase.
6. Approve the provider using the admin account.
7. Open the site on another phone/browser and confirm the approved provider and images are visible.
8. Create an event and booking.

## Security
- Do not send your admin password to anyone.
- Do not put the Supabase service_role/secret key in frontend code.
- Only the public browser key belongs in `supabase-config.js`.
- Admin access is controlled by `user_roles` and RLS, not by a hidden button or local browser flag.
