-- =========================================================================
-- Row Level Security : isolation stricte entre organismes.
-- Principe : un client ne peut JAMAIS lire une ligne qui n'appartient pas
-- à son organization_id, quelle que soit la requête envoyée depuis le
-- navigateur. C'est la base de données qui l'interdit, pas seulement
-- l'interface.
-- =========================================================================

create or replace function public.current_user_role()
returns text language sql stable as $$
  select role from public.users where id = auth.uid();
$$;

create or replace function public.current_user_org()
returns uuid language sql stable as $$
  select organization_id from public.users where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean language sql stable as $$
  select coalesce((select role from public.users where id = auth.uid()) = 'admin', false);
$$;

-- ---- users ----
alter table public.users enable row level security;

create policy users_select_self_or_org on public.users
  for select using (
    id = auth.uid()
    or organization_id = public.current_user_org()
    or public.is_admin()
  );

create policy users_admin_all on public.users
  for all using (public.is_admin());

-- ---- organizations ----
alter table public.organizations enable row level security;

create policy organizations_select_own on public.organizations
  for select using (
    id = public.current_user_org()
    or public.is_admin()
  );

create policy organizations_admin_write on public.organizations
  for all using (public.is_admin());

-- ---- organization_users ----
alter table public.organization_users enable row level security;

create policy org_users_select_own on public.organization_users
  for select using (
    organization_id = public.current_user_org()
    or public.is_admin()
  );

create policy org_users_org_admin_manage on public.organization_users
  for all using (
    public.is_admin()
    or (
      organization_id = public.current_user_org()
      and public.current_user_role() = 'org_admin'
    )
  );

-- ---- catalogue (lecture publique des formations visibles, écriture admin) ----
alter table public.training_courses enable row level security;

create policy courses_public_read on public.training_courses
  for select using (is_visible = true or public.is_admin());

create policy courses_admin_write on public.training_courses
  for all using (public.is_admin());

-- ---- tarifs (jamais visibles sans compte) ----
alter table public.course_prices enable row level security;

create policy prices_authenticated_read on public.course_prices
  for select using (auth.uid() is not null);

create policy prices_admin_write on public.course_prices
  for all using (public.is_admin());

alter table public.organization_prices enable row level security;

create policy org_prices_own_org_only on public.organization_prices
  for select using (
    organization_id = public.current_user_org()
    or public.is_admin()
  );

create policy org_prices_admin_write on public.organization_prices
  for all using (public.is_admin());

-- ---- calendrier : le client ne voit que disponible / indisponible,
-- jamais la raison ni le détail du blocage. On expose une vue dédiée
-- (voir 0003_calendar_view.sql) plutôt que la table brute.
alter table public.calendar_days enable row level security;

create policy calendar_admin_full on public.calendar_days
  for all using (public.is_admin());

-- aucune policy de select pour les clients sur la table brute :
-- ils interrogent exclusivement public.calendar_public_view

alter table public.availability_blocks enable row level security;
create policy availability_admin_only on public.availability_blocks
  for all using (public.is_admin());

-- ---- déplacements : jamais exposés au client tels quels, uniquement
-- le montant final via le dossier de réservation ----
alter table public.travel_settings enable row level security;
create policy travel_settings_admin_only on public.travel_settings
  for all using (public.is_admin());

alter table public.travel_calculations enable row level security;
create policy travel_calc_admin_only on public.travel_calculations
  for all using (public.is_admin());

create policy travel_calc_org_read_own on public.travel_calculations
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.booking_requests br
      where br.id = booking_request_id
      and br.organization_id = public.current_user_org()
    )
  );

-- ---- demandes de réservation : strictement filtrées par organisme ----
alter table public.booking_requests enable row level security;

create policy bookings_select_own_org on public.booking_requests
  for select using (
    organization_id = public.current_user_org()
    or public.is_admin()
  );

create policy bookings_insert_own_org on public.booking_requests
  for insert with check (
    organization_id = public.current_user_org()
  );

create policy bookings_update_own_org_draft_only on public.booking_requests
  for update using (
    (organization_id = public.current_user_org() and status = 'draft')
    or public.is_admin()
  );

-- les notes internes (internal_notes) sont dans la même table : on les
-- masque côté client via une vue dédiée (voir 0003) plutôt que via RLS
-- colonne par colonne, Postgres RLS ne filtrant pas par colonne.

alter table public.booking_session_days enable row level security;

create policy session_days_select_own_org on public.booking_session_days
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.booking_requests br
      where br.id = booking_request_id
      and br.organization_id = public.current_user_org()
    )
  );

create policy session_days_admin_write on public.booking_session_days
  for all using (public.is_admin());

alter table public.booking_status_history enable row level security;

create policy status_history_select_own_org on public.booking_status_history
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.booking_requests br
      where br.id = booking_request_id
      and br.organization_id = public.current_user_org()
    )
  );

create policy status_history_admin_write on public.booking_status_history
  for all using (public.is_admin());

-- ---- documents ----
alter table public.professional_documents enable row level security;

create policy pro_docs_authenticated_read on public.professional_documents
  for select using (auth.uid() is not null and is_visible = true);

create policy pro_docs_admin_write on public.professional_documents
  for all using (public.is_admin());

alter table public.requested_document_types enable row level security;

create policy doc_types_read on public.requested_document_types
  for select using (
    auth.uid() is not null
    and (organization_id is null or organization_id = public.current_user_org())
  );

create policy doc_types_admin_write on public.requested_document_types
  for all using (public.is_admin());

alter table public.booking_documents enable row level security;

create policy booking_docs_own_org on public.booking_documents
  for all using (
    public.is_admin()
    or exists (
      select 1 from public.booking_requests br
      where br.id = booking_request_id
      and br.organization_id = public.current_user_org()
    )
  );

-- ---- checklists ----
alter table public.booking_checklists enable row level security;
create policy checklists_admin_only on public.booking_checklists
  for all using (public.is_admin());

alter table public.booking_checklist_items enable row level security;
create policy checklist_items_read_own_org on public.booking_checklist_items
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.booking_requests br
      where br.id = booking_request_id
      and br.organization_id = public.current_user_org()
    )
  );
create policy checklist_items_admin_write on public.booking_checklist_items
  for all using (public.is_admin());

-- ---- satisfaction et avis ----
alter table public.satisfaction_surveys enable row level security;
create policy surveys_own_org on public.satisfaction_surveys
  for all using (
    public.is_admin()
    or exists (
      select 1 from public.booking_requests br
      where br.id = booking_request_id
      and br.organization_id = public.current_user_org()
    )
  );

alter table public.satisfaction_answers enable row level security;
create policy survey_answers_own_org on public.satisfaction_answers
  for all using (
    public.is_admin()
    or exists (
      select 1 from public.satisfaction_surveys s
      join public.booking_requests br on br.id = s.booking_request_id
      where s.id = survey_id and br.organization_id = public.current_user_org()
    )
  );

alter table public.public_reviews enable row level security;
create policy reviews_public_read on public.public_reviews
  for select using (is_published = true or public.is_admin());
create policy reviews_admin_write on public.public_reviews
  for all using (public.is_admin());

-- ---- notifications, logs, audit : réservés à l'admin ----
alter table public.notifications enable row level security;
create policy notifications_owner_or_admin on public.notifications
  for select using (recipient_user_id = auth.uid() or public.is_admin());
create policy notifications_admin_write on public.notifications
  for all using (public.is_admin());

alter table public.whatsapp_logs enable row level security;
create policy whatsapp_logs_admin_only on public.whatsapp_logs
  for all using (public.is_admin());

alter table public.audit_logs enable row level security;
create policy audit_logs_admin_only on public.audit_logs
  for all using (public.is_admin());

-- ---- site public ----
alter table public.website_pages enable row level security;
create policy pages_public_read on public.website_pages
  for select using (is_published = true or public.is_admin());
create policy pages_admin_write on public.website_pages
  for all using (public.is_admin());

alter table public.website_blocks enable row level security;
create policy blocks_public_read on public.website_blocks
  for select using (true);
create policy blocks_admin_write on public.website_blocks
  for all using (public.is_admin());

alter table public.settings enable row level security;
create policy settings_public_read on public.settings
  for select using (true);
create policy settings_admin_write on public.settings
  for all using (public.is_admin());

alter table public.archives enable row level security;
create policy archives_admin_only on public.archives
  for all using (public.is_admin());
