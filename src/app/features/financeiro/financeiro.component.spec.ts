import { TestBed } from '@angular/core/testing';
import { provedoresApp } from '../testes-app';
import { FinanceiroComponent } from './financeiro.component';

describe('FinanceiroComponent', () => {
  it('mostra estado vazio sem dados fictícios', async () => {
    TestBed.configureTestingModule({ imports: [FinanceiroComponent], providers: provedoresApp() });
    const fixture = TestBed.createComponent(FinanceiroComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const tela = fixture.nativeElement as HTMLElement;

    expect(tela.querySelector('ajj-estado-vazio')).toBeTruthy();
    expect(/\d/.test(tela.textContent ?? '')).toBeFalse();
  });
});
