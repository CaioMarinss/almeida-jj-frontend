const MENSAGEM_PADRAO = 'Algo deu errado!';

function corpoDoErro(erro: unknown): Record<string, unknown> | undefined {
  if (!erro || typeof erro !== 'object') {
    return undefined;
  }
  const corpo = (erro as { error?: unknown }).error;
  return corpo && typeof corpo === 'object' ? (corpo as Record<string, unknown>) : undefined;
}

export function mensagemDeErro(erro: unknown, padrao = MENSAGEM_PADRAO): string {
  const detail = corpoDoErro(erro)?.['detail'];
  return typeof detail === 'string' && detail.trim() ? detail : padrao;
}

export function codigoDeErro(erro: unknown): string | undefined {
  const codigo = corpoDoErro(erro)?.['codigo'];
  return typeof codigo === 'string' ? codigo : undefined;
}
