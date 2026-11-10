import { Injectable } from '@angular/core';
import {
	DataSnapshot,
	onValue,
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

export type VoteChoice = 'aye' | 'nay' | 'abstain';

export type VoteCounts = Record<VoteChoice, number>;

export const EMPTY_VOTE_COUNTS: VoteCounts = { aye: 0, nay: 0, abstain: 0 };

@Injectable({ providedIn: 'root' })
export class BillStore {
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

	watchVoteCounts(
		id: string,
		onCounts: (counts: VoteCounts) => void,
		onError: (error: Error) => void,
	): Unsubscribe {
		return onValue(
			ref(database, `bills/${id.toLowerCase()}/voteCounts`),
			(snapshot) => {
				const value: unknown = snapshot.val();
				const counts = { ...EMPTY_VOTE_COUNTS };
				if (typeof value === 'object' && value !== null) {
					for (const choice of Object.keys(counts) as VoteChoice[]) {
						const count = (value as Record<string, unknown>)[choice];
						if (typeof count === 'number' && Number.isSafeInteger(count) && count >= 0) {
							counts[choice] = count;
						}
					}
				}
				onCounts(counts);
			},
			onError,
		);
	}

	async castVote(id: string, choice: VoteChoice): Promise<number | null> {
		const countRef = ref(database, `bills/${id.toLowerCase()}/voteCounts/${choice}`);
		const result = await runTransaction(
			countRef,
			(currentValue: unknown) => {
				if (currentValue === null) return 1;
				if (typeof currentValue === 'number' && Number.isSafeInteger(currentValue) && currentValue >= 0) {
					return currentValue + 1;
				}
				return undefined;
			},
			{ applyLocally: false },
		);

		const updatedCount: unknown = result.snapshot.val();
		return result.committed && typeof updatedCount === 'number' ? updatedCount : null;
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