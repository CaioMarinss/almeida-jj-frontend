import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VerificaremailComponent } from './verificaremail.component';

describe('VerificaremailComponent', () => {
  let component: VerificaremailComponent;
  let fixture: ComponentFixture<VerificaremailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VerificaremailComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VerificaremailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
