export enum RankCharacter {
	Jack = 11,
	Queen,
	King,
	Ace,
}

/** Ranks with a rule of their own (a 4 makes the next player miss a turn). */
export const RANK_TWO = 2;
export const RANK_THREE = 3;
export const RANK_FOUR = 4;

/** A Jack can ask for any rank from 5 to 10, the ones without an effect. */
export const CALLABLE_RANKS = [5, 6, 7, 8, 9, 10];

export class Rank {
	value: RankCharacter | number;

	constructor(value: number) {
		if (value < 2 || value > 14) throw new Error(`Illegal value: ${value}`);
		if (value <= 10) this.value = value;
		else this.value = value as RankCharacter;
	}

	static getAllRanks(): Rank[] {
		const ranks = [];
		for (let i = 2; i <= 14; i++) ranks.push(new Rank(i));
		return ranks;
	}

	toString(): string {
		switch (this.value) {
			case RankCharacter.Jack:
				return "J";
			case RankCharacter.Queen:
				return "Q";
			case RankCharacter.King:
				return "K";
			case RankCharacter.Ace:
				return "A";
			default:
				return this.value.toString();
		}
	}
}
