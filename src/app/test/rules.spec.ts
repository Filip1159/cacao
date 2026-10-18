import { Card } from "../model/Card";
import { RankCharacter } from "../model/Rank";
import { Suit } from "../model/Suit";
import { Turn } from "../model/enum/Turn";
import {
	GameState,
	Obligation,
	topOf,
	callMacau,
	canChain,
	endChain,
	hasCounter,
	isLegalMove,
	missTurn,
	newGame,
	pickCards,
	playCard,
	punishMissingMacau,
} from "../service/rules";
import { card, keepOrder, makeState } from "./support";

const hands = (me: Card[], opponent: Card[] = []): [Card[], Card[]] => [
	me,
	opponent,
];

describe("rules", () => {
	describe("newGame", () => {
		it("deals 5 cards to each player and starts the discard pile with a plain card", () => {
			const state = newGame(keepOrder);
			expect(state.hands[Turn.ME].length).toBe(5);
			expect(state.hands[Turn.OPPONENT].length).toBe(5);
			expect(state.discard).toEqual([
				card(RankCharacter.King, Suit.CLUBS),
			]);
			expect(state.deck.length).toBe(41);
			expect(state.turn).toBe(Turn.ME);
			expect(state.obligation).toEqual({ kind: "none" });
			expect(state.winner).toBeNull();
		});

		it("deals alternately, starting with the human", () => {
			const state = newGame(keepOrder);
			// the unshuffled deck is taken from the end, after the A♣ and K♣
			expect(state.hands[Turn.ME][0]).toEqual(
				card(RankCharacter.Queen, Suit.CLUBS),
			);
			expect(state.hands[Turn.OPPONENT][0]).toEqual(
				card(RankCharacter.Jack, Suit.CLUBS),
			);
		});

		it("uses the shuffle it is given", () => {
			const reversed = <T>(items: readonly T[]) => [...items].reverse();
			expect(newGame(reversed).discard).not.toEqual(
				newGame(keepOrder).discard,
			);
		});
	});

	describe("isLegalMove", () => {
		const top = (card: Card, changes: Partial<GameState> = {}) =>
			makeState({ top: card, ...changes });

		it("accepts a card with the same suit", () => {
			expect(
				isLegalMove(top(card(6, Suit.SPADES)), card(9, Suit.SPADES)),
			).toBeTrue();
		});

		it("accepts a card with the same rank, even as a different Rank instance", () => {
			expect(
				isLegalMove(top(card(6, Suit.SPADES)), card(6, Suit.HEARTS)),
			).toBeTrue();
		});

		it("rejects a card matching neither rank nor suit", () => {
			expect(
				isLegalMove(top(card(6, Suit.SPADES)), card(9, Suit.HEARTS)),
			).toBeFalse();
		});

		it("rejects an ordinary card while the player has to pick cards", () => {
			const state = top(card(6, Suit.SPADES), {
				obligation: { kind: "pick", count: 2 },
			});
			expect(isLegalMove(state, card(9, Suit.SPADES))).toBeFalse();
		});

		it("while picking cards only accepts a penalty card of the same rank", () => {
			const picking: Obligation = { kind: "pick", count: 2 };
			const twos = top(card(2, Suit.HEARTS), { obligation: picking });
			expect(isLegalMove(twos, card(2, Suit.SPADES))).toBeTrue();
			expect(isLegalMove(twos, card(3, Suit.HEARTS))).toBeFalse();
			expect(isLegalMove(twos, card(9, Suit.HEARTS))).toBeFalse();

			const kings = top(card(RankCharacter.King, Suit.SPADES), {
				obligation: picking,
			});
			expect(
				isLegalMove(kings, card(RankCharacter.King, Suit.HEARTS)),
			).toBeTrue();
			// K♦ and K♣ carry no penalty, so they can't pass one on
			expect(
				isLegalMove(kings, card(RankCharacter.King, Suit.DIAMS)),
			).toBeFalse();
		});

		it("while missing a turn only a 4 is playable, and only on a 4", () => {
			const missing: Obligation = { kind: "miss", turns: 1 };
			const fours = top(card(4, Suit.HEARTS), { obligation: missing });
			expect(isLegalMove(fours, card(4, Suit.CLUBS))).toBeTrue();
			expect(isLegalMove(fours, card(9, Suit.HEARTS))).toBeFalse();
			const nine = top(card(9, Suit.HEARTS), { obligation: missing });
			expect(isLegalMove(nine, card(4, Suit.HEARTS))).toBeFalse();
		});

		it("after an Ace only accepts the called suit, regardless of rank", () => {
			const state = top(card(RankCharacter.Ace, Suit.SPADES), {
				obligation: { kind: "suit", suit: Suit.HEARTS },
			});
			expect(isLegalMove(state, card(9, Suit.HEARTS))).toBeTrue();
			expect(
				isLegalMove(state, card(RankCharacter.Ace, Suit.HEARTS)),
			).toBeTrue();
			expect(isLegalMove(state, card(9, Suit.SPADES))).toBeFalse();
			expect(
				isLegalMove(state, card(RankCharacter.Ace, Suit.SPADES)),
			).toBeFalse();
		});

		it("after a Jack only accepts the called rank, regardless of suit", () => {
			const state = top(card(RankCharacter.Jack, Suit.SPADES), {
				obligation: { kind: "rank", rank: 7 },
			});
			expect(isLegalMove(state, card(7, Suit.DIAMS))).toBeTrue();
			expect(isLegalMove(state, card(8, Suit.SPADES))).toBeFalse();
		});

		it("looks at the player whose turn it is", () => {
			const state = top(card(2, Suit.HEARTS), {
				turn: Turn.OPPONENT,
				obligation: { kind: "pick", count: 2 },
			});
			expect(isLegalMove(state, card(9, Suit.HEARTS))).toBeFalse();
			expect(isLegalMove(state, card(2, Suit.CLUBS))).toBeTrue();
		});

		it("accepts nothing once the game is over", () => {
			const state = top(card(9, Suit.CLUBS), { winner: Turn.OPPONENT });
			expect(isLegalMove(state, card(8, Suit.CLUBS))).toBeFalse();
		});

		it("hasCounter looks for any playable card in the hand", () => {
			const base = top(card(9, Suit.CLUBS));
			expect(
				hasCounter({ ...base, hands: hands([card(8, Suit.HEARTS)]) }),
			).toBeFalse();
			expect(
				hasCounter({
					...base,
					hands: hands([card(8, Suit.HEARTS), card(8, Suit.CLUBS)]),
				}),
			).toBeTrue();
		});
	});

	describe("special card effects", () => {
		const playFirst = (
			hand: Card[],
			top: Card,
			call?: { rank?: number; suit?: Suit },
		) =>
			playCard(
				makeState({ hands: hands(hand, [card(7, Suit.SPADES)]), top }),
				0,
				call,
			);

		it("2 makes the opponent pick 2 cards", () => {
			const next = playFirst(
				[card(2, Suit.HEARTS), card(5, Suit.DIAMS)],
				card(9, Suit.HEARTS),
			);
			expect(next.obligation).toEqual({ kind: "pick", count: 2 });
		});

		it("3 makes the opponent pick 3 cards", () => {
			const next = playFirst(
				[card(3, Suit.HEARTS), card(5, Suit.DIAMS)],
				card(9, Suit.HEARTS),
			);
			expect(next.obligation).toEqual({ kind: "pick", count: 3 });
		});

		it("4 makes the opponent miss a turn", () => {
			const next = playFirst(
				[card(4, Suit.HEARTS), card(5, Suit.DIAMS)],
				card(9, Suit.HEARTS),
			);
			expect(next.obligation).toEqual({ kind: "miss", turns: 1 });
		});

		[Suit.HEARTS, Suit.SPADES].forEach((suit) => {
			it(`K${suit} makes the opponent pick 5 cards`, () => {
				const next = playFirst(
					[card(RankCharacter.King, suit), card(5, Suit.DIAMS)],
					card(9, suit),
				);
				expect(next.obligation).toEqual({ kind: "pick", count: 5 });
			});
		});

		[Suit.DIAMS, Suit.CLUBS].forEach((suit) => {
			it(`K${suit} has no effect`, () => {
				const next = playFirst(
					[card(RankCharacter.King, suit), card(5, Suit.HEARTS)],
					card(9, suit),
				);
				expect(next.obligation).toEqual({ kind: "none" });
			});
		});

		it("J makes the opponent play the called rank", () => {
			const next = playFirst(
				[card(RankCharacter.Jack, Suit.CLUBS), card(5, Suit.DIAMS)],
				card(9, Suit.CLUBS),
				{ rank: 7 },
			);
			expect(next.obligation).toEqual({ kind: "rank", rank: 7 });
		});

		it("A makes the opponent play the called suit", () => {
			const next = playFirst(
				[card(RankCharacter.Ace, Suit.CLUBS), card(5, Suit.DIAMS)],
				card(9, Suit.CLUBS),
				{ suit: Suit.HEARTS },
			);
			expect(next.obligation).toEqual({
				kind: "suit",
				suit: Suit.HEARTS,
			});
		});

		it("the called suit is forgotten once the opponent has moved", () => {
			const called = playFirst(
				[card(RankCharacter.Ace, Suit.CLUBS), card(5, Suit.DIAMS)],
				card(9, Suit.CLUBS),
				{ suit: Suit.HEARTS },
			);
			const next = playCard(
				{
					...called,
					hands: hands(called.hands[0], [
						card(9, Suit.HEARTS),
						card(3, Suit.SPADES),
					]),
				},
				0,
			);
			expect(topOf(next)).toEqual(card(9, Suit.HEARTS));
			expect(next.obligation).toEqual({ kind: "none" });
		});

		it("a countered penalty adds up for the next player", () => {
			const next = playCard(
				makeState({
					hands: hands(
						[card(2, Suit.SPADES), card(5, Suit.DIAMS)],
						[card(7, Suit.SPADES)],
					),
					top: card(2, Suit.HEARTS),
					obligation: { kind: "pick", count: 4 },
				}),
				0,
			);
			expect(topOf(next)).toEqual(card(2, Suit.SPADES));
			expect(next.obligation).toEqual({ kind: "pick", count: 6 });
		});

		it("playing a card moves it to the discard pile and passes the turn", () => {
			const start = makeState({
				hands: hands(
					[card(8, Suit.CLUBS), card(5, Suit.DIAMS)],
					[card(7, Suit.SPADES)],
				),
			});
			const next = playCard(start, 0);
			expect(next.hands[Turn.ME]).toEqual([card(5, Suit.DIAMS)]);
			expect(topOf(next)).toEqual(card(8, Suit.CLUBS));
			expect(next.discard).toEqual([
				card(9, Suit.CLUBS),
				card(8, Suit.CLUBS),
			]);
			expect(next.turn).toBe(Turn.OPPONENT);
		});

		it("never changes the state it is given", () => {
			const start = makeState({
				hands: hands(
					[card(2, Suit.CLUBS), card(5, Suit.DIAMS)],
					[card(7, Suit.SPADES)],
				),
			});
			const snapshot = JSON.stringify(start);
			playCard(start, 0);
			expect(JSON.stringify(start)).toBe(snapshot);
		});
	});

	describe("picking cards", () => {
		const start = (changes: Partial<GameState> = {}) =>
			makeState({
				hands: hands([card(9, Suit.SPADES)], [card(7, Suit.SPADES)]),
				...changes,
			});

		it("draws a single card when there is no penalty", () => {
			const next = pickCards(start());
			expect(next.hands[Turn.ME].length).toBe(2);
			expect(next.turn).toBe(Turn.OPPONENT);
		});

		it("draws all penalty cards", () => {
			const next = pickCards(
				start({
					obligation: { kind: "pick", count: 5 },
				}),
			);
			expect(next.hands[Turn.ME].length).toBe(6);
		});

		it("does not carry a drawn penalty over", () => {
			const next = pickCards(
				start({
					obligation: { kind: "pick", count: 4 },
				}),
			);
			expect(next.obligation).toEqual({ kind: "none" });
		});

		it("takes the cards from the end of the deck", () => {
			const next = pickCards(
				start({ deck: [card(3, Suit.HEARTS), card(4, Suit.HEARTS)] }),
			);
			expect(next.hands[Turn.ME]).toEqual([
				card(9, Suit.SPADES),
				card(4, Suit.HEARTS),
			]);
			expect(next.deck).toEqual([card(3, Suit.HEARTS)]);
		});

		it("reshuffles the discard pile, keeping its top card, when the deck runs out", () => {
			const a = card(5, Suit.HEARTS);
			const b = card(6, Suit.HEARTS);
			const c = card(7, Suit.HEARTS);
			const top = card(8, Suit.HEARTS);
			const reversed = <T>(items: readonly T[]) => [...items].reverse();
			const next = pickCards(
				start({ deck: [], discard: [a, b, c, top] }),
				reversed,
			);
			// the shuffled pile was [c, b, a]; the human took the last one
			expect(next.hands[Turn.ME]).toEqual([card(9, Suit.SPADES), a]);
			expect(next.deck).toEqual([c, b]);
			expect(next.discard).toEqual([top]);
		});

		it("adds nothing to the hand when the deck is empty", () => {
			const next = pickCards(start({ deck: [] }), keepOrder);
			expect(next.hands[Turn.ME]).toEqual([card(9, Suit.SPADES)]);
			expect(next.turn).toBe(Turn.OPPONENT);
		});
	});

	describe("stacked misses", () => {
		const missing = (turnsToMiss: number, turn = Turn.ME) =>
			makeState({
				top: card(4, Suit.HEARTS),
				turn,
				obligation: { kind: "miss", turns: turnsToMiss },
			});

		it("a player passes a 4 back, adding to the misses", () => {
			const next = playCard(
				{
					...missing(2),
					hands: hands(
						[card(4, Suit.CLUBS), card(5, Suit.DIAMS)],
						[card(7, Suit.SPADES)],
					),
				},
				0,
			);
			expect(next.obligation).toEqual({ kind: "miss", turns: 3 });
		});

		it("passing a single miss back doubles it", () => {
			const next = playCard(
				{
					...missing(1, Turn.OPPONENT),
					hands: hands(
						[card(7, Suit.SPADES)],
						[card(9, Suit.SPADES), card(4, Suit.DIAMS)],
					),
				},
				1,
			);
			expect(topOf(next)).toEqual(card(4, Suit.DIAMS));
			expect(next.obligation).toEqual({ kind: "miss", turns: 2 });
		});

		it("serving a single miss hands the turn over", () => {
			const next = missTurn({
				...missing(1, Turn.OPPONENT),
				hands: hands([card(7, Suit.SPADES)], [card(9, Suit.HEARTS)]),
			});
			expect(next.hands[Turn.OPPONENT].length).toBe(1);
			expect(next.turn).toBe(Turn.ME);
			expect(next.obligation).toEqual({ kind: "none" });
		});

		it("two stacked misses make a player miss two turns in a row", () => {
			let state: GameState = {
				...missing(2),
				hands: hands(
					[card(9, Suit.SPADES)],
					[card(8, Suit.HEARTS), card(9, Suit.HEARTS)],
				),
			};
			state = missTurn(state); // first miss
			expect(state.turn).toBe(Turn.OPPONENT);
			state = playCard(state, 0);
			expect(state.hands[Turn.OPPONENT].length).toBe(1);

			// back to the human, who still has one turn to miss
			expect(state.turn).toBe(Turn.ME);
			expect(state.obligation).toEqual({ kind: "miss", turns: 1 });

			state = missTurn(state); // second miss
			state = playCard(state, 0);
			expect(state.hands[Turn.OPPONENT].length).toBe(0);
			expect(state.winner).toBe(Turn.OPPONENT);
		});

		it("the missed turns end once they are served", () => {
			let state: GameState = {
				...missing(2),
				hands: hands(
					[card(9, Suit.SPADES)],
					[
						card(8, Suit.HEARTS),
						card(9, Suit.HEARTS),
						card(2, Suit.CLUBS),
					],
				),
			};
			state = missTurn(state);
			state = playCard(state, 0);
			state = missTurn(state);
			state = playCard(state, 0);
			expect(state.turn).toBe(Turn.ME);
			expect(state.obligation).toEqual({ kind: "none" });
		});
	});

	describe("same-rank chains", () => {
		const start = (changes: Partial<GameState> = {}) =>
			makeState({
				hands: hands(
					[
						card(7, Suit.CLUBS),
						card(7, Suit.HEARTS),
						card(9, Suit.CLUBS),
					],
					[card(5, Suit.SPADES)],
				),
				...changes,
			});

		it("keeps the turn while more cards of the rank can be added", () => {
			const next = playCard(start(), 0);
			expect(next.chain).toEqual([card(7, Suit.CLUBS)]);
			expect(next.turn).toBe(Turn.ME);
			expect(topOf(next)).toEqual(card(7, Suit.CLUBS));
			expect(canChain(next)).toBeTrue();
		});

		it("only allows cards of the same rank while chaining", () => {
			const next = playCard(start(), 0);
			expect(isLegalMove(next, card(7, Suit.HEARTS))).toBeTrue();
			// matches the suit of the top card, but not the chain's rank
			expect(isLegalMove(next, card(9, Suit.CLUBS))).toBeFalse();
		});

		it("ends the turn on request", () => {
			const next = endChain(playCard(start(), 0));
			expect(next.chain).toEqual([]);
			expect(next.turn).toBe(Turn.OPPONENT);
			expect(next.hands[Turn.ME].length).toBe(2);
		});

		it("ends the turn by itself after the last card of the rank", () => {
			const next = playCard(playCard(start(), 0), 0); // 7♣, then 7♥
			expect(next.chain).toEqual([]);
			expect(next.turn).toBe(Turn.OPPONENT);
			expect(topOf(next)).toEqual(card(7, Suit.HEARTS));
		});

		it("adds up penalties: two 2s make 4 cards", () => {
			const next = playCard(
				playCard(
					start({
						hands: hands(
							[
								card(2, Suit.CLUBS),
								card(2, Suit.HEARTS),
								card(5, Suit.DIAMS),
							],
							[card(5, Suit.SPADES)],
						),
					}),
					0,
				),
				0,
			);
			expect(next.obligation).toEqual({ kind: "pick", count: 4 });
		});

		it("adds up misses: two 4s make 2 turns", () => {
			const next = playCard(
				playCard(
					start({
						hands: hands(
							[
								card(4, Suit.CLUBS),
								card(4, Suit.HEARTS),
								card(5, Suit.DIAMS),
							],
							[card(5, Suit.SPADES)],
						),
					}),
					0,
				),
				0,
			);
			expect(next.obligation).toEqual({ kind: "miss", turns: 2 });
		});

		it("playing every card of a chain wins", () => {
			const next = playCard(
				playCard(
					start({
						hands: hands(
							[card(7, Suit.CLUBS), card(7, Suit.HEARTS)],
							[card(5, Suit.SPADES)],
						),
					}),
					0,
				),
				0,
			);
			expect(next.winner).toBe(Turn.ME);
		});

		it("never chains Jacks or Aces, they need a call", () => {
			const next = playCard(
				start({
					hands: hands(
						[
							card(RankCharacter.Jack, Suit.CLUBS),
							card(RankCharacter.Jack, Suit.HEARTS),
							card(5, Suit.DIAMS),
						],
						[card(5, Suit.SPADES)],
					),
				}),
				0,
				{ rank: 7 },
			);
			expect(next.chain).toEqual([]);
			expect(next.turn).toBe(Turn.OPPONENT);
			expect(next.obligation).toEqual({ kind: "rank", rank: 7 });
		});
	});

	describe("Macau", () => {
		const play = (hand: Card[]) =>
			playCard(
				makeState({ hands: hands(hand, [card(5, Suit.SPADES)]) }),
				0,
			);

		it("is pending once the human is down to one card", () => {
			expect(
				play([card(8, Suit.CLUBS), card(5, Suit.DIAMS)]).macauPending,
			).toBeTrue();
		});

		it("is not pending with more cards left", () => {
			expect(
				play([
					card(8, Suit.CLUBS),
					card(5, Suit.DIAMS),
					card(6, Suit.DIAMS),
				]).macauPending,
			).toBeFalse();
		});

		it("is not pending after winning", () => {
			expect(play([card(8, Suit.CLUBS)]).macauPending).toBeFalse();
		});

		it("is not asked of the bot", () => {
			const next = playCard(
				makeState({
					turn: Turn.OPPONENT,
					hands: hands(
						[card(5, Suit.SPADES)],
						[card(8, Suit.CLUBS), card(5, Suit.DIAMS)],
					),
				}),
				0,
			);
			expect(next.macauPending).toBeFalse();
		});

		it("saying Macau clears it", () => {
			const pending = play([card(8, Suit.CLUBS), card(5, Suit.DIAMS)]);
			expect(callMacau(pending).macauPending).toBeFalse();
		});

		it("forgetting it costs 2 cards", () => {
			const pending = play([card(8, Suit.CLUBS), card(5, Suit.DIAMS)]);
			const punished = punishMissingMacau(pending);
			expect(punished.hands[Turn.ME].length).toBe(3);
			expect(punished.macauPending).toBeFalse();
		});

		it("costs nothing when nothing is pending", () => {
			const state = makeState({ hands: hands([card(8, Suit.CLUBS)]) });
			expect(punishMissingMacau(state)).toBe(state);
		});
	});

	describe("game over", () => {
		it("nobody has won while both players hold cards", () => {
			const next = playCard(
				makeState({
					hands: hands(
						[card(8, Suit.CLUBS), card(5, Suit.DIAMS)],
						[card(5, Suit.SPADES)],
					),
				}),
				0,
			);
			expect(next.winner).toBeNull();
		});

		it("the human wins by playing the last card", () => {
			const next = playCard(
				makeState({
					hands: hands([card(8, Suit.CLUBS)], [card(5, Suit.SPADES)]),
				}),
				0,
			);
			expect(next.winner).toBe(Turn.ME);
			expect(topOf(next)).toEqual(card(8, Suit.CLUBS));
		});

		it("the bot wins by playing the last card", () => {
			const next = playCard(
				makeState({
					turn: Turn.OPPONENT,
					hands: hands([card(5, Suit.SPADES)], [card(8, Suit.CLUBS)]),
				}),
				0,
			);
			expect(next.winner).toBe(Turn.OPPONENT);
		});

		it("nothing can be played, picked or missed after the game", () => {
			const over = makeState({
				hands: hands([card(8, Suit.CLUBS)], [card(5, Suit.SPADES)]),
				winner: Turn.OPPONENT,
			});
			expect(playCard(over, 0)).toBe(over);
			expect(pickCards(over)).toBe(over);
			expect(missTurn(over)).toBe(over);
		});
	});
});
