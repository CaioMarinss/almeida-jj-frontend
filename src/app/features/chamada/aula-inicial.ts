import { AulaDoDia } from '../../shared/agenda/agenda.model';

const MARGEM_MINUTOS = 30;

const FORMATADOR_HORA = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'America/Sao_Paulo',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23'
});

export function agoraEmSaoPaulo(): string {
  return FORMATADOR_HORA.format(new Date());
}

function minutos(hora: string): number {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
}

export function aulaInicial(aulas: AulaDoDia[], agora: string): AulaDoDia | null {
  const ativas = aulas.filter(a => !a.cancelada);
  const naHora = ativas.find(a => minutos(a.fim) + MARGEM_MINUTOS > minutos(agora));
  return naHora ?? ativas[ativas.length - 1] ?? aulas[0] ?? null;
}
