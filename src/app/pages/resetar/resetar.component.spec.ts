import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResetarComponent } from './resetar.component';

describe('ResetarComponent', () => {
  let component: ResetarComponent;
  let fixture: ComponentFixture<ResetarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResetarComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ResetarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
