Classic Events Connect - Fixed Version
- Added a dedicated Search section and working search box.
- Search covers Events and Artists/DJs/MCs/Sound Systems.
- Search updates automatically when new events or service profiles are added.
- Added Search to desktop and mobile navigation.
- Existing booking, login/join, event and provider features retained.


NEW FEATURES (October 2026)
- Terms & Conditions and Privacy Notice are linked from the footer. Review these templates before production launch.
- Professional profiles can include project photos and up to four direct video URLs. Administrators can remove a provider profile photo.
- New Banners & Products admin area supports announcements and product/equipment listings with image and video URLs.
- In standalone mode banners/products are saved in the current browser only. For shared production content, run CONTENT_FEATURES_MIGRATION.sql in Supabase SQL Editor, then deploy the updated site.
- For videos, use a direct MP4/WebM/OGG URL; other video URLs are shown as a link to open.


SUBMISSION BUTTON TROUBLESHOOTING (UPDATED)
1. Upload all files from this ZIP to the same GitHub Pages folder; keep file names and capitalization unchanged.
2. In Supabase SQL Editor, run database.sql, then ADMIN_SETUP.sql as appropriate, then CONTENT_FEATURES_MIGRATION.sql. Do not run the admin role example until you have the correct Auth user UUID.
3. In Supabase Authentication, create/verify the account you will use to test login. For admin features, that account must have an admin or moderator role in public.user_roles.
4. Provider profiles, events, bookings and reviews require a signed-in user. Account registration requires a valid email address.
5. If a submission fails, the site now displays the Supabase error. Common causes are a missing SQL migration, row-level-security permissions, an unverified email, or an unconfigured storage bucket.
6. After replacing files on GitHub Pages, wait for deployment and hard-refresh the site with Ctrl+F5.
