import { Faixa } from './graduacao.model';

export function descreverGrau(faixa: Faixa, grau: number): string {
  if (faixa.categoria === 'MESTRE') {
    return `${grau}º grau`;
  }
  if (grau === 0) {
    return 'sem graus';
  }
  return `${grau} ${grau === 1 ? 'grau' : 'graus'}`;
}

export function descreverGraduacao(faixa: Faixa, grau: number): string {
  return `${faixa.descricao} · ${descreverGrau(faixa, grau)}`;
}

export function formatarDiaMes(data: string): string {
  const [, mes, dia] = data.split('-');
  return `${dia}/${mes}`;
}

export function formatarMesAno(data: string): string {
  const [ano, mes] = data.split('-');
  return `${mes}/${ano}`;
}

const FORMATADOR_SAO_PAULO = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
});

export function hojeEmSaoPaulo(): string {
  return FORMATADOR_SAO_PAULO.format(new Date());
}

export function formatarNota(nota: number): string {
  return nota.toFixed(1).replace('.', ',');
}
