import { RANK_THREE, RANK_TWO, Rank, RankCharacter } from "./Rank";
import { Suit } from "./Suit";

export interface Card {
	rank: Rank;
	suit: Suit;
}

/** Number of cards the next player has to pick after this card, 0 if none. */
export const penaltyOf = (card: Card): number => {
	switch (card.rank.value) {
		case RANK_TWO:
			return 2;
		case RANK_THREE:
			return 3;
		case RankCharacter.King:
			return card.suit === Suit.HEARTS || card.suit === Suit.SPADES
				? 5
				: 0;
		default:
			return 0;
	}
};
