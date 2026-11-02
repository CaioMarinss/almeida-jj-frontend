import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { provideNgxMask } from 'ngx-mask';
import { CampoComponent } from './campo.component';

@Component({
  imports: [CampoComponent, ReactiveFormsModule],
  template: `<form [formGroup]="form"><app-campo [formGroup]="form" formControlName="email" controlName="email" inputName="email" label="E-mail" /></form>`
})
class HospedeiroComponent {
  readonly form = new FormGroup({ email: new FormControl('', Validators.required) });
}

describe('CampoComponent', () => {
  let fixture: ComponentFixture<HospedeiroComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HospedeiroComponent],
      providers: [provideNgxMask()]
    }).compileComponents();
    fixture = TestBed.createComponent(HospedeiroComponent);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('não mostra erro antes de interagir', () => {
    expect(fixture.nativeElement.querySelector('.input-error')).toBeNull();
  });

  it('mostra erro depois que o formulário pai marca tudo como tocado', async () => {
    fixture.componentInstance.form.markAllAsTouched();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('.input-error')?.textContent).toContain('Este campo é obrigatório.');
  });

  it('propaga o valor digitado para o formulário', async () => {
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
    input.value = 'ana@example.com';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.form.value.email).toBe('ana@example.com');
  });
});
