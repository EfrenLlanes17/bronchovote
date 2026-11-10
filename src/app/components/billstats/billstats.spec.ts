import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { BillStore, EMPTY_VOTE_COUNTS } from '../../services/bill-store';
import { Billstats } from './billstats';

describe('Billstats', () => {
  let component: Billstats;
  let fixture: ComponentFixture<Billstats>;

  beforeEach(async () => {
    const billStore: Pick<BillStore, 'watchBillStats'> = {
      watchBillStats: (_id, onStats) => {
        onStats({
          bill: { id: 'CFR-452', name: 'Community Health Funding Act', active: true },
          voteCounts: { ...EMPTY_VOTE_COUNTS, aye: 2, nay: 1 },
          votes: [
            { name: 'A Voter', email: 'voter@example.com', choice: 'aye' },
            { name: 'Another Voter', email: 'another@example.com', choice: 'nay' },
            { name: 'Third Voter', email: 'third@example.com', choice: 'aye' },
          ],
        });
        return () => undefined;
      },
    };

    await TestBed.configureTestingModule({
      imports: [Billstats],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ billId: 'CFR-452' })) } },
        { provide: BillStore, useValue: billStore },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Billstats);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show live tallies and each voter ballot', () => {
    expect(fixture.nativeElement.textContent).toContain('Community Health Funding Act');
    expect(fixture.nativeElement.textContent).toContain('A Voter');
    expect(fixture.nativeElement.textContent).toContain('voter@example.com');
    expect(fixture.nativeElement.textContent).toContain('Aye');
    expect(fixture.nativeElement.textContent).toContain('3');
  });
});
