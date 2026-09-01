-- ClinicOS — storage buckets (section 52). Third-party content (Google
-- photos, social creatives fetched from a connected platform) is
-- deliberately NOT cached here yet — only agency/ClinicOS-originated assets.
-- Revisit google-photos-cache only after confirming Google's API terms
-- permit caching, per spec section 52's explicit caution.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('client-logos', 'client-logos', true, 5242880, array['image/png','image/jpeg','image/svg+xml','image/webp']),
  ('doctor-images', 'doctor-images', true, 5242880, array['image/png','image/jpeg','image/webp']),
  ('social-creatives', 'social-creatives', false, 20971520, array['image/png','image/jpeg','image/webp','video/mp4']),
  ('reports', 'reports', false, 20971520, array['application/pdf']),
  ('qr-assets', 'qr-assets', true, 2097152, array['image/png','image/svg+xml'])
on conflict (id) do nothing;

-- Path convention every policy below assumes: "{agency_id}/{...}". Nothing
-- is ever written to a path outside the caller's own agency folder.
create policy "agency read own logos" on storage.objects for select
  using (bucket_id = 'client-logos' and (storage.foldername(name))[1] = public.auth_agency_id()::text);
create policy "agency write own logos" on storage.objects for insert
  with check (bucket_id = 'client-logos' and (storage.foldername(name))[1] = public.auth_agency_id()::text);

create policy "agency read own doctor images" on storage.objects for select
  using (bucket_id = 'doctor-images' and (storage.foldername(name))[1] = public.auth_agency_id()::text);
create policy "agency write own doctor images" on storage.objects for insert
  with check (bucket_id = 'doctor-images' and (storage.foldername(name))[1] = public.auth_agency_id()::text);

create policy "agency rw own social creatives" on storage.objects for all
  using (bucket_id = 'social-creatives' and (storage.foldername(name))[1] = public.auth_agency_id()::text)
  with check (bucket_id = 'social-creatives' and (storage.foldername(name))[1] = public.auth_agency_id()::text);

create policy "agency rw own reports" on storage.objects for all
  using (bucket_id = 'reports' and (storage.foldername(name))[1] = public.auth_agency_id()::text)
  with check (bucket_id = 'reports' and (storage.foldername(name))[1] = public.auth_agency_id()::text);

create policy "agency read own qr assets" on storage.objects for select
  using (bucket_id = 'qr-assets' and (storage.foldername(name))[1] = public.auth_agency_id()::text);
create policy "agency write own qr assets" on storage.objects for insert
  with check (bucket_id = 'qr-assets' and (storage.foldername(name))[1] = public.auth_agency_id()::text);
