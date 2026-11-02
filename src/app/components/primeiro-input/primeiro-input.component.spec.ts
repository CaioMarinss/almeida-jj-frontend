/// <reference types="jasmine" />
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup } from '@angular/forms';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideNgxMask } from 'ngx-mask';

import { PrimeiroInputComponent } from './primeiro-input.component';

describe('PrimeiroInputComponent', () => {
  let component: PrimeiroInputComponent;
  let fixture: ComponentFixture<PrimeiroInputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrimeiroInputComponent],
      providers: [provideRouter([]), provideNgxMask(), provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PrimeiroInputComponent);
    component = fixture.componentInstance;
    // O componente recebe o FormGroup do formulário pai.
    component.formGroup = new FormGroup({ email: new FormControl('') });
    component.controlName = 'email';
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
