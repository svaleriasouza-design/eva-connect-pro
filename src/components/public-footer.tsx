import { Link } from "@tanstack/react-router";

export function PublicFooter() {
  return (
    <footer className="border-t border-border bg-card py-6">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 px-4 text-center text-xs text-muted-foreground">
        <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          <Link to="/" className="hover:text-foreground hover:underline">
            Início
          </Link>
          <Link to="/politica-de-privacidade" className="hover:text-foreground hover:underline">
            Política de Privacidade
          </Link>
          <Link to="/termos-de-servico" className="hover:text-foreground hover:underline">
            Termos de Serviço
          </Link>
        </nav>
        <div>© {new Date().getFullYear()} EVA · Assistente Virtual para Negócios · Bio Impact</div>
      </div>
    </footer>
  );
}
