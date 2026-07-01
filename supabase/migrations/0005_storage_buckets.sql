-- =========================================================================
-- Bucket de stockage privé pour les documents déposés sur les dossiers.
-- Jamais public : tout accès passe par une URL signée temporaire
-- (voir lib/actions/booking-documents.ts).
-- =========================================================================

insert into storage.buckets (id, name, public)
values ('booking-documents', 'booking-documents', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('professional-documents', 'professional-documents', false)
on conflict (id) do nothing;

-- Un utilisateur ne peut accéder qu'aux fichiers rangés sous l'id de
-- dossier (booking_request_id) qui appartient à son propre organisme.
-- Le chemin de stockage est toujours "{booking_request_id}/{fichier}".

create policy "booking_documents_select_own_org"
on storage.objects for select
using (
  bucket_id = 'booking-documents'
  and (
    public.is_admin()
    or exists (
      select 1 from public.booking_requests br
      where br.id::text = (storage.foldername(name))[1]
      and br.organization_id = public.current_user_org()
    )
  )
);

create policy "booking_documents_insert_own_org"
on storage.objects for insert
with check (
  bucket_id = 'booking-documents'
  and exists (
    select 1 from public.booking_requests br
    where br.id::text = (storage.foldername(name))[1]
    and br.organization_id = public.current_user_org()
  )
);

create policy "professional_documents_authenticated_read"
on storage.objects for select
using (
  bucket_id = 'professional-documents'
  and auth.uid() is not null
);

create policy "professional_documents_admin_write"
on storage.objects for all
using (bucket_id = 'professional-documents' and public.is_admin());
