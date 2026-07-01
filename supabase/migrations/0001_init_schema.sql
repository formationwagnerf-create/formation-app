-- =========================================================================
-- Schéma initial : plateforme de réservation de formations
-- Toute la confidentialité entre organismes est appliquée via RLS,
-- pas seulement côté application.
-- =========================================================================

create extension if not exists "uuid-ossp";

-- -------------------------------------------------------------------------
-- Identité
-- -------------------------------------------------------------------------

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  first_name text,
  last_name text,
  role text not null default 'client_user' check (role in ('admin', 'org_admin', 'client_user')),
  organization_id uuid,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default uuid_generate_v4(),
  legal_name text not null,
  siret text,
  vat_number text,
  admin_address text,
  billing_address text,
  email text,
  phone text,
  contact_first_name text,
  contact_last_name text,
  contact_role text,
  purchase_order_number text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table public.users
  add constraint users_organization_fk foreign key (organization_id) references public.organizations(id);

create table public.organization_users (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  is_org_admin boolean not null default false,
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

-- -------------------------------------------------------------------------
-- Catalogue et tarifs
-- -------------------------------------------------------------------------

create table public.training_courses (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  short_description text,
  full_description text,
  objectives text,
  prerequisites text,
  target_audience text,
  program_pdf_url text,
  duration_days numeric not null check (duration_days >= 1 and duration_days <= 5),
  max_participants integer not null default 14,
  is_customizable boolean not null default false,
  default_daily_price numeric,
  default_half_day_price numeric,
  is_visible boolean not null default true,
  is_bookable boolean not null default true,
  display_order integer not null default 0,
  image_url text,
  custom_fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.course_prices (
  id uuid primary key default uuid_generate_v4(),
  course_id uuid not null references public.training_courses(id) on delete cascade,
  daily_price numeric not null,
  half_day_price numeric,
  reference_duration text,
  comment text,
  effective_from date not null default current_date,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.organization_prices (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  course_id uuid not null references public.training_courses(id) on delete cascade,
  daily_price numeric not null,
  half_day_price numeric,
  comment text,
  effective_from date not null default current_date,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- -------------------------------------------------------------------------
-- Calendrier et disponibilités (fenêtre glissante, voir lib/calendar.ts)
-- -------------------------------------------------------------------------

-- Une ligne par demi-journée, générée automatiquement et glissante sur 2 ans.
-- C'est la seule table que le client interroge pour savoir si une date est
-- disponible : il ne voit jamais la raison du blocage.
create table public.calendar_days (
  id uuid primary key default uuid_generate_v4(),
  day date not null,
  half_day text not null check (half_day in ('morning', 'afternoon', 'full')),
  status text not null default 'available' check (status in ('available', 'booked', 'blocked')),
  booking_request_id uuid,
  blocked_reason text, -- jamais exposé au client, uniquement à l'admin
  created_at timestamptz not null default now(),
  unique (day, half_day)
);

create index calendar_days_day_idx on public.calendar_days(day);

create table public.availability_blocks (
  id uuid primary key default uuid_generate_v4(),
  start_date date not null,
  end_date date not null,
  half_day text not null default 'full' check (half_day in ('morning', 'afternoon', 'full')),
  reason text,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now()
);

create table public.calendar_sync_events (
  id uuid primary key default uuid_generate_v4(),
  booking_request_id uuid,
  google_event_id text not null,
  status text not null default 'synced' check (status in ('synced', 'pending', 'error', 'deleted')),
  last_synced_at timestamptz not null default now()
);

-- -------------------------------------------------------------------------
-- Déplacements
-- -------------------------------------------------------------------------

create table public.travel_settings (
  id uuid primary key default uuid_generate_v4(),
  origin_address text not null default 'Saint-Vincent-de-Tyrosse, France',
  free_km_threshold numeric not null default 50,
  price_per_km numeric not null default 0.80,
  franchise_rule text not null default 'round_trip' check (franchise_rule in ('one_way', 'round_trip', 'per_trip', 'whole_mission')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.travel_calculations (
  id uuid primary key default uuid_generate_v4(),
  booking_request_id uuid not null,
  origin_address text not null,
  destination_address text not null,
  distance_one_way_km numeric,
  number_of_trips integer not null default 2,
  total_distance_km numeric,
  free_km_threshold numeric not null,
  billable_distance_km numeric,
  price_per_km numeric not null,
  computed_amount numeric,
  manual_override boolean not null default false,
  final_amount numeric,
  created_at timestamptz not null default now()
);

-- -------------------------------------------------------------------------
-- Demandes de réservation
-- -------------------------------------------------------------------------

create table public.booking_requests (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references public.organizations(id),
  created_by uuid references public.users(id),
  course_id uuid not null references public.training_courses(id),
  status text not null default 'draft' check (status in (
    'draft', 'received', 'under_review', 'option_proposed', 'option_accepted',
    'awaiting_client_confirmation', 'confirmed_by_client', 'confirmed_final',
    'scheduled', 'completed', 'cancelled_by_client', 'cancelled_by_admin',
    'refused', 'expired', 'archived'
  )),
  start_date date,
  end_date date,
  number_of_days numeric,
  day_format text check (day_format in ('full_day', 'half_day')),
  expected_participants integer not null default 14,
  venue_name text,
  venue_address text,
  on_site_contact_name text,
  on_site_contact_phone text,
  comment text,
  is_custom_request boolean not null default false,
  ordering_entity text, -- "organisme donneur d'ordre", facultatif
  applied_daily_price numeric,
  applied_half_day_price numeric,
  applied_price_comment text,
  option_deadline timestamptz,
  reminder_setting text not null default '21_days' check (reminder_setting in ('7_days','14_days','21_days','custom','none')),
  reminder_custom_days integer,
  auto_expire boolean not null default false,
  quote_number text,
  quote_date date,
  quote_amount numeric,
  quote_file_url text,
  quote_status text default 'to_create' check (quote_status in ('to_create','sent','accepted')),
  invoice_number text,
  invoice_date date,
  invoice_amount numeric,
  invoice_file_url text,
  invoice_status text default 'to_create' check (invoice_status in ('to_create','sent','paid')),
  payment_date date,
  payment_method text default 'bank_transfer',
  is_locked boolean not null default false,
  internal_notes text, -- jamais visible côté client
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index booking_requests_org_idx on public.booking_requests(organization_id);
create index booking_requests_status_idx on public.booking_requests(status);

-- Une ligne par journée/demi-journée de la session : c'est ici que
-- l'administrateur saisit et modifie librement le nombre réel de stagiaires,
-- indépendamment du nombre prévu par le client.
create table public.booking_session_days (
  id uuid primary key default uuid_generate_v4(),
  booking_request_id uuid not null references public.booking_requests(id) on delete cascade,
  session_date date not null,
  half_day text not null default 'full' check (half_day in ('morning', 'afternoon', 'full')),
  expected_participants integer,
  actual_participants integer, -- saisi/modifié uniquement par l'admin
  travel_hours numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (booking_request_id, session_date, half_day)
);

create table public.booking_status_history (
  id uuid primary key default uuid_generate_v4(),
  booking_request_id uuid not null references public.booking_requests(id) on delete cascade,
  old_status text,
  new_status text not null,
  changed_by uuid references public.users(id),
  comment text,
  created_at timestamptz not null default now()
);

-- -------------------------------------------------------------------------
-- Documents
-- -------------------------------------------------------------------------

create table public.professional_documents (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  category text not null,
  file_url text not null,
  description text,
  is_visible boolean not null default true,
  published_at date,
  expires_at date,
  expiry_alert_days integer default 30,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.requested_document_types (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  is_required boolean not null default true,
  applies_to_all_courses boolean not null default true,
  course_id uuid references public.training_courses(id),
  organization_id uuid references public.organizations(id),
  deadline_days_before integer,
  accepted_formats text[] not null default array['pdf','docx','xlsx','jpg','png'],
  comment text,
  created_at timestamptz not null default now()
);

create table public.booking_documents (
  id uuid primary key default uuid_generate_v4(),
  booking_request_id uuid not null references public.booking_requests(id) on delete cascade,
  document_type_id uuid references public.requested_document_types(id),
  file_url text,
  file_name text,
  status text not null default 'to_provide' check (status in (
    'not_requested','to_provide','received','under_review','validated','refused','to_replace'
  )),
  uploaded_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -------------------------------------------------------------------------
-- Checklists
-- -------------------------------------------------------------------------

create table public.booking_checklists (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  is_default boolean not null default false,
  course_id uuid references public.training_courses(id),
  created_at timestamptz not null default now()
);

create table public.booking_checklist_items (
  id uuid primary key default uuid_generate_v4(),
  checklist_id uuid not null references public.booking_checklists(id) on delete cascade,
  booking_request_id uuid references public.booking_requests(id) on delete cascade,
  label text not null,
  is_required boolean not null default false,
  is_automatic boolean not null default false,
  is_done boolean not null default false,
  display_order integer not null default 0,
  done_at timestamptz
);

-- -------------------------------------------------------------------------
-- Satisfaction et avis
-- -------------------------------------------------------------------------

create table public.satisfaction_surveys (
  id uuid primary key default uuid_generate_v4(),
  booking_request_id uuid not null references public.booking_requests(id) on delete cascade,
  sent_at timestamptz,
  responded_at timestamptz,
  overall_score numeric,
  overall_comment text,
  allow_publication boolean not null default false,
  display_name text,
  is_anonymous boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.satisfaction_answers (
  id uuid primary key default uuid_generate_v4(),
  survey_id uuid not null references public.satisfaction_surveys(id) on delete cascade,
  question_number integer not null,
  score numeric,
  comment text
);

create table public.public_reviews (
  id uuid primary key default uuid_generate_v4(),
  survey_id uuid references public.satisfaction_surveys(id),
  organization_display_name text,
  reviewer_display_name text,
  comment text not null,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

-- -------------------------------------------------------------------------
-- Notifications et journaux
-- -------------------------------------------------------------------------

create table public.notifications (
  id uuid primary key default uuid_generate_v4(),
  recipient_user_id uuid references public.users(id),
  channel text not null check (channel in ('whatsapp','email','in_app')),
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.whatsapp_logs (
  id uuid primary key default uuid_generate_v4(),
  booking_request_id uuid,
  message_type text not null,
  message_body text not null,
  status text not null default 'sent' check (status in ('sent','failed','delivered')),
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default uuid_generate_v4(),
  actor_user_id uuid references public.users(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  details jsonb,
  created_at timestamptz not null default now()
);

-- -------------------------------------------------------------------------
-- Site et paramètres
-- -------------------------------------------------------------------------

create table public.website_pages (
  id uuid primary key default uuid_generate_v4(),
  slug text not null unique,
  title text not null,
  meta_description text,
  is_published boolean not null default true,
  updated_at timestamptz not null default now()
);

create table public.website_blocks (
  id uuid primary key default uuid_generate_v4(),
  page_id uuid not null references public.website_pages(id) on delete cascade,
  block_type text not null,
  content jsonb not null default '{}'::jsonb,
  display_order integer not null default 0
);

create table public.settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table public.archives (
  id uuid primary key default uuid_generate_v4(),
  booking_request_id uuid not null references public.booking_requests(id),
  archived_at timestamptz not null default now(),
  archived_by uuid references public.users(id),
  retention_until date
);

-- -------------------------------------------------------------------------
-- Réglages par défaut
-- -------------------------------------------------------------------------

insert into public.travel_settings (origin_address, free_km_threshold, price_per_km, franchise_rule)
values ('Saint-Vincent-de-Tyrosse, France', 50, 0.80, 'round_trip');

insert into public.settings (key, value) values
  ('archive_retention_years', '2'),
  ('calendar_rolling_years', '2'),
  ('default_max_participants', '14');
