import { Suit } from "../model/Suit";
import { RankCharacter } from "../model/Rank";
import { createDeck, isSpecialCard, shuffle, takeStarter } from "../model/deck";
import { card } from "./support";

describe("deck", () => {
	it("has 52 different cards", () => {
		const deck = createDeck();
		expect(deck.length).toBe(52);
		expect(new Set(deck.map((c) => `${c.rank}${c.suit}`)).size).toBe(52);
	});

	it("shuffle returns the same cards in a new array, leaving the original alone", () => {
		const deck = createDeck();
		const copy = [...deck];
		const shuffled = shuffle(deck);
		expect(shuffled).not.toBe(deck);
		expect(deck).toEqual(copy);
		expect(shuffled.length).toBe(52);
		expect([...shuffled].sort(byLabel)).toEqual([...deck].sort(byLabel));
	});

	it("treats 2, 3, 4, J, Q, A and the penalty Kings as special", () => {
		expect(isSpecialCard(card(2, Suit.CLUBS))).toBeTrue();
		expect(isSpecialCard(card(4, Suit.CLUBS))).toBeTrue();
		expect(isSpecialCard(card(RankCharacter.Jack, Suit.CLUBS))).toBeTrue();
		expect(isSpecialCard(card(RankCharacter.Ace, Suit.CLUBS))).toBeTrue();
		expect(isSpecialCard(card(7, Suit.CLUBS))).toBeFalse();
		expect(isSpecialCard(card(RankCharacter.King, Suit.CLUBS))).toBeFalse();
	});

	it("takeStarter skips special cards, putting them at the bottom of the deck", () => {
		const deck = [
			card(6, Suit.HEARTS),
			card(2, Suit.HEARTS),
			card(4, Suit.HEARTS),
		];
		const { starter, deck: rest } = takeStarter(deck);
		expect(starter).toEqual(card(6, Suit.HEARTS));
		// the 4♥ and then the 2♥ were passed over and went to the bottom
		expect(rest).toEqual([card(2, Suit.HEARTS), card(4, Suit.HEARTS)]);
		expect(deck.length).toBe(3);
	});
});

const byLabel = (a: { rank: unknown; suit: string }, b: typeof a) =>
	`${a.rank}${a.suit}`.localeCompare(`${b.rank}${b.suit}`);
