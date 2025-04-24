import { TestBed } from '@angular/core/testing';
import { AuthGuard } from './authguard.service'; // Certifique-se de que este é o nome correto da classe

describe('AuthGuard', () => {
  let service: AuthGuard;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AuthGuard);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
