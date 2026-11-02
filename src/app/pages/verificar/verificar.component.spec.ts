import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideNgxMask } from 'ngx-mask';

import { VerificarComponent } from './verificar.component';

describe('VerificarComponent', () => {
  let component: VerificarComponent;
  let fixture: ComponentFixture<VerificarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VerificarComponent],
      providers: [provideRouter([]), provideNgxMask(), provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VerificarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
