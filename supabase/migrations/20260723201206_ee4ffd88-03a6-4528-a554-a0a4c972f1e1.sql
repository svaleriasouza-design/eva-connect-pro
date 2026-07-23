-- Passos de cadência (roteiro editável dia a dia)
CREATE TABLE public.cadence_steps (
  day integer PRIMARY KEY CHECK (day >= 1 AND day <= 30),
  script text NOT NULL DEFAULT '',
  ai_instructions text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cadence_steps TO authenticated;
GRANT ALL ON public.cadence_steps TO service_role;
ALTER TABLE public.cadence_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read cadence_steps" ON public.cadence_steps FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth write cadence_steps" ON public.cadence_steps FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE TRIGGER trg_cadence_steps_updated BEFORE UPDATE ON public.cadence_steps FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Configurações globais da automação (singleton com id=true)
CREATE TABLE public.cadence_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  morning_time time NOT NULL DEFAULT '09:00',
  afternoon_time time NOT NULL DEFAULT '14:00',
  batch_size integer NOT NULL DEFAULT 10 CHECK (batch_size > 0 AND batch_size <= 500),
  timezone text NOT NULL DEFAULT 'America/Sao_Paulo',
  weekdays_only boolean NOT NULL DEFAULT true,
  auto_reply_enabled boolean NOT NULL DEFAULT true,
  automation_enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.cadence_settings TO authenticated;
GRANT ALL ON public.cadence_settings TO service_role;
ALTER TABLE public.cadence_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read cadence_settings" ON public.cadence_settings FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth write cadence_settings" ON public.cadence_settings FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE TRIGGER trg_cadence_settings_updated BEFORE UPDATE ON public.cadence_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.cadence_settings (id) VALUES (true) ON CONFLICT DO NOTHING;

-- Seed dos 5 dias iniciais (a partir do padrão atual, se ainda não existir)
INSERT INTO public.cadence_steps (day, script, ai_instructions) VALUES
  (1, 'Olá {{nome}}, aqui é a Valéria. Tudo bem? Gostaria de entender melhor como sua empresa está lidando com [tema]. Posso te mandar mais detalhes?', 'Se o cliente perguntar preço, explique que fazemos um diagnóstico gratuito primeiro. Se pedir para não receber mais, encerre educadamente. Se demonstrar interesse, sugira uma reunião.'),
  (2, 'Oi {{nome}}, passando para confirmar se recebeu minha mensagem. Faz sentido conversarmos rapidamente?', 'Se responder que está sem tempo, ofereça 15 minutos. Se pedir mais informações, envie o link do site. Se responder positivamente, agende reunião.'),
  (3, 'Olá {{nome}}, sei que sua rotina é corrida. Posso te enviar um resumo de 3 linhas do que fazemos?', 'Se aceitar, envie o resumo em bullets. Se recusar, respeite e encerre.'),
  (4, 'Oi {{nome}}, tenho um case parecido com o seu segmento. Quer que eu compartilhe?', 'Se aceitar, ofereça compartilhar via reunião de 15 minutos. Caso contrário, encerre.'),
  (5, 'Olá {{nome}}, esta é minha última mensagem por aqui. Caso queira retomar, é só me chamar. Um ótimo trabalho para você!', 'Se responder, retome o funil. Caso contrário, marque como não-contatar.')
ON CONFLICT (day) DO NOTHING;