# Classic Events Connect — Administrator Password Recovery

## What is included
- Administrator login through Supabase Auth.
- Forgot-password button on the Admin login screen.
- Secure email reset link using Supabase `resetPasswordForEmail`.
- Password update screen after the recovery link is opened.
- Minimum 8-character password enforced by the website UI.
- Admin authorization still requires an `admin` or `moderator` row in `public.user_roles`.

## Supabase setup
1. Open your Supabase project.
2. Go to **Authentication → URL Configuration**.
3. Set **Site URL** to your deployed Netlify URL, for example `https://classiceventsamos.netlify.app`.
4. Under **Redirect URLs**, add:
   `https://classiceventsamos.netlify.app/#admin-reset`
5. Also add your local development URL if you test locally, such as `http://localhost:3000/#admin-reset`.
6. Make sure your administrator already exists under **Authentication → Users**.
7. Make sure that user's UUID has the `admin` role using `ADMIN_SETUP.sql`.

## How password recovery works
1. Open the website and choose **Admin**.
2. Click **Forgot password?**
3. Enter the administrator email.
4. Supabase sends the reset email.
5. Open the email and follow the reset link.
6. The site opens the **Password Recovery** screen.
7. Enter and confirm the new password.
8. Return to Admin and sign in.

## Security
- Never put an administrator password in HTML, JavaScript, SQL, or Netlify source files.
- Never expose a Supabase `service_role`/secret key in the frontend.
- The publishable/anon key is the only client-side key that belongs in `supabase-config.js`.
- A valid Supabase account without an `admin` or `moderator` role is still denied access to the Admin Dashboard.
