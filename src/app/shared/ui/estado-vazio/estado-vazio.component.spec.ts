import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { EstadoVazioComponent } from './estado-vazio.component';

@Component({
  imports: [EstadoVazioComponent],
  template: `<ajj-estado-vazio titulo="Em breve" texto="Suas aulas aparecem aqui."><span icone class="icone-teste"></span></ajj-estado-vazio>`
})
class HospedeiroComponent {}

describe('EstadoVazioComponent', () => {
  it('mostra título, texto e ícone projetado', async () => {
    const fixture = TestBed.createComponent(HospedeiroComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const texto: string = fixture.nativeElement.textContent;

    expect(texto).toContain('Em breve');
    expect(texto).toContain('Suas aulas aparecem aqui.');
    expect(fixture.nativeElement.querySelector('.icone-teste')).toBeTruthy();
  });
});
