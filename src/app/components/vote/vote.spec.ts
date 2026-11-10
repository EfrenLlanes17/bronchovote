import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { BillStore } from '../../services/bill-store';
import { Vote } from './vote';

describe('Vote', () => {
  let component: Vote;
  let fixture: ComponentFixture<Vote>;
  let voterHasVoted: boolean;
  let savedBallot: { id: string; choice: string; email: string; name: string } | undefined;

  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();
    voterHasVoted = false;
    savedBallot = undefined;
    const billStore: Pick<BillStore, 'watchBill' | 'hasVoted' | 'castVote'> = {
      watchBill: (id, onBill) => {
        onBill({ id, name: 'Community Health Funding Act', active: true });
        return () => undefined;
      },
      hasVoted: async () => voterHasVoted,
      castVote: async (id, choice, email, name) => {
        if (voterHasVoted) return 'already-voted';
        voterHasVoted = true;
        savedBallot = { id, choice, email, name };
        return 'recorded';
      },
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
    const nameInput: HTMLInputElement = fixture.nativeElement.querySelector('#voter-name');
    const emailInput: HTMLInputElement = fixture.nativeElement.querySelector('#voter-email');
    const form: HTMLFormElement = fixture.nativeElement.querySelector('form');
    nameInput.value = 'Voter Name';
    emailInput.value = 'voter@example.com';
    form.dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(localStorage.getItem('email')).toBe('voter@example.com');
    expect(localStorage.getItem('name')).toBe('Voter Name');

    fixture.destroy();
    fixture = TestBed.createComponent(Vote);
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('.signed-in')?.textContent).toContain('voter@example.com');
  });

  it('should display and record an Aye vote for the bill in the query parameter', async () => {
    const nameInput: HTMLInputElement = fixture.nativeElement.querySelector('#voter-name');
    const emailInput: HTMLInputElement = fixture.nativeElement.querySelector('#voter-email');
    nameInput.value = 'Voter Name';
    emailInput.value = 'voter@example.com';
    fixture.nativeElement.querySelector('form').dispatchEvent(
      new SubmitEvent('submit', { bubbles: true, cancelable: true }),
    );
    await fixture.whenStable();
    fixture.detectChanges();

    const ayeButton: HTMLButtonElement = fixture.nativeElement.querySelector('.vote-option');
    expect(ayeButton.textContent).toContain('Aye');
    ayeButton.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Community Health Funding Act');
    expect(fixture.nativeElement.textContent).toContain('Your Aye vote has been recorded.');
    expect(fixture.nativeElement.textContent).not.toContain('0');
    expect(ayeButton.disabled).toBe(true);
    expect(savedBallot).toEqual({
      id: 'CFR-452',
      choice: 'aye',
      email: 'voter@example.com',
      name: 'Voter Name',
    });
  });

  it('should disable voting when the same email already voted on this bill', async () => {
    voterHasVoted = true;
    localStorage.setItem('email', 'voter@example.com');
    localStorage.setItem('name', 'Voter Name');
    fixture.destroy();
    fixture = TestBed.createComponent(Vote);
    await fixture.whenStable();
    fixture.detectChanges();

    const voteButtons = fixture.nativeElement.querySelectorAll('.vote-option');
    expect(fixture.nativeElement.textContent).toContain('already been recorded for this bill');
    expect(voteButtons.length).toBe(3);
    expect(Array.from(voteButtons).every((button: Element) => (button as HTMLButtonElement).disabled)).toBe(true);
  });
});
