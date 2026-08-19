INSERT INTO public.platform_access (user_id, is_platform_admin)
VALUES ('c236dfde-1811-4b86-a2da-8cf2f503cce6', true)
ON CONFLICT (user_id) DO UPDATE SET is_platform_admin = true, access_revoked = false, updated_at = now();

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_name text;
  v_ws uuid;
BEGIN
  v_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1));

  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, v_name)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.platform_access (user_id, is_platform_admin)
  VALUES (NEW.id, lower(COALESCE(NEW.email,'')) IN ('svaleriasouza@gmail.com','svaleriacosta@hotmail.com'))
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.workspaces (name)
  VALUES (COALESCE(NULLIF(NEW.raw_user_meta_data->>'company_name',''), v_name || ' — Workspace'))
  RETURNING id INTO v_ws;

  INSERT INTO public.user_roles (user_id, role, workspace_id)
  VALUES (NEW.id, 'admin', v_ws);

  INSERT INTO public.workspace_settings (workspace_id, name, tagline, owner_name)
  VALUES (v_ws, COALESCE(NULLIF(NEW.raw_user_meta_data->>'company_name',''), v_name), 'Assistente Executiva', v_name);

  INSERT INTO public.cadence_settings (workspace_id) VALUES (v_ws);

  INSERT INTO public.cadence_steps (workspace_id, day, script, ai_instructions, active) VALUES
    (v_ws, 1, 'Olá {{nome}}, tudo bem? Sou a EVA, assistente comercial. Posso te mostrar rapidamente como ajudamos empresas como a sua?', 'Se houver interesse, ofereça uma conversa de 15 minutos e proponha dia e horário.', true),
    (v_ws, 2, 'Oi {{nome}}, passando para saber se faz sentido conversarmos esta semana?', 'Qualifique: contexto, dor e prioridade. Uma pergunta por mensagem.', true),
    (v_ws, 3, 'Olá {{nome}}, consegui separar dois horários esta semana. Prefere manhã ou tarde?', 'Conduza para o agendamento com opções concretas.', true),
    (v_ws, 4, 'Oi {{nome}}, ainda faz sentido falarmos sobre isso?', 'Trate objeções com empatia e faça uma pergunta de reengajamento.', true),
    (v_ws, 5, '{{nome}}, vou encerrar meu contato por aqui. Se quiser retomar, basta me chamar!', 'Última mensagem do ciclo. Não se despeça definitivamente, deixe a porta aberta.', true);

  RETURN NEW;
END;
$function$;