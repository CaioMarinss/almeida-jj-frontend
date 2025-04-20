import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrimeiroInputComponent } from './primeiro-input.component';

describe('PrimeiroInputComponent', () => {
  let component: PrimeiroInputComponent;
  let fixture: ComponentFixture<PrimeiroInputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrimeiroInputComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PrimeiroInputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
