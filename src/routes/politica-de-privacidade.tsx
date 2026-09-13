import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, CalendarClock, Database, Lock, Mail, ScrollText, Share2, Shield, Trash2, UserCheck } from "lucide-react";
import evaLogo from "@/assets/eva-logo.png";
import { PublicFooter } from "@/components/public-footer";

const TITLE = "Política de Privacidade — EVA";
const DESC =
  "Como a EVA | Assistente Virtual para Negócios trata dados de cadastro, contatos, CRM, agenda, WhatsApp e a integração com o Google Agenda.";

export const Route = createFileRoute("/politica-de-privacidade")({
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
  component: PrivacyPage,
});

function PrivacyPage() {
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
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Política de Privacidade — EVA</h1>
          <p className="mt-2 text-sm text-muted-foreground">Última atualização: 13 de setembro de 2026</p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ScrollText className="h-5 w-5 text-[color:var(--gold)]" />
                1. Quem é a EVA
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-relaxed text-foreground/90">
              <p>
                A <strong>EVA | Assistente Virtual para Negócios</strong> é uma plataforma de apoio comercial que reúne,
                em um só lugar, gestão de contatos e empresas (CRM), funil de vendas, agenda, tarefas, histórico de
                interações, envio de mensagens por WhatsApp e uma assistente de inteligência artificial que auxilia no
                atendimento e na organização da rotina comercial.
              </p>
              <p>
                Esta política explica quais dados a plataforma trata, com qual finalidade, por quanto tempo e quais são
                os direitos de quem tem dados tratados aqui.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Database className="h-5 w-5 text-[color:var(--gold)]" />
                2. Dados tratados na plataforma
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-relaxed text-foreground/90">
              <p>Dependendo do uso, a EVA pode tratar:</p>
              <ul className="ml-5 list-disc space-y-1">
                <li>
                  <strong>Dados de cadastro do usuário:</strong> nome, e-mail e informações da conta e do espaço de
                  trabalho.
                </li>
                <li>
                  <strong>Contatos e empresas:</strong> nome, nome fantasia, telefone/WhatsApp, e-mail e demais
                  informações comerciais inseridas ou importadas pelo próprio usuário.
                </li>
                <li>
                  <strong>CRM e funil:</strong> etapa da negociação, anotações, responsáveis e registros de
                  acompanhamento.
                </li>
                <li>
                  <strong>Agenda e tarefas:</strong> compromissos, horários, participantes e lembretes.
                </li>
                <li>
                  <strong>Histórico de interações:</strong> mensagens enviadas e recebidas, transcrições de áudios
                  recebidos, data, situação de entrega e qual número foi utilizado.
                </li>
                <li>
                  <strong>Dados técnicos mínimos:</strong> registros de acesso e de erros, necessários para segurança e
                  funcionamento.
                </li>
              </ul>
              <p>
                Todo conteúdo inserido pelo usuário fica isolado no espaço de trabalho da respectiva conta. Um usuário
                não acessa dados de outra conta.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Share2 className="h-5 w-5 text-[color:var(--gold)]" />
                3. WhatsApp e integrações de mensagens
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-relaxed text-foreground/90">
              <p>
                Quando o usuário conecta seus números por meio da API oficial do WhatsApp (Meta Cloud API), a EVA envia e
                recebe mensagens em nome desse usuário e registra o histórico dentro da plataforma, para que ele possa
                acompanhar o atendimento.
              </p>
              <p>
                O conteúdo dessas conversas é usado exclusivamente para operar o atendimento, dar continuidade às
                cadências e responder aos contatos. O envio de mensagens está sujeito também às regras da Meta, e o
                usuário é responsável por possuir base legal e consentimento adequados para falar com seus contatos.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CalendarClock className="h-5 w-5 text-[color:var(--gold)]" />
                4. Integração com o Google Agenda (Google Calendar)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-relaxed text-foreground/90">
              <p>
                A conexão com o Google Agenda é <strong>opcional</strong> e feita pelo próprio usuário. Ao clicar em
                conectar, o usuário é direcionado ao <strong>ambiente oficial do Google</strong>, onde faz a autenticação
                e escolhe se autoriza o acesso.
              </p>
              <ul className="ml-5 list-disc space-y-1">
                <li>
                  A EVA <strong>não recebe e não armazena a senha</strong> da conta Google. A autenticação acontece
                  inteiramente no Google.
                </li>
                <li>
                  A EVA acessa <strong>somente</strong> os dados e permissões que o usuário autorizou expressamente na
                  tela de consentimento do Google.
                </li>
                <li>
                  <strong>Finalidade de uso:</strong> os dados do Google Calendar são utilizados exclusivamente para
                  fornecer as funcionalidades de agenda da EVA — consultar disponibilidade de horários, criar, atualizar,
                  reagendar e cancelar eventos e gerar links de reunião, quando autorizado pelo usuário.
                </li>
                <li>
                  <strong>O que a EVA não faz:</strong> não utiliza dados obtidos do Google para publicidade
                  direcionada, não vende dados, não faz enriquecimento comercial para terceiros, não treina modelos de
                  inteligência artificial generalizados com esses dados e não os usa para qualquer finalidade não
                  relacionada às funcionalidades autorizadas.
                </li>
                <li>
                  <strong>Armazenamento:</strong> a autorização de acesso concedida pelo usuário é guardada de forma
                  cifrada nos servidores da plataforma, vinculada apenas àquele usuário, para que a agenda continue
                  funcionando inclusive quando a assistente agenda automaticamente. Eventos e horários são consultados
                  no Google no momento do uso; a EVA guarda apenas as referências necessárias para localizar e atualizar
                  os compromissos que ela mesma criou.
                </li>
                <li>
                  <strong>Retenção e exclusão:</strong> ao desconectar a integração em Configurações, a autorização é
                  revogada e removida da plataforma, e a EVA deixa imediatamente de acessar a agenda. O usuário também
                  pode revogar o acesso a qualquer momento nas configurações de segurança da sua Conta Google.
                </li>
              </ul>
              <p>
                O uso da integração está sujeito às políticas do Google. Esta plataforma não afirma ser aprovada,
                verificada ou endossada pelo Google.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Lock className="h-5 w-5 text-[color:var(--gold)]" />
                5. Segurança, armazenamento e retenção
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-relaxed text-foreground/90">
              <p>
                A EVA adota medidas técnicas e administrativas para proteger as informações: acesso somente por conta
                autenticada, separação de dados por espaço de trabalho com regras de acesso no banco de dados, tráfego
                criptografado, credenciais de integrações guardadas de forma cifrada e permissões diferentes por perfil
                de usuário (administrador, operador e leitor).
              </p>
              <p>
                Os dados são mantidos enquanto a conta estiver ativa e enquanto forem necessários às finalidades
                descritas aqui ou a obrigações legais. Encerrada a necessidade, os dados são excluídos ou anonimizados.
              </p>
              <p>
                Nenhum dado pessoal é vendido. Não há compartilhamento com terceiros para publicidade, marketing de
                terceiros ou finalidades alheias ao funcionamento da plataforma.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Share2 className="h-5 w-5 text-[color:var(--gold)]" />
                6. Fornecedores e integrações de terceiros
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-relaxed text-foreground/90">
              <p>
                Para funcionar, a plataforma utiliza fornecedores de infraestrutura e serviços, tratando os dados apenas
                na medida necessária: hospedagem e banco de dados em nuvem, envio e recebimento de mensagens pela API
                oficial do WhatsApp (Meta), Google Agenda quando o usuário conecta, serviços de inteligência artificial
                para gerar respostas e transcrever áudios recebidos, e processador de pagamentos para assinaturas.
              </p>
              <p>Esses fornecedores atuam conforme instruções da plataforma e suas próprias políticas de privacidade.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <UserCheck className="h-5 w-5 text-[color:var(--gold)]" />
                7. Responsabilidades do usuário
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-relaxed text-foreground/90">
              <p>
                Ao inserir ou importar dados de terceiros (contatos, empresas, listas), o usuário declara que possui base
                legal para esse tratamento e atua como controlador dessas informações, sendo responsável por sua
                exatidão, pelo consentimento quando exigido e pelo cumprimento das regras de comunicação comercial.
              </p>
              <p>
                O usuário também é responsável por manter sigilo de suas credenciais e por conceder acessos apenas a
                pessoas autorizadas dentro da sua conta.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="h-5 w-5 text-[color:var(--gold)]" />
                8. LGPD e direitos dos titulares
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-relaxed text-foreground/90">
              <p>
                O tratamento de dados observa a Lei Geral de Proteção de Dados (Lei nº 13.709/2018). O titular pode
                solicitar, a qualquer momento:
              </p>
              <ul className="ml-5 list-disc space-y-1">
                <li>confirmação da existência de tratamento e acesso aos dados;</li>
                <li>correção de dados incompletos, inexatos ou desatualizados;</li>
                <li>anonimização, bloqueio ou eliminação de dados desnecessários ou excessivos;</li>
                <li>portabilidade, nos termos da lei;</li>
                <li>informação sobre compartilhamentos e sobre a possibilidade de não consentir;</li>
                <li>revogação do consentimento e oposição a tratamentos realizados com base em outra hipótese legal.</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Trash2 className="h-5 w-5 text-[color:var(--gold)]" />
                9. Como solicitar acesso, correção ou exclusão
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-relaxed text-foreground/90">
              <p>
                Pedidos de acesso, correção ou exclusão de dados podem ser enviados por e-mail. Também é possível
                excluir contatos, listas importadas e registros diretamente na plataforma, e desconectar integrações em
                Configurações.
              </p>
              <p className="flex items-center gap-2 font-medium">
                <Mail className="h-4 w-4 text-primary" />
                <a href="mailto:svaleriasouza@gmail.com" className="text-primary hover:underline">
                  svaleriasouza@gmail.com
                </a>
              </p>
              <p>
                As solicitações são atendidas em até 15 (quinze) dias úteis, salvo quando houver obrigação legal ou
                regulatória de manutenção dos dados.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Mail className="h-5 w-5 text-[color:var(--gold)]" />
                10. Contato e atualizações
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-relaxed text-foreground/90">
              <p>
                Dúvidas sobre privacidade podem ser encaminhadas para{" "}
                <a href="mailto:svaleriasouza@gmail.com" className="text-primary hover:underline">
                  svaleriasouza@gmail.com
                </a>
                .
              </p>
              <p>
                Esta política pode ser atualizada para refletir mudanças na plataforma ou na legislação. A data da última
                atualização fica sempre indicada no topo desta página.
              </p>
              <p>
                Veja também os{" "}
                <Link to="/termos-de-servico" className="text-primary hover:underline">
                  Termos de Serviço
                </Link>
                .
              </p>
            </CardContent>
          </Card>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
