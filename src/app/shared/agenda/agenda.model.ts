export type Modalidade = 'GI' | 'NO_GI' | 'KIDS' | 'TEENS' | 'DEFESA_PESSOAL';

export const MODALIDADES: Modalidade[] = ['GI', 'NO_GI', 'KIDS', 'TEENS', 'DEFESA_PESSOAL'];

export const ROTULO_MODALIDADE: Record<Modalidade, string> = {
  GI: 'Gi',
  NO_GI: 'No-Gi',
  KIDS: 'Kids',
  TEENS: 'Teens',
  DEFESA_PESSOAL: 'Defesa Pessoal',
};

export const CLASSE_CHIP_MODALIDADE: Record<Modalidade, string> = {
  GI: 'ajj-chip-modalidade--gi',
  NO_GI: 'ajj-chip-modalidade--no-gi',
  KIDS: 'ajj-chip-modalidade--kids',
  TEENS: 'ajj-chip-modalidade--teens',
  DEFESA_PESSOAL: 'ajj-chip-modalidade--defesa-pessoal',
};

export interface AulaDoDia {
  id: number;
  inicio: string;
  fim: string;
  modalidade: Modalidade;
  avulsa: boolean;
  motivo: string | null;
  cancelada: boolean;
  motivoCancelamento: string | null;
  vao: number;
  euVou: boolean;
  janelaFechada: boolean;
  podeMarcar: boolean;
}

export interface DiaAgenda {
  data: string;
  diaCancelado: { motivo: string | null } | null;
  aulas: AulaDoDia[];
}

export interface AulaGrade {
  id: number;
  diaSemana: number;
  inicio: string;
  fim: string;
  modalidade: Modalidade;
}

export type TipoExcecao = 'DIA' | 'AULA' | 'AVULSA';

export interface Excecao {
  tipo: TipoExcecao;
  id: number;
  data: string;
  aula: { inicio: string; fim: string; modalidade: Modalidade } | null;
  motivo: string | null;
  passada: boolean;
}

export interface NovaAulaGrade {
  diaSemana: number;
  inicio: string;
  fim: string;
  modalidade: Modalidade;
}

export interface EdicaoAula {
  inicio: string;
  fim: string;
  modalidade: Modalidade;
}

export interface NovoCancelamento {
  data: string;
  idAula?: number;
  motivo?: string;
}

export interface NovaAvulsa {
  data: string;
  inicio: string;
  fim: string;
  modalidade: Modalidade;
  motivo?: string;
}
