import { Rank } from "./Rank";
import { RankCharacter } from "./Rank";
import { Suit } from "./Suit";

export class Card {
	constructor(
		public rank: Rank,
		public suit: Suit,
	) {}
}

/** Number of cards the next player has to pick after this card, 0 if none. */
export const penaltyOf = (card: Card): number => {
	switch (card.rank.value) {
		case 2:
			return 2;
		case 3:
			return 3;
		case RankCharacter.King:
			return card.suit === Suit.HEARTS || card.suit === Suit.SPADES
				? 5
				: 0;
		default:
			return 0;
	}
};
