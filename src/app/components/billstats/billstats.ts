import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import type { Unsubscribe } from 'firebase/database';
import type { Subscription } from 'rxjs';
import { BillStore } from '../../services/bill-store';
import type { BillStats, VoteChoice } from '../../services/bill-store';

@Component({
  imports: [RouterLink],
  selector: 'app-billstats',
  styleUrl: './billstats.css',
  templateUrl: './billstats.html',
})
export class Billstats implements OnInit, OnDestroy {
  protected billId = signal('');
  protected stats = signal<BillStats | null>(null);
  protected loading = signal(true);
  protected errorMessage = signal('');
  protected readonly voteLabels: Record<VoteChoice, string> = {
    aye: 'Aye',
    nay: 'Nay',
    abstain: 'Abstain',
  };

  private routeSubscription?: Subscription;
  private stopWatching?: Unsubscribe;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly billStore: BillStore,
  ) {}

  ngOnInit(): void {
    this.routeSubscription = this.route.paramMap.subscribe((params) => {
      this.loadBillStats(params.get('billId') ?? '');
    });
  }

  ngOnDestroy(): void {
    this.routeSubscription?.unsubscribe();
    this.stopWatching?.();
  }

  protected totalVotes(): number {
    const counts = this.stats()?.voteCounts;
    return counts ? counts.aye + counts.nay + counts.abstain : 0;
  }

  private loadBillStats(id: string): void {
    this.stopWatching?.();
    this.billId.set(id);
    this.stats.set(null);
    this.errorMessage.set('');

    if (!/^[A-Za-z0-9_-]+$/.test(id)) {
      this.loading.set(false);
      this.errorMessage.set('The bill ID is invalid.');
      return;
    }

    this.loading.set(true);
    this.stopWatching = this.billStore.watchBillStats(
      id,
      (stats) => {
        this.stats.set(stats);
        this.loading.set(false);
        if (!stats) this.errorMessage.set('This bill could not be found or is inactive.');
      },
      () => {
        this.loading.set(false);
        this.errorMessage.set('Could not load bill details. Check database read permissions.');
      },
    );
  }
}
