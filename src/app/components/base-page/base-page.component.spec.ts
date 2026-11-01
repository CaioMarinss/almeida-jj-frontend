import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BasePageComponent } from './base-page.component';

describe('BasePageComponent', () => {
  let component: BasePageComponent;
  let fixture: ComponentFixture<BasePageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BasePageComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(BasePageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the gym shell', () => {
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Gestão da academia');
    expect(fixture.nativeElement.querySelector('.base-page-shell')).toBeTruthy();
  });
});
