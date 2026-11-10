import { Modalidade } from '../agenda/agenda.model';

export type OrigemPresenca = 'ALUNO' | 'PROFESSOR' | 'DONO' | 'IA';

export const ROTULO_ORIGEM: Record<OrigemPresenca, string> = {
  ALUNO: 'contada',
  PROFESSOR: 'incluída pelo professor',
  DONO: 'incluída pelo dono',
  IA: 'registrada pela IA',
};

export interface CicloPresenca {
  trilha: 'GRAU' | 'FAIXA';
  desde: string | null;
  ate: string | null;
  minimo: number | null;
  contadas: number;
}

export interface PresencaContada {
  data: string;
  inicio: string;
  modalidade: Modalidade;
  origem: OrigemPresenca;
}

export interface MinhasPresencas {
  ciclo: CicloPresenca | null;
  presencas: PresencaContada[];
}

export interface PresencaDaAula {
  idAluno: number;
  nome: string;
  origem: OrigemPresenca;
  registradoPor: string | null;
  dthrRegistro: string;
}

export interface Chamada {
  presencas: PresencaDaAula[];
  podeAjustar: boolean;
  ajustaAte: string | null;
}

export interface PrazoChamada {
  ajustaDesde: string | null;
}

export interface Sumido {
  id: number;
  nome: string;
  ultimaPresenca: string;
  diasSemTreinar: number;
}

export interface Sumidos {
  dias: number;
  alunos: Sumido[];
}
