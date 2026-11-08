export function hojeEmSaoPaulo(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
}

export function somarDias(iso: string, dias: number): string {
  const [ano, mes, dia] = iso.split('-').map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia + dias)).toISOString().slice(0, 10);
}

export function diaDaSemanaIso(iso: string): number {
  const [ano, mes, dia] = iso.split('-').map(Number);
  const dow = new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay();
  return dow === 0 ? 7 : dow;
}

export function dataDaSemana(semanasAFrente: number, diaSemana: number): string {
  const hoje = hojeEmSaoPaulo();
  const segunda = somarDias(hoje, 1 - diaDaSemanaIso(hoje));
  return somarDias(segunda, semanasAFrente * 7 + diaSemana - 1);
}

export function diaMes(iso: string): string {
  const [, mes, dia] = iso.split('-');
  return `${dia}/${mes}`;
}
