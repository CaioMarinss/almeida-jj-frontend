import { TestBed } from '@angular/core/testing';
import { provedoresApp } from '../testes-app';
import { AulasComponent } from './aulas.component';

describe('AulasComponent', () => {
  it('mostra estado vazio sem dados fictícios', async () => {
    TestBed.configureTestingModule({ imports: [AulasComponent], providers: provedoresApp() });
    const fixture = TestBed.createComponent(AulasComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const tela = fixture.nativeElement as HTMLElement;

    expect(tela.querySelector('ajj-estado-vazio')).toBeTruthy();
    expect(/\d/.test(tela.textContent ?? '')).toBeFalse();
  });
});
