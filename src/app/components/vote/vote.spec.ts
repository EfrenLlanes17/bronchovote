import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Vote } from './vote';

describe('Vote', () => {
  let component: Vote;
  let fixture: ComponentFixture<Vote>;

  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();

    await TestBed.configureTestingModule({
      imports: [Vote],
    }).compileComponents();

    fixture = TestBed.createComponent(Vote);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should retain the submitted email when the page is recreated', async () => {
    const emailInput: HTMLInputElement = fixture.nativeElement.querySelector('#voter-email');
    const form: HTMLFormElement = fixture.nativeElement.querySelector('form');
    emailInput.value = 'voter@example.com';
    form.dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }));

    expect(localStorage.getItem('email')).toBe('voter@example.com');

    fixture.destroy();
    fixture = TestBed.createComponent(Vote);
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('.signed-in')?.textContent).toContain('voter@example.com');
  });
});
