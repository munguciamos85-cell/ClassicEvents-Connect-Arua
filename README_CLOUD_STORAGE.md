# Cloud Database + Image Storage

Classic Events Connect uses Supabase Postgres and Supabase Storage.

### Database
The `database.sql` file creates the production tables and Row Level Security. Providers, events, bookings, reviews, messages and notifications are stored in the cloud.

### Images
The `provider-media` bucket stores profile and former-project images. Uploads are placed under the authenticated user's UUID and are publicly readable after upload, while writes/deletes are controlled by Storage RLS.

### Important
The website cannot connect to your private Supabase project until you replace the two placeholders in `supabase-config.js` with your own Project URL and Publishable/anon key.
