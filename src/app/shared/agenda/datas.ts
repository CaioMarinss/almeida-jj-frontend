const DIA_MS = 86_400_000;

export const DIAS_SEMANA_CURTOS = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'];

function paraUtc(iso: string): number {
  const [ano, mes, dia] = iso.split('-').map(Number);
  return Date.UTC(ano, mes - 1, dia);
}

function paraIso(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function somarDias(iso: string, n: number): string {
  return paraIso(paraUtc(iso) + n * DIA_MS);
}

export function diaSemanaIso(iso: string): number {
  const dia = new Date(paraUtc(iso)).getUTCDay();
  return dia === 0 ? 7 : dia;
}

export function inicioDaSemana(iso: string): string {
  return somarDias(iso, 1 - diaSemanaIso(iso));
}

export function formatarDiaMes(iso: string): string {
  const [, mes, dia] = iso.split('-');
  return `${dia}/${mes}`;
}
