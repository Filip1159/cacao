import { Card } from "../model/Card";
import { Difficulty } from "../model/enum/Difficulty";
import { Turn } from "../model/enum/Turn";
import { RankCharacter } from "../model/Rank";
import { Suit } from "../model/Suit";
import {
	chooseRankToCall,
	chooseSuitToCall,
	getBestMove,
	playBotTurn,
} from "../service/bot";
import { GameState, topOf } from "../service/rules";
import { card, keepOrder, makeState } from "./support";

/** The bot's turn, with the given cards in its hand and some (default 5) in the human's. */
const botTurn = (
	botHand: Card[],
	top: Card,
	changes: Partial<GameState> = {},
	humanCards = 5,
): GameState =>
	makeState({
		turn: Turn.OPPONENT,
		top,
		hands: [
			Array.from({ length: humanCards }, () => card(9, Suit.HEARTS)),
			botHand,
		],
		...changes,
	});

describe("bot", () => {
	const normal = Difficulty.NORMAL;

	describe("playing", () => {
		it("calls the rank it holds most of when playing a Jack", () => {
			const next = playBotTurn(
				botTurn(
					[
						card(RankCharacter.Jack, Suit.CLUBS),
						card(7, Suit.HEARTS),
						card(7, Suit.DIAMS),
						card(9, Suit.SPADES),
					],
					card(5, Suit.CLUBS),
					{},
					5,
				),
				normal,
				keepOrder,
			);
			expect(topOf(next).rank.value).toBe(RankCharacter.Jack);
			expect(next.obligation).toEqual({ kind: "rank", rank: 7 });
			expect(next.obligation.kind).toBe("rank");
		});

		it("calls the suit it holds most of when playing an Ace", () => {
			const next = playBotTurn(
				botTurn(
					[
						card(RankCharacter.Ace, Suit.CLUBS),
						card(7, Suit.HEARTS),
						card(8, Suit.HEARTS),
						card(9, Suit.SPADES),
					],
					card(5, Suit.CLUBS),
				),
				normal,
				keepOrder,
			);
			// the 7♥ and 8♥ don't match the 5♣, so the Ace is the only legal card
			expect(topOf(next).rank.value).toBe(RankCharacter.Ace);
			expect(next.obligation).toEqual({
				kind: "suit",
				suit: Suit.HEARTS,
			});
			expect(next.obligation.kind).toBe("suit");
		});

		it("plays the called rank after the human's Jack", () => {
			const next = playBotTurn(
				botTurn(
					[
						card(3, Suit.HEARTS),
						card(7, Suit.DIAMS),
						card(9, Suit.SPADES),
					],
					card(RankCharacter.Jack, Suit.SPADES),
					{
						obligation: { kind: "rank", rank: 7 },
					},
				),
				normal,
				keepOrder,
			);
			expect(next.hands[Turn.OPPONENT]).toEqual([
				card(3, Suit.HEARTS),
				card(9, Suit.SPADES),
			]);
			expect(topOf(next)).toEqual(card(7, Suit.DIAMS));
		});

		it("draws one card when it cannot play the called rank", () => {
			const next = playBotTurn(
				botTurn(
					[card(3, Suit.HEARTS), card(9, Suit.SPADES)],
					card(RankCharacter.Jack, Suit.SPADES),
					{
						obligation: { kind: "rank", rank: 7 },
					},
				),
				normal,
				keepOrder,
			);
			expect(next.hands[Turn.OPPONENT].length).toBe(3);
			expect(topOf(next)).toEqual(card(RankCharacter.Jack, Suit.SPADES));
			expect(next.turn).toBe(Turn.ME);
		});

		it("plays a card of the called suit after the human's Ace", () => {
			const next = playBotTurn(
				botTurn(
					[
						card(3, Suit.SPADES),
						card(7, Suit.HEARTS),
						card(9, Suit.SPADES),
					],
					card(RankCharacter.Ace, Suit.SPADES),
					{
						obligation: { kind: "suit", suit: Suit.HEARTS },
					},
				),
				normal,
				keepOrder,
			);
			expect(topOf(next)).toEqual(card(7, Suit.HEARTS));
			expect(next.hands[Turn.OPPONENT].length).toBe(2);
		});

		it("draws one card when it cannot follow the called suit", () => {
			const next = playBotTurn(
				botTurn(
					[card(3, Suit.SPADES), card(9, Suit.SPADES)],
					card(RankCharacter.Ace, Suit.SPADES),
					{
						obligation: { kind: "suit", suit: Suit.HEARTS },
					},
				),
				normal,
				keepOrder,
			);
			expect(next.hands[Turn.OPPONENT].length).toBe(3);
			expect(topOf(next)).toEqual(card(RankCharacter.Ace, Suit.SPADES));
		});

		it("counters a penalty with a card of the same rank", () => {
			const next = playBotTurn(
				botTurn(
					[card(9, Suit.SPADES), card(3, Suit.CLUBS)],
					card(3, Suit.HEARTS),
					{
						obligation: { kind: "pick", count: 3 },
					},
				),
				normal,
				keepOrder,
			);
			expect(topOf(next)).toEqual(card(3, Suit.CLUBS));
			expect(next.hands[Turn.OPPONENT].length).toBe(1);
			expect(next.obligation).toEqual({ kind: "pick", count: 6 });
		});

		it("draws the penalty cards when it cannot counter", () => {
			const next = playBotTurn(
				botTurn([card(9, Suit.SPADES)], card(3, Suit.HEARTS), {
					obligation: { kind: "pick", count: 3 },
				}),
				normal,
				keepOrder,
			);
			expect(next.hands[Turn.OPPONENT].length).toBe(4);
		});

		it("passes a 4 back, doubling the misses", () => {
			const next = playBotTurn(
				botTurn(
					[card(9, Suit.SPADES), card(4, Suit.DIAMS)],
					card(4, Suit.HEARTS),
					{
						obligation: { kind: "miss", turns: 1 },
					},
				),
				normal,
				keepOrder,
			);
			expect(topOf(next)).toEqual(card(4, Suit.DIAMS));
			expect(next.obligation).toEqual({ kind: "miss", turns: 2 });
		});

		it("misses its turn when it has no 4", () => {
			const next = playBotTurn(
				botTurn([card(9, Suit.HEARTS)], card(4, Suit.HEARTS), {
					obligation: { kind: "miss", turns: 1 },
				}),
				normal,
				keepOrder,
			);
			expect(next.hands[Turn.OPPONENT].length).toBe(1);
			expect(next.turn).toBe(Turn.ME);
		});

		it("wins by playing its last card", () => {
			const next = playBotTurn(
				botTurn([card(8, Suit.CLUBS)], card(9, Suit.CLUBS)),
				normal,
				keepOrder,
			);
			expect(next.winner).toBe(Turn.OPPONENT);
		});
	});

	describe("same-rank chains", () => {
		const hand = () => [
			card(7, Suit.CLUBS),
			card(9, Suit.DIAMS),
			card(7, Suit.HEARTS),
		];

		it("plays all its cards of a rank", () => {
			const next = playBotTurn(
				botTurn(hand(), card(5, Suit.CLUBS)),
				normal,
				keepOrder,
			);
			expect(next.hands[Turn.OPPONENT]).toEqual([card(9, Suit.DIAMS)]);
			expect(topOf(next)).toEqual(card(7, Suit.HEARTS));
			expect(next.turn).toBe(Turn.ME);
		});

		it("the easy bot plays a single card", () => {
			const next = playBotTurn(
				botTurn(
					[card(7, Suit.CLUBS), card(7, Suit.HEARTS)],
					card(5, Suit.CLUBS),
				),
				Difficulty.EASY,
				keepOrder,
			);
			expect(next.hands[Turn.OPPONENT].length).toBe(1);
			expect(next.turn).toBe(Turn.ME);
		});
	});

	describe("choosing calls", () => {
		it("calls a rank between 5 and 10 when it has none to prefer", () => {
			const rank = chooseRankToCall([card(2, Suit.HEARTS)], normal);
			expect(rank).toBeGreaterThanOrEqual(5);
			expect(rank).toBeLessThanOrEqual(10);
		});

		it("calls the rank it holds most of", () => {
			expect(
				chooseRankToCall(
					[
						card(7, Suit.HEARTS),
						card(7, Suit.DIAMS),
						card(9, Suit.SPADES),
					],
					normal,
				),
			).toBe(7);
		});

		it("easy calls a random rank between 5 and 10", () => {
			const rank = chooseRankToCall(
				[card(7, Suit.CLUBS)],
				Difficulty.EASY,
			);
			expect(rank).toBeGreaterThanOrEqual(5);
			expect(rank).toBeLessThanOrEqual(10);
		});

		it("calls the suit it holds most of", () => {
			expect(
				chooseSuitToCall(
					[
						card(7, Suit.HEARTS),
						card(8, Suit.HEARTS),
						card(9, Suit.SPADES),
					],
					normal,
				),
			).toBe(Suit.HEARTS);
		});

		it("calls some suit with an empty hand", () => {
			expect(Object.values(Suit)).toContain(chooseSuitToCall([], normal));
		});
	});

	describe("strategy", () => {
		const bestMove = (
			botHand: Card[],
			difficulty = normal,
			humanCards = 5,
		) =>
			getBestMove(
				botTurn(botHand, card(5, Suit.CLUBS), {}, humanCards),
				difficulty,
			);

		it("plays plain cards before Jacks, Aces and attack cards", () => {
			expect(
				bestMove([
					card(RankCharacter.Jack, Suit.CLUBS),
					card(RankCharacter.Ace, Suit.CLUBS),
					card(2, Suit.CLUBS),
					card(4, Suit.CLUBS),
					card(7, Suit.CLUBS),
				]),
			).toBe(4);
		});

		it("holds back attack cards while the human has many cards", () => {
			expect(bestMove([card(2, Suit.CLUBS), card(7, Suit.CLUBS)])).toBe(
				1,
			);
		});

		it("attacks once the human is close to winning", () => {
			expect(
				bestMove([card(7, Suit.CLUBS), card(2, Suit.CLUBS)], normal, 3),
			).toBe(1);
		});

		it("saves Jacks and Aces for when nothing else is playable", () => {
			const hand = [
				card(RankCharacter.Ace, Suit.CLUBS),
				card(RankCharacter.Jack, Suit.CLUBS),
				card(2, Suit.CLUBS),
			];
			expect(bestMove(hand)).toBe(2); // the 2, then the Jack, then the Ace
			expect(bestMove(hand.slice(0, 2))).toBe(1);
		});

		it("takes the earliest card among equals", () => {
			expect(bestMove([card(8, Suit.CLUBS), card(7, Suit.CLUBS)])).toBe(
				0,
			);
		});

		it("ignores cards it cannot play", () => {
			expect(bestMove([card(8, Suit.HEARTS), card(7, Suit.CLUBS)])).toBe(
				1,
			);
			expect(bestMove([card(8, Suit.HEARTS)])).toBe(-1);
		});
	});

	describe("difficulty", () => {
		const top = card(5, Suit.CLUBS);

		it("easy plays the first legal card, even when it is not the best", () => {
			expect(
				getBestMove(
					botTurn([card(8, Suit.HEARTS), card(2, Suit.CLUBS)], top),
					Difficulty.EASY,
				),
			).toBe(1);
			expect(
				getBestMove(
					botTurn(
						[
							card(RankCharacter.Jack, Suit.CLUBS),
							card(7, Suit.CLUBS),
						],
						top,
					),
					Difficulty.EASY,
				),
			).toBe(0);
		});

		it("normal saves the Jack for later", () => {
			expect(
				getBestMove(
					botTurn(
						[
							card(RankCharacter.Jack, Suit.CLUBS),
							card(7, Suit.CLUBS),
						],
						top,
					),
					normal,
				),
			).toBe(1);
		});

		it("hard attacks right away, normal waits", () => {
			const state = botTurn(
				[card(7, Suit.CLUBS), card(2, Suit.CLUBS)],
				top,
			);
			expect(getBestMove(state, normal)).toBe(0);
			expect(getBestMove(state, Difficulty.HARD)).toBe(1);
		});
	});
});
