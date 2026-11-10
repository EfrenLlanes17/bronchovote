import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { BillStore, EMPTY_VOTE_COUNTS } from '../../services/bill-store';
import { Vote } from './vote';

describe('Vote', () => {
  let component: Vote;
  let fixture: ComponentFixture<Vote>;

  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();
    const billStore: Pick<BillStore, 'watchBill' | 'watchVoteCounts' | 'castVote'> = {
      watchBill: (id, onBill) => {
        onBill({ id, name: 'Community Health Funding Act', active: true });
        return () => undefined;
      },
      watchVoteCounts: (_id, onCounts) => {
        onCounts({ ...EMPTY_VOTE_COUNTS });
        return () => undefined;
      },
      castVote: async () => 1,
    };

    await TestBed.configureTestingModule({
      imports: [Vote],
      providers: [
        { provide: ActivatedRoute, useValue: { queryParamMap: of(convertToParamMap({ billId: 'CFR-452' })) } },
        { provide: BillStore, useValue: billStore },
      ],
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

  it('should display and record an Aye vote for the bill in the query parameter', async () => {
    const emailInput: HTMLInputElement = fixture.nativeElement.querySelector('#voter-email');
    emailInput.value = 'voter@example.com';
    fixture.nativeElement.querySelector('form').dispatchEvent(
      new SubmitEvent('submit', { bubbles: true, cancelable: true }),
    );
    fixture.detectChanges();

    const ayeButton: HTMLButtonElement = fixture.nativeElement.querySelector('.vote-option');
    expect(ayeButton.textContent).toContain('Aye');
    ayeButton.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Community Health Funding Act');
    expect(fixture.nativeElement.textContent).toContain('Your Aye vote has been recorded.');
    expect(ayeButton.querySelector('strong')?.textContent).toBe('1');
  });
});
