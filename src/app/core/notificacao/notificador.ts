export abstract class Notificador {
  abstract sucesso(mensagem: string): Promise<void>;
  abstract erro(mensagem: string): Promise<void>;
  abstract aviso(mensagem: string): Promise<void>;
  abstract erroDaApi(erro: unknown, padrao?: string): Promise<void>;
  abstract confirmar(titulo: string, mensagem: string, confirmar?: string): Promise<boolean>;
}
