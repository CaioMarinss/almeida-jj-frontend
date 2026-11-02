import { TestBed } from '@angular/core/testing';
import { SessionService } from './session.service';
import { Usuario } from './usuario';

function jwt(segundosAteExpirar: number): string {
  const exp = Math.floor(Date.now() / 1000) + segundosAteExpirar;
  const payload = btoa(JSON.stringify({ exp })).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `cabecalho.${payload}.assinatura`;
}

describe('SessionService', () => {
  const usuario: Usuario = { id: 1, nome: 'Ana', email: 'ana@example.com', perfil: 'ALUNO' };

  beforeEach(() => sessionStorage.clear());
  afterEach(() => sessionStorage.clear());

  function nova(): SessionService {
    TestBed.resetTestingModule();
    return TestBed.inject(SessionService);
  }

  it('persiste a sessão e recupera numa nova instância', () => {
    nova().iniciar('TK', usuario);

    const recuperada = nova();
    expect(recuperada.autenticado()).toBeTrue();
    expect(recuperada.usuario()).toEqual(usuario);
    expect(recuperada.token()).toBe('TK');
  });

  it('encerrar limpa tudo', () => {
    const sessao = nova();
    sessao.iniciar('TK', usuario);

    sessao.encerrar();

    expect(sessao.autenticado()).toBeFalse();
    expect(sessao.token()).toBeNull();
    expect(sessionStorage.length).toBe(0);
  });

  it('trata JSON corrompido como deslogado', () => {
    sessionStorage.setItem('ajj.token', 'TK');
    sessionStorage.setItem('ajj.usuario', '{quebrado');

    expect(nova().autenticado()).toBeFalse();
  });

  it('trata o formato antigo como deslogado', () => {
    sessionStorage.setItem('auth-token', 'TK');
    sessionStorage.setItem('username', 'Ana');

    expect(nova().autenticado()).toBeFalse();
  });

  it('descarta ao restaurar um token expirado', () => {
    nova().iniciar(jwt(-60), usuario);

    const restaurada = nova();

    expect(restaurada.autenticado()).toBeFalse();
    expect(sessionStorage.getItem('ajj.token')).toBeNull();
  });

  it('sessaoValida encerra a sessão quando o token expira', () => {
    const sessao = nova();
    sessao.iniciar(jwt(-1), usuario);

    expect(sessao.sessaoValida()).toBeFalse();
    expect(sessao.autenticado()).toBeFalse();
  });

  it('sessaoValida aceita token dentro da validade', () => {
    const sessao = nova();
    sessao.iniciar(jwt(3600), usuario);

    expect(sessao.sessaoValida()).toBeTrue();
  });
});
