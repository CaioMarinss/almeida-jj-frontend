import { Perfil } from '../../core/auth/usuario';

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
}

export interface AlunoGraduacao {
  id: number;
  nome: string;
  email: string;
  perfil: Perfil;
  atual: GraduacaoAtual | null;
}

export interface PaginaAlunos {
  itens: AlunoGraduacao[];
  pagina: number;
  tamanho: number;
  total: number;
}

export interface FiltroAlunos {
  nome?: string;
  faixa?: number | 'sem';
  pagina: number;
  tamanho: number;
}
