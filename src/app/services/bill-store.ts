import { Injectable } from '@angular/core';
import {
	DataSnapshot,
	get,
	onValue,
	remove,
	ref,
	runTransaction,
	type Unsubscribe,
} from 'firebase/database';
import { database } from '../firebase';

export interface Bill {
	id: string;
	name: string;
	active: boolean;
}

export interface BillVote {
	name: string;
	email: string;
	choice: VoteChoice;
}

export interface BillStats {
	bill: Bill;
	voteCounts: VoteCounts;
	votes: BillVote[];
}

export type VoteChoice = 'aye' | 'nay' | 'abstain';

export type VoteCounts = Record<VoteChoice, number>;

export const EMPTY_VOTE_COUNTS: VoteCounts = { aye: 0, nay: 0, abstain: 0 };

export type CastVoteResult = 'recorded' | 'already-voted' | 'unavailable';

@Injectable({ providedIn: 'root' })
export class BillStore {
	async deleteBill(id: string): Promise<void> {
		await remove(ref(database, `bills/${id.toLowerCase()}`));
	}

	watchActiveBills(onBills: (bills: Bill[]) => void, onError: (error: Error) => void): Unsubscribe {
		return onValue(
			ref(database, 'bills'),
			(snapshot) => onBills(this.readBills(snapshot)),
			(error) => onError(error),
		);
	}

	async createBill(id: string, name: string): Promise<boolean> {
		const billRef = ref(database, `bills/${id.toLowerCase()}`);
		const result = await runTransaction(
			billRef,
			(currentValue: unknown) =>
				currentValue === null ? { id, name, active: true } : undefined,
			{ applyLocally: false },
		);

		return result.committed;
	}

	watchBill(
		id: string,
		onBill: (bill: Bill | null) => void,
		onError: (error: Error) => void,
	): Unsubscribe {
		return onValue(
			ref(database, `bills/${id.toLowerCase()}`),
			(snapshot) => {
				const value: unknown = snapshot.val();
				onBill(this.isActiveBill(value) ? value : null);
			},
			onError,
		);
	}

	watchBillStats(
		id: string,
		onStats: (stats: BillStats | null) => void,
		onError: (error: Error) => void,
	): Unsubscribe {
		return onValue(
			ref(database, `bills/${id.toLowerCase()}`),
			(snapshot) => {
				const value: unknown = snapshot.val();
				if (!this.isActiveBill(value)) {
					onStats(null);
					return;
				}

				const record = value as unknown as Record<string, unknown>;
				const rawCounts = this.asRecord(record['voteCounts']);
				const voteCounts = { ...EMPTY_VOTE_COUNTS };
				for (const choice of Object.keys(voteCounts) as VoteChoice[]) {
					const count = rawCounts[choice];
					if (typeof count === 'number' && Number.isSafeInteger(count) && count >= 0) {
						voteCounts[choice] = count;
					}
				}

				const rawVotes = this.asRecord(record['votes']);
				const votes = Object.values(rawVotes).map((value) => this.toBillVote(value));
				onStats({ bill: value, voteCounts, votes });
			},
			onError,
		);
	}

	async hasVoted(id: string, email: string): Promise<boolean> {
		const voterKey = this.emailToVoterKey(email);
		const snapshot = await get(ref(database, `bills/${id.toLowerCase()}/votes/${voterKey}`));
		return snapshot.exists();
	}

	async castVote(id: string, choice: VoteChoice, email: string, name: string): Promise<CastVoteResult> {
		const billRef = ref(database, `bills/${id.toLowerCase()}`);
		const voterKey = this.emailToVoterKey(email);
		const voterEmail = email.trim();
		const voterName = name.trim();
		if (!voterEmail || !voterName) return 'unavailable';
		const result = await runTransaction(
			billRef,
			(currentValue: unknown) => {
				if (typeof currentValue !== 'object' || currentValue === null || !('active' in currentValue) || currentValue.active !== true) {
					return undefined;
				}

				const bill = currentValue as Record<string, unknown>;
				const votes = this.asRecord(bill['votes']);
				if (voterKey in votes) return undefined;

				const storedCounts = this.asRecord(bill['voteCounts']);
				const counts = { ...EMPTY_VOTE_COUNTS };
				for (const voteChoice of Object.keys(counts) as VoteChoice[]) {
					const count = storedCounts[voteChoice];
					if (typeof count === 'number' && Number.isSafeInteger(count) && count >= 0) {
						counts[voteChoice] = count;
					}
				}

				return {
					...bill,
					votes: {
						...votes,
						[voterKey]: { name: voterName, email: voterEmail, choice },
					},
					voteCounts: { ...counts, [choice]: counts[choice] + 1 },
				};
			},
			{ applyLocally: false },
		);

		if (result.committed) return 'recorded';

		const currentBill: unknown = result.snapshot.val();
		if (typeof currentBill === 'object' && currentBill !== null && 'votes' in currentBill) {
			const votes = this.asRecord(currentBill.votes);
			if (voterKey in votes) return 'already-voted';
		}
		return 'unavailable';
	}

	private emailToVoterKey(email: string): string {
		const bytes = new TextEncoder().encode(email.trim().toLowerCase());
		return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
	}

	private asRecord(value: unknown): Record<string, unknown> {
		return typeof value === 'object' && value !== null ? value as Record<string, unknown> : {};
	}

	private toBillVote(value: unknown): BillVote {
		if (typeof value === 'string' && this.isVoteChoice(value)) {
			return { name: 'Voter information unavailable', email: '—', choice: value };
		}
		const record = this.asRecord(value);
		return {
			name: typeof record['name'] === 'string' ? record['name'] : 'Voter information unavailable',
			email: typeof record['email'] === 'string' ? record['email'] : '—',
			choice: this.isVoteChoice(record['choice']) ? record['choice'] : 'abstain',
		};
	}

	private isVoteChoice(value: unknown): value is VoteChoice {
		return value === 'aye' || value === 'nay' || value === 'abstain';
	}

	private readBills(snapshot: DataSnapshot): Bill[] {
		const values: unknown = snapshot.val();
		if (typeof values !== 'object' || values === null) return [];

		return Object.values(values).filter(this.isActiveBill);
	}

	private isActiveBill(value: unknown): value is Bill {
		return (
			typeof value === 'object' &&
				value !== null &&
				'id' in value &&
				typeof value.id === 'string' &&
				'name' in value &&
				typeof value.name === 'string' &&
				'active' in value &&
				value.active === true
		);
	}
}