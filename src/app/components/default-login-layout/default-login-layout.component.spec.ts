import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideNgxMask } from 'ngx-mask';

import { DefaultLoginLayoutComponent } from './default-login-layout.component';

describe('DefaultLoginLayoutComponent', () => {
  let component: DefaultLoginLayoutComponent;
  let fixture: ComponentFixture<DefaultLoginLayoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DefaultLoginLayoutComponent],
      providers: [provideRouter([]), provideNgxMask(), provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DefaultLoginLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
