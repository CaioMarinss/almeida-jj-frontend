import { ROTULO_MODALIDADE } from '../agenda/agenda.model';
import { DIAS_SEMANA_CURTOS, diaSemanaIso, formatarDiaMes } from '../agenda/datas';
import { pluralPresencas } from './plural';
import { CicloPresenca, PresencaContada, ROTULO_ORIGEM } from './presenca.model';

export interface ItemPresenca {
  chave: string;
  dia: string;
  aula: string;
  origem: string;
}

export interface ResumoCiclo {
  titulo: string;
  trilha: string;
  desde: string;
  faltam: string | null;
  progresso: { atual: number; maximo: number; percentual: number } | null;
}

function capitalizar(texto: string): string {
  return texto.charAt(0) + texto.slice(1).toLowerCase();
}

export function resumirCiclo(ciclo: CicloPresenca, atingiu = 'Você já atingiu o mínimo'): ResumoCiclo {
  const desde = ciclo.desde ? `contando desde ${formatarDiaMes(ciclo.desde)}` : 'contando desde o início';
  const trilha = ciclo.trilha === 'FAIXA' ? 'troca de faixa' : 'troca de grau';
  const base = { trilha, desde, faltam: null, progresso: null };
  if (!ciclo.ate) {
    const quando = ciclo.desde ? `desde ${formatarDiaMes(ciclo.desde)}` : 'contadas';
    return { ...base, titulo: `${pluralPresencas(ciclo.contadas)} ${quando}` };
  }
  if (ciclo.minimo === null) {
    return { ...base, titulo: `${pluralPresencas(ciclo.contadas)} · mínimo não definido` };
  }
  const falta = Math.max(ciclo.minimo - ciclo.contadas, 0);
  const percentual = ciclo.minimo > 0 ? Math.min(Math.round((ciclo.contadas / ciclo.minimo) * 100), 100) : 100;
  return {
    ...base,
    titulo: `${ciclo.contadas} de ${ciclo.minimo} presenças até a graduação de ${formatarDiaMes(ciclo.ate)}`,
    faltam: falta > 0 ? `Faltam ${falta}` : atingiu,
    progresso: ciclo.minimo > 0 ? { atual: Math.min(ciclo.contadas, ciclo.minimo), maximo: ciclo.minimo, percentual } : { atual: 1, maximo: 1, percentual }
  };
}

export function itemDePresenca(p: PresencaContada): ItemPresenca {
  return {
    chave: `${p.data}#${p.inicio}#${p.modalidade}`,
    dia: `${capitalizar(DIAS_SEMANA_CURTOS[diaSemanaIso(p.data) - 1])} ${formatarDiaMes(p.data)}`,
    aula: `${p.inicio} ${ROTULO_MODALIDADE[p.modalidade]}`,
    origem: ROTULO_ORIGEM[p.origem]
  };
}
