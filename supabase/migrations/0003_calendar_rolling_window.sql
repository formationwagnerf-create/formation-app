-- =========================================================================
-- Calendrier glissant : les clients doivent toujours pouvoir réserver
-- jusqu'à 2 ans à l'avance, et cette fenêtre doit avancer automatiquement
-- chaque jour (le 1er juillet 2026, on doit pouvoir voir jusqu'au
-- 1er juillet 2028, sans intervention manuelle).
--
-- Principe : une fonction génère les jours manquants à chaque exécution.
-- Un cron quotidien (voir docs/CRON.md) l'appelle une fois par jour pour
-- que la fenêtre avance toute seule, année après année.
-- =========================================================================

create or replace function public.extend_calendar_window()
returns void
language plpgsql
security definer
as $$
declare
  rolling_years int;
  target_end date;
  cursor_date date;
begin
  select coalesce((value->>0)::int, 2) into rolling_years
  from public.settings where key = 'calendar_rolling_years';

  target_end := current_date + (rolling_years || ' years')::interval;

  -- dernier jour déjà généré (ou aujourd'hui si table vide)
  select coalesce(max(day), current_date - interval '1 day') into cursor_date
  from public.calendar_days;

  -- génère tous les jours manquants entre le dernier jour connu et la
  -- nouvelle date cible, avec les 3 lignes (matin / après-midi / journée)
  insert into public.calendar_days (day, half_day, status)
  select d::date, h, 'available'
  from generate_series((cursor_date + interval '1 day')::date, target_end, interval '1 day') as d
  cross join (values ('morning'), ('afternoon'), ('full')) as halves(h)
  on conflict (day, half_day) do nothing;
end;
$$;

-- exécution initiale pour amorcer les 2 prochaines années
select public.extend_calendar_window();

-- -------------------------------------------------------------------------
-- Vue publique exposée aux clients : uniquement disponible / indisponible,
-- jamais la raison, jamais l'organisme concerné.
-- -------------------------------------------------------------------------

create or replace view public.calendar_public_view as
select
  day,
  half_day,
  case when status = 'available' then 'available' else 'unavailable' end as availability
from public.calendar_days
where day >= current_date;

grant select on public.calendar_public_view to authenticated, anon;

-- -------------------------------------------------------------------------
-- Fonction appelée quand une demande passe en "confirmée définitivement" :
-- bloque les jours correspondants dans le calendrier et empêche deux
-- organismes de confirmer la même date.
-- -------------------------------------------------------------------------

create or replace function public.lock_calendar_for_booking(
  p_booking_id uuid,
  p_start date,
  p_end date,
  p_half_day text
)
returns boolean
language plpgsql
security definer
as $$
declare
  already_taken int;
begin
  select count(*) into already_taken
  from public.calendar_days
  where day between p_start and p_end
    and (half_day = p_half_day or half_day = 'full' or p_half_day = 'full')
    and status <> 'available';

  if already_taken > 0 then
    return false; -- conflit : une autre confirmation a pris la date entre-temps
  end if;

  update public.calendar_days
  set status = 'booked', booking_request_id = p_booking_id
  where day between p_start and p_end
    and (half_day = p_half_day or p_half_day = 'full');

  return true;
end;
$$;
