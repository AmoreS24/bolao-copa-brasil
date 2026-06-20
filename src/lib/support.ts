export const SUPPORT_WHATSAPP_URL = "https://wa.me/5593992071492";
export const OFFICIAL_WHATSAPP_GROUP_URL = process.env.NEXT_PUBLIC_WHATSAPP_GROUP_URL?.trim()
  || `${SUPPORT_WHATSAPP_URL}?text=${encodeURIComponent("Olá! Quero entrar no Grupo Oficial do Bolão Jogos do Brasil.")}`;
