//#region node_modules/.nitro/vite/services/ssr/assets/auth-messages-UqrGqD3e.js
var PASSWORD_RULES = [
	{
		id: "len",
		label: "No mínimo 8 caracteres",
		test: (v) => v.length >= 8
	},
	{
		id: "upper",
		label: "Pelo menos uma letra maiúscula",
		test: (v) => /[A-ZÀ-Ý]/.test(v)
	},
	{
		id: "lower",
		label: "Pelo menos uma letra minúscula",
		test: (v) => /[a-zà-ÿ]/.test(v)
	},
	{
		id: "digit",
		label: "Pelo menos um número",
		test: (v) => /\d/.test(v)
	},
	{
		id: "special",
		label: "Pelo menos um caractere especial (@, #, !, %, &…)",
		test: (v) => /[^A-Za-zÀ-ÿ0-9]/.test(v)
	}
];
function passwordChecks(value) {
	return PASSWORD_RULES.map((r) => ({
		...r,
		ok: r.test(value)
	}));
}
function isPasswordStrong(value) {
	return PASSWORD_RULES.every((r) => r.test(value));
}
var PATTERNS = [
	[/known to be weak|easy to guess|pwned|compromised/i, "A senha escolhida é muito fraca ou muito comum. Escolha uma senha mais segura seguindo os requisitos acima."],
	[/password should be at least|at least \d+ characters|too short/i, "A senha é curta demais. Use no mínimo 8 caracteres."],
	[/should contain at least one character of each|password does not meet|weak password/i, "A senha não atende aos requisitos. Confira a lista de requisitos acima."],
	[/invalid login credentials|invalid credentials/i, "E-mail ou senha incorretos. Confira os dados e tente novamente."],
	[/email not confirmed/i, "Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada."],
	[/user already registered|already been registered|already exists/i, "Já existe uma conta com este e-mail. Faça login ou recupere sua senha."],
	[/unable to validate email address|invalid email/i, "E-mail inválido. Verifique o endereço digitado."],
	[/signups? not allowed|signup is disabled/i, "Os cadastros estão temporariamente desativados. Fale com um administrador."],
	[/for security purposes.*(\d+) seconds/i, "Muitas tentativas em sequência. Aguarde alguns segundos e tente novamente."],
	[/email rate limit|over_email_send_rate_limit|rate limit exceeded/i, "Limite de envios de e-mail atingido. Tente novamente em alguns minutos."],
	[/user not found/i, "Não encontramos uma conta com este e-mail."],
	[/new password should be different/i, "A nova senha precisa ser diferente da senha atual."],
	[/same as the old password/i, "A nova senha precisa ser diferente da senha atual."],
	[/token has expired|invalid token|otp_expired/i, "O link expirou ou já foi usado. Solicite um novo link de recuperação."],
	[/auth session missing|session_not_found|refresh token/i, "Sua sessão expirou. Entre novamente para continuar."],
	[/captcha/i, "Não foi possível validar a verificação de segurança. Tente novamente."],
	[/failed to fetch|network|load failed/i, "Falha de conexão. Verifique sua internet e tente novamente."],
	[/anonymous sign-?ins are disabled/i, "Cadastro anônimo não permitido. Informe um e-mail válido."],
	[/password.*(required|missing)/i, "Informe uma senha para continuar."]
];
function translateAuthError(err, fallback = "Não foi possível continuar. Tente novamente.") {
	const raw = typeof err === "string" ? err : err && typeof err === "object" && "message" in err ? String(err.message ?? "") : "";
	if (!raw) return fallback;
	for (const [pattern, message] of PATTERNS) if (pattern.test(raw)) return message;
	if (/[áàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ]/.test(raw)) return raw;
	return fallback;
}
//#endregion
export { passwordChecks as n, translateAuthError as r, isPasswordStrong as t };
