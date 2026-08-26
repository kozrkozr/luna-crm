-- Storage bucket for shoot media.
--
-- risks.md R-5: v1 DOES host files, despite "no file hosting" in the PRD's
-- non-goals. That non-goal covers only raw and finished photos. US-003 uploads
-- a gallery image, US-005 a note image, US-018 an image or a video — so a real
-- bucket, upload handling and signed URLs are needed from day one. This is the
-- foundation piece; US-003 is the first story to use it.
--
-- The bucket is PRIVATE. architecture.md: media never streams through the link
-- gateway — files sit in a private bucket and the gateway hands back
-- short-lived signed URLs so the browser fetches from Storage directly. A
-- public bucket would make every reference image world-readable by URL and
-- would put the crew/client split (ADR-013) out of reach for media.
--
-- Path convention, relied on by the policies below:
--
--     <shoot_id>/references/<uuid>.<ext>     US-003
--
-- The first path segment is the shoot id, so ownership is derivable from the
-- object name alone. Later stories add sibling prefixes under the same shoot
-- (crew note images, location media) and inherit these policies unchanged.

insert into storage.buckets (id, name, public)
values ('shoot-media', 'shoot-media', false)
on conflict (id) do nothing;

-- Ownership is the shoot's, exactly as in the table policies: the creator of a
-- non-deleted shoot. Soft-delete filtering lives here rather than in queries,
-- for the reason the initial schema gives — CLAUDE.md rule 3 makes a forgotten
-- filter the most likely bug in v1, and a USING clause cannot be forgotten.
create policy shoot_media_creator_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'shoot-media'
    and exists (
      select 1 from public.shoots s
      where s.id::text = (storage.foldername(name))[1]
        and s.creator_id = auth.uid()
        and s.deleted_at is null
    )
  );

create policy shoot_media_creator_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'shoot-media'
    and exists (
      select 1 from public.shoots s
      where s.id::text = (storage.foldername(name))[1]
        and s.creator_id = auth.uid()
        and s.deleted_at is null
    )
  );

-- No UPDATE and no DELETE policy, matching the grants migration: v1 has no hard
-- deletes anywhere, and no story asks for replacing an uploaded file in place.
--
-- Deliberately absent: any policy for `anon`. Anonymous link views never read
-- Storage directly — the gateway runs as service role, which bypasses RLS, and
-- hands out signed URLs (ADR-013).
