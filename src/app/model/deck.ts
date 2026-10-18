import { Card } from "./Card";
import { RANK_FOUR, Rank, RankCharacter } from "./Rank";
import { Suit, getAllSuits } from "./Suit";

/** Returns the items in a new random order. */
export type Shuffle = <T>(items: readonly T[]) => T[];

/** Fisher-Yates over `Math.random`. */
export const shuffle: Shuffle = (items) => {
	const result = [...items];
	for (let i = result.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[result[i], result[j]] = [result[j], result[i]];
	}
	return result;
};

/** The 52 cards, suit by suit. */
export function createDeck(): Card[] {
	const ranks = Rank.getAllRanks();
	return getAllSuits().flatMap((suit) =>
		ranks.map((rank) => ({ rank, suit })),
	);
}

/** Cards with an effect can't start the discard pile. */
export function isSpecialCard(card: Card): boolean {
	if (
		card.rank.value === RankCharacter.King &&
		(card.suit === Suit.DIAMS || card.suit === Suit.CLUBS)
	)
		return false;
	return (
		card.rank.value <= RANK_FOUR || card.rank.value >= RankCharacter.Jack
	);
}

/**
 * Takes the first plain card from the top of the deck, putting the special
 * cards it passes on the bottom. Returns it with the rest of the deck.
 */
export function takeStarter(deck: readonly Card[]): {
	starter: Card;
	deck: Card[];
} {
	const rest = [...deck];
	let starter = rest.pop()!;
	while (isSpecialCard(starter)) {
		rest.unshift(starter);
		starter = rest.pop()!;
	}
	return { starter, deck: rest };
}
