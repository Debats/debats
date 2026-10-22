-- Les tables projetées depuis le journal reçoivent leur updated_at de l'événement
-- (occurred_at). Le trigger qui l'écrasait par now() était invisible en direct
-- (même transaction) mais rendait un rejeu du journal infidèle. Les tables encore
-- écrites directement (contributors, draft_statements, invitations) gardent le leur.

DROP TRIGGER IF EXISTS update_arguments_updated_at ON public.arguments;
DROP TRIGGER IF EXISTS update_organisation_memberships_updated_at ON public.organisation_memberships;
DROP TRIGGER IF EXISTS update_organisations_updated_at ON public.organisations;
DROP TRIGGER IF EXISTS update_positions_updated_at ON public.positions;
DROP TRIGGER IF EXISTS update_public_figures_updated_at ON public.public_figures;
DROP TRIGGER IF EXISTS update_statements_updated_at ON public.statements;
DROP TRIGGER IF EXISTS update_subjects_updated_at ON public.subjects;
