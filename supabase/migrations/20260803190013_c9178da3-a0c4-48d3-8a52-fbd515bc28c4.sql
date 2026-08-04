-- Normalização de Cargos (Agora que os enums foram comitados)
UPDATE public.organization_members SET role = 'admin' WHERE role = 'owner';
UPDATE public.organization_members SET role = 'veterinarian' WHERE role = 'member';

-- Aplicação de RLS de isolamento por organização em todas as tabelas
DO $$ 
DECLARE 
  table_name_var text;
  tables_to_protect text[] := ARRAY['clients', 'appointments', 'pets', 'vaccines', 'odontograms', 'properties', 'odontogram_teeth', 'medical_records', 'herd_animals', 'rural_visits', 'document_shares', 'audit_logs', 'google_calendar_configs', 'financial_transactions'];
BEGIN 
  FOREACH table_name_var IN ARRAY tables_to_protect 
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name_var);
    EXECUTE format('DROP POLICY IF EXISTS "Org isolation" ON public.%I', table_name_var);
    
    -- Política especial para financeiro (Recepção não vê)
    IF table_name_var = 'financial_transactions' THEN
      EXECUTE format('CREATE POLICY "Org isolation" ON public.%I FOR ALL TO authenticated USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND role IN (''admin'', ''veterinarian''))) WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND role IN (''admin'', ''veterinarian'')))', table_name_var);
    ELSE
      EXECUTE format('CREATE POLICY "Org isolation" ON public.%I FOR ALL TO authenticated USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid())) WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()))', table_name_var);
    END IF;
  END LOOP;
END $$;

-- Garantir GRANTs para todas as tabelas
DO $$ 
DECLARE 
  table_name_var text;
BEGIN 
  FOR table_name_var IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT IN ('organizations', 'organization_members', 'profiles')) 
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', table_name_var);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', table_name_var);
  END LOOP;
END $$;
