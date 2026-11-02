import { HttpErrorResponse } from '@angular/common/http';
import { codigoDeErro, mensagemDeErro } from './erro-api';

describe('erro-api', () => {
  const padrao = 'Padrão';

  it('usa o detail e o codigo do ProblemDetail', () => {
    const erro = new HttpErrorResponse({ status: 409, error: { detail: 'E-mail já cadastrado.', codigo: 'ERR005' } });

    expect(mensagemDeErro(erro, padrao)).toBe('E-mail já cadastrado.');
    expect(codigoDeErro(erro)).toBe('ERR005');
  });

  it('usa o padrão quando a rede falha', () => {
    expect(mensagemDeErro(new HttpErrorResponse({ status: 0 }), padrao)).toBe(padrao);
  });

  it('usa o padrão quando o corpo é HTML', () => {
    const erro = new HttpErrorResponse({ status: 502, error: '<html>Bad Gateway</html>' });

    expect(mensagemDeErro(erro, padrao)).toBe(padrao);
  });

  it('usa o padrão quando o detail está vazio', () => {
    expect(mensagemDeErro(new HttpErrorResponse({ status: 400, error: { detail: '' } }), padrao)).toBe(padrao);
  });

  it('lida com erro indefinido', () => {
    expect(mensagemDeErro(undefined, padrao)).toBe(padrao);
    expect(codigoDeErro(undefined)).toBeUndefined();
  });

  it('usa a mensagem padrão genérica sem segundo argumento', () => {
    expect(mensagemDeErro(undefined)).toBe('Algo deu errado!');
  });
});
