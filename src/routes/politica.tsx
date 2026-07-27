import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollText, Shield, Trash2, Mail, ArrowLeft } from "lucide-react";
import evaLogo from "@/assets/eva-logo.png";

export const Route = createFileRoute("/politica")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade e Termos — EVA ASSISTENTE" },
      { name: "description", content: "Política de Privacidade, Termos de Serviço e instruções de exclusão de dados do aplicativo EVA ASSISTENTE." },
      { property: "og:title", content: "Política de Privacidade e Termos — EVA ASSISTENTE" },
      { property: "og:description", content: "Política de Privacidade, Termos de Serviço e instruções de exclusão de dados do aplicativo EVA ASSISTENTE." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Política de Privacidade e Termos — EVA ASSISTENTE" },
      { name: "twitter:description", content: "Política de Privacidade, Termos de Serviço e instruções de exclusão de dados do aplicativo EVA ASSISTENTE." },
    ],
  }),
  component: PoliticaPage,
});

function PoliticaPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <img src={evaLogo} alt="EVA ASSISTENTE" width={36} height={36} className="rounded-md bg-primary/10 p-1" />
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold tracking-wide">EVA ASSISTENTE</span>
              <span className="text-[10px] uppercase text-muted-foreground">Bio Impact</span>
            </div>
          </div>
          <Link
            to="/auth"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Política de Privacidade, Termos de Serviço e Exclusão de Dados
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Última atualização: 27 de julho de 2026
          </p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ScrollText className="h-5 w-5 text-[color:var(--gold)]" />
                1. Coleta e Uso de Dados
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm leading-relaxed text-foreground/90">
              <p>
                O aplicativo <strong>EVA ASSISTENTE</strong> coleta e processa dados pessoais e comerciais
                exclusivamente para a operacionalização do atendimento e gestão do sistema.
              </p>
              <p>Os dados tratados podem incluir:</p>
              <ul className="ml-5 list-disc space-y-1">
                <li>Nome e nome fantasia;</li>
                <li>Endereço de e-mail;</li>
                <li>Número de telefone e WhatsApp;</li>
                <li>Histórico de mensagens trocadas dentro da plataforma.</li>
              </ul>
              <p>
                Essas informações são utilizadas para viabilizar o relacionamento comercial, o envio de
                mensagens via WhatsApp, o acompanhamento de cadências, o registro de interações no CRM e a
                geração de relatórios internos de gestão.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="h-5 w-5 text-[color:var(--gold)]" />
                2. Privacidade e Compartilhamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm leading-relaxed text-foreground/90">
              <p>
                A privacidade dos usuários e leads é uma prioridade. O EVA ASSISTENTE não compartilha dados
                pessoais com terceiros para fins publicitários, de marketing ou qualquer outra finalidade
                além da operação do próprio sistema.
              </p>
              <p>
                O tratamento de dados é realizado em conformidade com a Lei Geral de Proteção de Dados
                (LGPD — Lei nº 13.709/2018) e demais normas aplicáveis. Medidas técnicas e administrativas
                são adotadas para proteger as informações contra acessos não autorizados, perdas ou
                alterações indevidas.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Trash2 className="h-5 w-5 text-[color:var(--gold)]" />
                3. Exclusão de Dados
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm leading-relaxed text-foreground/90">
              <p>
                O usuário pode solicitar a exclusão de seus dados pessoais a qualquer momento. Para exercer
                esse direito, basta enviar um e-mail solicitando a exclusão para:
              </p>
              <p className="flex items-center gap-2 font-medium">
                <Mail className="h-4 w-4 text-primary" />
                <a href="mailto:svaleriasouza@gmail.com" className="text-primary hover:underline">
                  svaleriasouza@gmail.com
                </a>
              </p>
              <p>
                Após o recebimento da solicitação, a equipe do EVA ASSISTENTE procederá com a exclusão ou
                anonimização dos dados no prazo máximo de 15 (quinze) dias úteis, salvo quando houver
                obrigação legal ou regulatória de manutenção.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ScrollText className="h-5 w-5 text-[color:var(--gold)]" />
                4. Termos de Serviço
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm leading-relaxed text-foreground/90">
              <p>
                Ao utilizar o EVA ASSISTENTE, o usuário concorda com os presentes Termos de Serviço e se
                compromete a utilizar a plataforma de forma lícita, respeitando a legislação brasileira e as
                diretrizes de uso da Meta Cloud API e demais integrações habilitadas.
              </p>
              <p>
                O usuário é responsável pelas informações inseridas na plataforma, pelo consentimento adequado
                dos contatos com os quais se comunica e pelo cumprimento das regras de envio de mensagens
                comerciais.
              </p>
              <p>
                O EVA ASSISTENTE pode ser atualizado, modificado ou descontinuado a qualquer momento, com
                comunicação prévia aos usuários ativos sempre que possível.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Mail className="h-5 w-5 text-[color:var(--gold)]" />
                5. Contato
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm leading-relaxed text-foreground/90">
              <p>
                Dúvidas sobre privacidade, termos de uso ou exclusão de dados podem ser encaminhadas para:
              </p>
              <p className="font-medium">
                <a href="mailto:svaleriasouza@gmail.com" className="text-primary hover:underline">
                  svaleriasouza@gmail.com
                </a>
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-10 text-center">
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para o login
          </Link>
        </div>
      </main>

      <footer className="border-t border-border bg-card py-6">
        <div className="mx-auto max-w-3xl px-4 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} EVA ASSISTENTE · Bio Impact. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
}
