import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular';
import { LayoutAuthComponent } from './layout-auth.component';

describe('LayoutAuthComponent', () => {
  let fixture: ComponentFixture<LayoutAuthComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({ imports: [LayoutAuthComponent], providers: [provideIonicAngular()] });
    fixture = TestBed.createComponent(LayoutAuthComponent);
    fixture.componentRef.setInput('titulo', 'Entrar');
    fixture.componentRef.setInput('subtitulo', 'Bem-vindo de volta');
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('mostra título e subtítulo', () => {
    const texto: string = fixture.nativeElement.textContent;

    expect(texto).toContain('Entrar');
    expect(texto).toContain('Bem-vindo de volta');
  });

  it('mostra o logo com texto alternativo', () => {
    expect(fixture.nativeElement.querySelector('img.logo')?.getAttribute('alt')).toBe('Almeida Jiu-Jitsu');
  });
});
