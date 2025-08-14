-- Create admin audit log table for tracking admin actions
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  action text NOT NULL,
  details jsonb,
  user_id text,
  ip_address text,
  user_agent text
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS admin_audit_log_created_at_idx ON public.admin_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS admin_audit_log_action_idx ON public.admin_audit_log (action);
CREATE INDEX IF NOT EXISTS admin_audit_log_user_id_idx ON public.admin_audit_log (user_id);