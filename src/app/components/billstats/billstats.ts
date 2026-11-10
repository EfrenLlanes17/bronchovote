import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import type { Unsubscribe } from 'firebase/database';
import type { Subscription } from 'rxjs';
import * as QRCode from 'qrcode';
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
  protected votingUrl = signal('');
  protected qrCodeSvg = signal<SafeHtml | null>(null);
  protected qrCodeMarkup = signal('');
  protected qrError = signal('');
  protected deleting = signal(false);
  protected deleteError = signal('');
  protected readonly voteLabels: Record<VoteChoice, string> = {
    aye: 'Aye',
    nay: 'Nay',
    abstain: 'Abstain',
  };

  private routeSubscription?: Subscription;
  private stopWatching?: Unsubscribe;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly sanitizer: DomSanitizer,
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

  protected downloadQrCode(): void {
    const markup = this.qrCodeMarkup();
    if (!markup) return;

    const url = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `bill-${this.billId()}-vote-qr.svg`;
    link.click();
    URL.revokeObjectURL(url);
  }

  protected async deleteBill(): Promise<void> {
    const bill = this.stats()?.bill;
    if (!bill || this.deleting()) return;

    const confirmed = window.confirm(
      `Delete “${bill.name}” and all of its vote records? This cannot be undone.`,
    );
    if (!confirmed) return;

    this.deleting.set(true);
    this.deleteError.set('');
    try {
      await this.billStore.deleteBill(bill.id);
      await this.router.navigate(['/admin']);
    } catch {
      this.deleteError.set('Could not delete the bill. Check database write permissions and try again.');
      this.deleting.set(false);
    }
  }

  private loadBillStats(id: string): void {
    this.stopWatching?.();
    this.billId.set(id);
    this.stats.set(null);
    this.errorMessage.set('');
    this.votingUrl.set('');
    this.qrCodeSvg.set(null);
    this.qrCodeMarkup.set('');
    this.qrError.set('');

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
        if (!stats) {
          this.errorMessage.set('This bill could not be found or is inactive.');
        } else {
          this.createVotingQrCode(stats.bill.id);
        }
      },
      () => {
        this.loading.set(false);
        this.errorMessage.set('Could not load bill details. Check database read permissions.');
      },
    );
  }

  private async createVotingQrCode(id: string): Promise<void> {
    const urlTree = this.router.createUrlTree(['/vote'], { queryParams: { billId: id } });
    const url = `${window.location.origin}${this.router.serializeUrl(urlTree)}`;
    this.votingUrl.set(url);
    try {
      const markup = await QRCode.toString(url, {
        type: 'svg',
        width: 200,
        margin: 2,
        errorCorrectionLevel: 'M',
      });
      if (this.billId() !== id) return;
      this.qrCodeMarkup.set(markup);
      this.qrCodeSvg.set(this.sanitizer.bypassSecurityTrustHtml(markup));
    } catch {
      this.qrError.set('Could not generate the voting QR code.');
    }
  }
}
