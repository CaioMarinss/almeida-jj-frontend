import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LayoutAuthComponent } from './layout-auth.component';

describe('LayoutAuthComponent', () => {
  let fixture: ComponentFixture<LayoutAuthComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [LayoutAuthComponent] }).compileComponents();
    fixture = TestBed.createComponent(LayoutAuthComponent);
    fixture.componentRef.setInput('title', 'Entrar');
    fixture.componentRef.setInput('primeiroBotao', 'Login');
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('renderiza título e botão principal', () => {
    const texto: string = fixture.nativeElement.textContent;

    expect(texto).toContain('Entrar');
    expect(texto).toContain('Login');
  });

  it('emite submit ao clicar no botão principal', () => {
    let emitiu = false;
    fixture.componentInstance.submit.subscribe(() => (emitiu = true));

    (fixture.nativeElement.querySelector('.primeiro-btn') as HTMLButtonElement).click();

    expect(emitiu).toBeTrue();
  });
});
