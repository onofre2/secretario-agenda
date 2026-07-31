import { Linking } from "react-native";

export function montarMensagemConfirmacao(data: string, horario: string): string {
  return `Sua consulta sera em *${data}* as *${horario}*.\n\nPor favor, confirme sua presenca ou ausencia respondendo esta mensagem.`;
}

export function abrirWhatsApp(numero: string, mensagem: string): Promise<void> {
  const numeroLimpo = numero.replace(/\D/g, "");
  const url = `https://wa.me/55${numeroLimpo}?text=${encodeURIComponent(mensagem)}`;
  return Linking.openURL(url);
}
