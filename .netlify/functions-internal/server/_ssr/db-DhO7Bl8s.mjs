//#region node_modules/.nitro/vite/services/ssr/assets/db-DhO7Bl8s.js
var FUNNEL_STAGES = [
	{
		key: "novo_lead",
		label: "Novo Lead"
	},
	{
		key: "primeiro_contato",
		label: "Primeiro Contato"
	},
	{
		key: "qualificado",
		label: "Qualificado"
	},
	{
		key: "reuniao_agendada",
		label: "Reunião Agendada"
	},
	{
		key: "proposta_enviada",
		label: "Proposta Enviada"
	},
	{
		key: "fechado",
		label: "Fechado"
	},
	{
		key: "cliente_ativo",
		label: "Cliente Ativo"
	},
	{
		key: "pos_venda",
		label: "Pós-venda"
	},
	{
		key: "reativar_60",
		label: "Reativar em 60 dias"
	}
];
var MESSAGE_CATEGORIES = [
	"Dia 1",
	"Dia 2",
	"Dia 3",
	"Dia 4",
	"Dia 5",
	"No Show",
	"Lembretes",
	"Qualificação",
	"Quebra de objeções",
	"Fechamento",
	"Importância",
	"Reativação"
];
var ORIGENS = [
	"Instagram",
	"Facebook",
	"Site",
	"Evento",
	"Indicação",
	"Outro"
];
function formatDate(d) {
	if (!d) return "—";
	return (typeof d === "string" ? new Date(d) : d).toLocaleDateString("pt-BR");
}
function formatDateTime(d) {
	if (!d) return "—";
	return (typeof d === "string" ? new Date(d) : d).toLocaleString("pt-BR", {
		dateStyle: "short",
		timeStyle: "short"
	});
}
//#endregion
export { formatDateTime as a, formatDate as i, MESSAGE_CATEGORIES as n, ORIGENS as r, FUNNEL_STAGES as t };
