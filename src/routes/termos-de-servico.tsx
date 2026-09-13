import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, CalendarClock, CreditCard, FileCheck, Gavel, Lock, Mail, ScrollText, Share2, ShieldAlert, UserCheck } from "lucide-react";
import evaLogo from "@/assets/eva-logo.png";
import { PublicFooter } from "@/components/public-footer";

const TITLE = "Termos de Serviço — EVA";
const DESC =
  "Termos de uso da EVA | Assistente Virtual para Negócios: conta, responsabilidades, integrações, assinatura, disponibilidade e limitação de responsabilidade.";

export const Route = createFileRoute("/termos-de-servico")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div className="flex items-center gap-3">
            <img src={evaLogo} alt="EVA" width={36} height={36} className="rounded-md bg-primary/10 p-1" />
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold tracking-wide">EVA</span>
              <span className="text-[10px] uppercase text-muted-foreground">Assistente Virtual para Negócios</span>
            </div>
          </div>
          <Link to="/" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            <ArrowLeft className="h-4 w-4" />
            Voltar ao início
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Termos de Serviço — EVA</h1>
          <p className="mt-2 text-sm text-muted-foreground">Última atualização: 13 de setembro de 2026</p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileCheck className="h-5 w-5 text-[color:var(--gold)]" />
                1. Aceitação dos termos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-relaxed text-foreground/90">
              <p>
                Ao criar uma conta ou utilizar a <strong>EVA | Assistente Virtual para Negócios</strong>, o usuário
                declara ter lido e concordado com estes Termos de Serviço e com a{" "}
                <Link to="/politica-de-privacidade" className="text-primary hover:underline">
                  Política de Privacidade
                </Link>
                . Se não concordar, não utilize a plataforma.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ScrollText className="h-5 w-5 text-[color:var(--gold)]" />
                2. O que é a EVA
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-relaxed text-foreground/90">
              <p>
                A EVA é uma plataforma de apoio comercial com gestão de contatos e empresas (CRM), funil de vendas,
                cadências e disparos de mensagens, agenda, tarefas, histórico de interações, relatórios e uma assistente
                de inteligência artificial que auxilia no atendimento e no agendamento de reuniões.
              </p>
              <p>
                A assistente gera sugestões e respostas automaticamente. Cabe ao usuário revisar e supervisionar as
                comunicações e decisões comerciais.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <UserCheck className="h-5 w-5 text-[color:var(--gold)]" />
                3. Cadastro e responsabilidade pela conta
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-relaxed text-foreground/90">
              <p>
                O usuário deve fornecer informações verdadeiras no cadastro e manter suas credenciais em sigilo. Cada
                cadastro cria uma conta própria, com espaço de trabalho e assinatura independentes.
              </p>
              <p>
                O administrador da conta é responsável pelos acessos que conceder a outras pessoas e pelos perfis de
                permissão atribuídos a elas. Toda atividade realizada com as credenciais da conta é de responsabilidade
                do titular.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ShieldAlert className="h-5 w-5 text-[color:var(--gold)]" />
                4. Uso adequado da plataforma
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-relaxed text-foreground/90">
              <p>É vedado utilizar a plataforma para:</p>
              <ul className="ml-5 list-disc space-y-1">
                <li>envio de mensagens ilícitas, enganosas, ofensivas, fraudulentas ou não solicitadas em massa;</li>
                <li>tratar dados de terceiros sem base legal ou consentimento adequado;</li>
                <li>tentar burlar limites, medidas de segurança, autenticação ou isolamento entre contas;</li>
                <li>revender, copiar ou explorar a plataforma além do uso autorizado;</li>
                <li>violar a legislação brasileira ou as regras dos serviços integrados.</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <UserCheck className="h-5 w-5 text-[color:var(--gold)]" />
                5. Dados inseridos pelo usuário
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-relaxed text-foreground/90">
              <p>
                O conteúdo cadastrado ou importado no CRM, em contatos, empresas, agenda, tarefas e demais módulos
                pertence ao usuário, que é responsável por sua origem, exatidão, atualização e legalidade, bem como por
                atender solicitações dos titulares desses dados.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Share2 className="h-5 w-5 text-[color:var(--gold)]" />
                6. WhatsApp, Meta e integrações de terceiros
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-relaxed text-foreground/90">
              <p>
                O envio e recebimento de mensagens ocorre pela API oficial do WhatsApp (Meta Cloud API), com números e
                credenciais do próprio usuário. O usuário é integralmente responsável pelo conteúdo enviado, pela
                obtenção de consentimento dos contatos, pelo respeito às políticas da Meta e pelas consequências de
                bloqueios, banimentos, limites de qualidade ou restrições aplicadas pela Meta aos seus números.
              </p>
              <p>
                Integrações de terceiros são fornecidas como conveniência e estão sujeitas aos termos e à
                disponibilidade dos respectivos provedores. A EVA não responde por indisponibilidades, alterações ou
                decisões desses serviços.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CalendarClock className="h-5 w-5 text-[color:var(--gold)]" />
                7. Google Agenda
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-relaxed text-foreground/90">
              <p>
                A conexão com o Google Agenda é opcional e depende de autorização expressa do próprio usuário, feita no
                ambiente oficial do Google. O acesso limita-se às permissões concedidas e serve apenas às funcionalidades
                de agenda da EVA, como consultar disponibilidade e criar, atualizar, reagendar ou cancelar eventos.
              </p>
              <p>
                O usuário pode revogar a autorização a qualquer momento na plataforma ou na sua Conta Google. O uso da
                integração está sujeito às políticas do Google. A EVA não declara ser aprovada, verificada ou endossada
                pelo Google.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CreditCard className="h-5 w-5 text-[color:var(--gold)]" />
                8. Assinatura, pagamento e cancelamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-relaxed text-foreground/90">
              <p>
                O acesso à plataforma pode depender de assinatura ativa, de período de degustação ou de liberação
                concedida pela administração. Os valores, a periodicidade e as condições vigentes são apresentados na
                própria tela de assinatura no momento da contratação.
              </p>
              <p>
                O pagamento é processado por provedor externo de pagamentos. O cancelamento pode ser solicitado pelo
                usuário, encerrando a renovação seguinte; o acesso permanece disponível até o fim do período já pago.
                Em caso de inadimplência ou assinatura inativa, o acesso às funcionalidades pode ser suspenso.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ScrollText className="h-5 w-5 text-[color:var(--gold)]" />
                9. Disponibilidade e alterações
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-relaxed text-foreground/90">
              <p>
                A plataforma pode ser atualizada, aprimorada, modificada ou temporariamente interrompida para
                manutenção, correções ou evolução técnica. Funcionalidades podem ser alteradas ou descontinuadas, com
                aviso prévio aos usuários ativos sempre que possível. Não há garantia de operação ininterrupta e livre de
                falhas.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Lock className="h-5 w-5 text-[color:var(--gold)]" />
                10. Segurança e proteção de acesso
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-relaxed text-foreground/90">
              <p>
                A plataforma adota medidas de segurança como autenticação obrigatória, isolamento de dados por conta,
                permissões por perfil e armazenamento cifrado de credenciais de integrações. O usuário compromete-se a
                usar senha forte, não compartilhar acessos e comunicar imediatamente qualquer suspeita de uso indevido.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Gavel className="h-5 w-5 text-[color:var(--gold)]" />
                11. Propriedade intelectual
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-relaxed text-foreground/90">
              <p>
                O software, a marca EVA, a identidade visual, os textos, as telas e a estrutura da plataforma pertencem
                aos seus titulares e não podem ser copiados, modificados, distribuídos ou usados sem autorização. O uso
                da plataforma não transfere qualquer direito de propriedade intelectual ao usuário. Os dados inseridos
                pelo usuário permanecem dele.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ShieldAlert className="h-5 w-5 text-[color:var(--gold)]" />
                12. Limitação de responsabilidade
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-relaxed text-foreground/90">
              <p>
                A EVA é uma ferramenta de apoio e não garante resultados comerciais, vendas ou conversões. Na máxima
                extensão permitida pela lei, não responde por danos indiretos, lucros cessantes, perda de oportunidades,
                bloqueios aplicados por terceiros aos números ou contas do usuário, nem por consequências do conteúdo
                enviado pelo usuário ou aprovado por ele.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ShieldAlert className="h-5 w-5 text-[color:var(--gold)]" />
                13. Suspensão ou encerramento da conta
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-relaxed text-foreground/90">
              <p>
                A conta pode ser suspensa ou encerrada em caso de violação destes Termos, uso indevido, atividade ilícita
                ou risco à segurança da plataforma e de outros usuários. O usuário pode encerrar sua conta a qualquer
                momento solicitando pelo canal de contato.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileCheck className="h-5 w-5 text-[color:var(--gold)]" />
                14. Privacidade
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-relaxed text-foreground/90">
              <p>
                O tratamento de dados pessoais é descrito na{" "}
                <Link to="/politica-de-privacidade" className="text-primary hover:underline">
                  Política de Privacidade
                </Link>
                , que integra estes Termos. Aplica-se a Lei Geral de Proteção de Dados (Lei nº 13.709/2018) e a demais
                normas da legislação brasileira.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Mail className="h-5 w-5 text-[color:var(--gold)]" />
                15. Contato
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-relaxed text-foreground/90">
              <p>Dúvidas sobre estes Termos podem ser enviadas para:</p>
              <p className="font-medium">
                <a href="mailto:svaleriasouza@gmail.com" className="text-primary hover:underline">
                  svaleriasouza@gmail.com
                </a>
              </p>
            </CardContent>
          </Card>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
