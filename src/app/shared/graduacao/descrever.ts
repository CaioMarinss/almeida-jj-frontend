import { Faixa } from './graduacao.model';

export function descreverGraduacao(faixa: Faixa, grau: number): string {
  if (faixa.categoria === 'MESTRE') {
    return `${faixa.descricao} · ${grau}º grau`;
  }
  if (grau === 0) {
    return `${faixa.descricao} · sem graus`;
  }
  return `${faixa.descricao} · ${grau} ${grau === 1 ? 'grau' : 'graus'}`;
}

export function formatarDiaMes(data: string): string {
  const [, mes, dia] = data.split('-');
  return `${dia}/${mes}`;
}

export function formatarMesAno(data: string): string {
  const [ano, mes] = data.split('-');
  return `${mes}/${ano}`;
}

export function hojeLocal(): string {
  const agora = new Date();
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const dia = String(agora.getDate()).padStart(2, '0');
  return `${agora.getFullYear()}-${mes}-${dia}`;
}
