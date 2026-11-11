import { Perfil } from '../../core/auth/usuario';
import { GraduacaoAtual } from '../graduacao/graduacao.model';

export interface PessoaAcademia {
  id: number;
  nome: string;
  email: string;
  perfil: Perfil;
}

export interface AlunoPainel {
  id: number;
  nome: string;
  email: string;
  perfil: Perfil;
  atual: GraduacaoAtual | null;
  ultimaPresenca: string | null;
  diasSemTreinar: number | null;
  sumido: boolean;
}
