import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RegrasSenhaComponent } from './regras-senha.component';

@Component({
  imports: [RegrasSenhaComponent],
  template: `<ajj-regras-senha [senha]="senha()" />`
})
class HospedeiroComponent {
  readonly senha = signal('');
}

describe('RegrasSenhaComponent', () => {
  let fixture: ComponentFixture<HospedeiroComponent>;

  beforeEach(async () => {
    fixture = TestBed.createComponent(HospedeiroComponent);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  const digitar = async (senha: string) => {
    fixture.componentInstance.senha.set(senha);
    fixture.detectChanges();
    await fixture.whenStable();
  };
  const itens = (): HTMLElement[] => Array.from(fixture.nativeElement.querySelectorAll('li'));
  const cumpridas = () => itens().filter(li => li.classList.contains('cumprida')).map(li => li.dataset['regra']);

  it('lista as seis regras com rótulo acessível', () => {
    const lista: HTMLElement = fixture.nativeElement.querySelector('ul');
    expect(lista.getAttribute('aria-label')).toBe('Requisitos da senha');
    expect(itens().length).toBe(6);
    expect(lista.textContent).toContain('Pelo menos 8 caracteres');
    expect(lista.textContent).toContain('Sem espaços');
  });

  it('começa com tudo pendente', () => {
    expect(cumpridas()).toEqual([]);
    expect(fixture.nativeElement.textContent).not.toContain('(atendido)');
  });

  it('marca as regras conforme a senha é digitada', async () => {
    await digitar('abc');
    expect(cumpridas()).toEqual(['minuscula', 'semEspaco']);

    await digitar('Abc1');
    expect(cumpridas()).toEqual(['maiuscula', 'minuscula', 'numero', 'semEspaco']);

    await digitar('Abc1!xyz');
    expect(cumpridas().length).toBe(6);
  });

  it('desmarca "sem espaços" quando há espaço', async () => {
    await digitar('Abc1!x yz');
    expect(cumpridas()).not.toContain('semEspaco');
  });

  it('informa o estado de cada regra para leitores de tela', async () => {
    await digitar('Abc1!xyz');
    const textos = itens().map(li => li.querySelector('.oculto')?.textContent);
    expect(textos.every(t => t === '(atendido)')).toBeTrue();
  });
});
