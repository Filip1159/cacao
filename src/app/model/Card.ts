import { RANK_FOUR, RANK_THREE, RANK_TWO, Rank, RankCharacter } from "./Rank";
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

/** Whether the card has an effect on the next player: a penalty, a miss, or a call. */
export const isAction = (card: Card): boolean =>
	penaltyOf(card) > 0 ||
	card.rank.value === RANK_FOUR ||
	card.rank.value === RankCharacter.Jack ||
	card.rank.value === RankCharacter.Ace;
