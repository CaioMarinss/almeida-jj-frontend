import { Perfil } from '../../core/auth/usuario';
import { CicloPresenca } from '../presenca/presenca.model';

export type Categoria = 'INFANTIL' | 'ADULTO' | 'MESTRE';

export interface Faixa {
  id: number;
  codigo: string;
  descricao: string;
  categoria: Categoria;
  corPrincipal: string;
  corSecundaria: string | null;
  grauMin: number;
  grauMax: number;
}

export interface GraduacaoAtual {
  faixa: Faixa;
  grau: number;
}

export interface RegistroGraduacao {
  id: number;
  faixa: Faixa;
  grau: number;
  data: string;
}

export interface MinhaGraduacao {
  atual: GraduacaoAtual | null;
  historico: RegistroGraduacao[];
  proxima: string | null;
  presencas: CicloPresenca | null;
}

export interface AlunoGraduacao {
  id: number;
  nome: string;
  email: string;
  perfil: Perfil;
  atual: GraduacaoAtual | null;
}

export interface ProximaGraduacao {
  data: string;
  minimoGrau: number | null;
  minimoFaixa: number | null;
}

export interface Sugestao {
  faixa: Faixa;
  grau: number;
}

export interface Apto {
  id: number;
  nome: string;
  atual: GraduacaoAtual | null;
  contadas: number;
  minimo: number | null;
  apto: boolean;
  sugestao: Sugestao | null;
  exame: ExameApto | null;
  graduado: boolean;
}

export interface ExameApto {
  aprovado: boolean;
  nota: number;
  observacao: string | null;
}

export interface Exame {
  id: number;
  evento: { id: number; data: string };
  aprovado: boolean;
  nota: number;
  observacao: string | null;
}

export interface ListaAptos {
  evento: ProximaGraduacao;
  grau: Apto[];
  faixa: Apto[];
}
