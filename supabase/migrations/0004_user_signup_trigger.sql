-- =========================================================================
-- Quand quelqu'un s'inscrit via Supabase Auth, on crée automatiquement
-- sa ligne dans public.users (sans organisation ni rôle définitif —
-- ces informations sont complétées juste après par signUpOrganization()
-- ou par l'admin lors de l'ajout manuel d'un utilisateur).
-- =========================================================================

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.users (id, email, first_name, last_name, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    'client_user'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- -------------------------------------------------------------------------
-- Empêche un org_admin de modifier le rôle ou l'organisme d'un autre
-- utilisateur que ceux de son propre organisme (sécurité supplémentaire
-- en plus de la policy RLS déjà en place sur organization_users).
-- -------------------------------------------------------------------------

create or replace function public.is_org_admin_of(target_org uuid)
returns boolean language sql stable as $$
  select exists (
    select 1 from public.organization_users ou
    where ou.user_id = auth.uid()
      and ou.organization_id = target_org
      and ou.is_org_admin = true
  );
$$;
