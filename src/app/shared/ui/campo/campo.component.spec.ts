import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { provideIonicAngular } from '@ionic/angular';
import { CampoComponent } from './campo.component';

@Component({
  imports: [CampoComponent, ReactiveFormsModule],
  template: `<form [formGroup]="form">
    <app-campo [formGroup]="form" formControlName="email" controlName="email" inputName="email" label="E-mail" />
    <app-campo [formGroup]="form" formControlName="cpf" controlName="cpf" inputName="cpf" label="CPF" formato="cpf" />
  </form>`
})
class HospedeiroComponent {
  readonly form = new FormGroup({
    email: new FormControl('', Validators.required),
    cpf: new FormControl('')
  });
}

describe('CampoComponent', () => {
  let fixture: ComponentFixture<HospedeiroComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({ imports: [HospedeiroComponent], providers: [provideIonicAngular()] });
    fixture = TestBed.createComponent(HospedeiroComponent);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  const digitar = async (indice: number, valor: string) => {
    const input: HTMLElement = fixture.nativeElement.querySelectorAll('ion-input')[indice];
    input.dispatchEvent(new CustomEvent('ionInput', { detail: { value: valor } }));
    fixture.detectChanges();
    await fixture.whenStable();
  };

  it('não mostra erro antes de interagir', () => {
    expect(fixture.nativeElement.querySelector('.erro')).toBeNull();
  });

  it('mostra erro depois que o formulário pai marca tudo como tocado', async () => {
    fixture.componentInstance.form.markAllAsTouched();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('.erro')?.textContent).toContain('Este campo é obrigatório.');
  });

  it('propaga o valor digitado para o formulário', async () => {
    await digitar(0, 'ana@example.com');

    expect(fixture.componentInstance.form.value.email).toBe('ana@example.com');
  });

  it('formata o CPF ao digitar', async () => {
    await digitar(1, '52998224725');

    expect(fixture.componentInstance.form.value.cpf).toBe('529.982.247-25');
  });

  it('usa teclado numérico no CPF', () => {
    const cpf: HTMLElement = fixture.nativeElement.querySelectorAll('ion-input')[1];

    expect(cpf.getAttribute('inputmode')).toBe('numeric');
  });
});
