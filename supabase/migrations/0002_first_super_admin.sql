-- Run ONCE after you sign up / create your own login in Supabase Auth,
-- if you are NOT using `npm run seed:supabase`.
-- Replace the email with the founder's login email.

update public.profiles
set role = 'super_admin', designation = 'Founder'
where email = 'founder@yourcompany.com';
