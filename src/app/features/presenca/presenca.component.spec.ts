import { TestBed } from '@angular/core/testing';
import { provedoresApp } from '../testes-app';
import { PresencaComponent } from './presenca.component';

describe('PresencaComponent', () => {
  it('mostra estado vazio sem dados fictícios', async () => {
    TestBed.configureTestingModule({ imports: [PresencaComponent], providers: provedoresApp() });
    const fixture = TestBed.createComponent(PresencaComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const tela = fixture.nativeElement as HTMLElement;

    expect(tela.querySelector('ajj-estado-vazio')).toBeTruthy();
    expect(/\d/.test(tela.textContent ?? '')).toBeFalse();
  });
});
