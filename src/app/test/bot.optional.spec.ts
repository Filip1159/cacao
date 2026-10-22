import { Difficulty } from "../model/enum/Difficulty";
import { Turn } from "../model/enum/Turn";
import { RankCharacter } from "../model/Rank";
import { Suit } from "../model/Suit";
import { getBestMove, playBotTurn } from "../service/bot";
import { GameState, playCard, topOf } from "../service/rules";
import { DEFAULT_RULES } from "../model/rule-options";
import { botTurn, card, keepOrder, withRules } from "./support";

describe("bot", () => {
	const normal = Difficulty.NORMAL;

	describe("optional rule: Queen", () => {
		const rules = withRules("queenWild");
		const queen = card(RankCharacter.Queen, Suit.SPADES);

		it("cancels a penalty with a Queen when it cannot pass it on", () => {
			const next = playBotTurn(
				botTurn([queen, card(8, Suit.CLUBS)], card(2, Suit.HEARTS), {
					rules,
					obligation: { kind: "pick", count: 2 },
				}),
				normal,
				keepOrder,
			);
			expect(topOf(next)).toBe(queen);
			expect(next.hands[Turn.OPPONENT].length).toBe(1);
			expect(next.obligation).toEqual({ kind: "none" });
		});

		it("keeps the Queen for later when a plain card is playable", () => {
			const state = botTurn(
				[queen, card(8, Suit.HEARTS)],
				card(5, Suit.HEARTS),
				{ rules },
			);
			expect(getBestMove(state, normal)).toBe(1);
		});

		it("never plays a Queen with the rule off", () => {
			const state = botTurn([queen], card(5, Suit.HEARTS));
			expect(getBestMove(state, normal)).toBe(-1);
		});
	});

	describe("optional rule: Binding Jack", () => {
		const rules = withRules("jackBindsBoth");

		it("answers a call and then the call of its own Jack", () => {
			const jack = card(RankCharacter.Jack, Suit.CLUBS);
			let state = playBotTurn(
				botTurn(
					[
						jack,
						card(7, Suit.HEARTS),
						card(7, Suit.DIAMS),
						card(8, Suit.HEARTS),
					],
					card(5, Suit.CLUBS),
					{ rules },
				),
				normal,
				keepOrder,
			);
			expect(state.demand).toEqual({
				rank: 7,
				owner: Turn.OPPONENT,
				stage: "opponent",
			});

			// the human answers with a 7, so now the bot has to play a 7
			state = {
				...state,
				turn: Turn.ME,
				hands: [
					[card(7, Suit.SPADES), card(9, Suit.SPADES)],
					state.hands[1],
				],
			};
			state = { ...state, obligation: { kind: "rank", rank: 7 } };
			const answered = playCard(state, 0);
			const reply = playBotTurn(answered, normal, keepOrder);
			expect(topOf(reply).rank.value).toBe(7);
			expect(reply.demand).toBeNull();
		});

		it("picks a card when it cannot play the called rank", () => {
			const next = playBotTurn(
				botTurn([card(8, Suit.CLUBS)], card(5, Suit.CLUBS), {
					rules,
					obligation: { kind: "rank", rank: 7 },
					demand: { rank: 7, owner: Turn.ME, stage: "opponent" },
				}),
				normal,
				keepOrder,
			);
			expect(next.hands[Turn.OPPONENT].length).toBe(2);
			expect(next.turn).toBe(Turn.ME);
			expect(next.obligation).toEqual({ kind: "rank", rank: 7 });
		});
	});

	describe("optional rule: Stacking penalties", () => {
		const stack = (rules = withRules("anyPenaltyStacks")) =>
			botTurn(
				[card(3, Suit.CLUBS), card(8, Suit.CLUBS)],
				card(2, Suit.HEARTS),
				{ rules, obligation: { kind: "pick", count: 2 } },
			);

		it("passes a penalty on with a different penalty card", () => {
			const next = playBotTurn(stack(), normal, keepOrder);
			expect(topOf(next).rank.value).toBe(3);
			expect(next.turn).toBe(Turn.ME);
			expect(next.obligation).toEqual({ kind: "pick", count: 5 });
		});

		it("picks the cards with the rule off", () => {
			const next = playBotTurn(stack(DEFAULT_RULES), normal, keepOrder);
			expect(next.hands[Turn.OPPONENT].length).toBe(4);
			expect(next.obligation).toEqual({ kind: "none" });
		});
	});

	describe("optional rule: No finishing on an action card", () => {
		const rules = withRules("noActionFinish");
		const hand = () => [card(5, Suit.HEARTS), card(2, Suit.HEARTS)];

		it("plays the action card first so that it does not get stuck with it", () => {
			const state = botTurn(hand(), card(6, Suit.HEARTS), { rules });
			expect(getBestMove(state, normal)).toBe(1);
		});

		it("plays the plain card first without the rule", () => {
			const state = botTurn(hand(), card(6, Suit.HEARTS));
			expect(getBestMove(state, normal)).toBe(0);
		});

		it("picks a card when it only has an action card left", () => {
			const next = playBotTurn(
				botTurn([card(2, Suit.HEARTS)], card(6, Suit.HEARTS), {
					rules,
				}),
				normal,
				keepOrder,
			);
			expect(next.winner).toBeNull();
			expect(next.hands[Turn.OPPONENT].length).toBe(2);
		});

		it("does not chain its last card", () => {
			const next = playBotTurn(
				botTurn(
					[card(2, Suit.HEARTS), card(2, Suit.CLUBS)],
					card(6, Suit.HEARTS),
					{ rules },
				),
				normal,
				keepOrder,
			);
			expect(next.winner).toBeNull();
			expect(next.hands[Turn.OPPONENT].length).toBe(1);
		});
	});

	describe("optional rule: Playing the drawn card", () => {
		const rules = withRules("playAfterDraw");
		// the bot has nothing to play on 6♠, and the next card in the deck is a 6♦
		const stuck = (changes: Partial<GameState> = {}) =>
			botTurn([card(8, Suit.CLUBS)], card(6, Suit.SPADES), {
				rules,
				...changes,
			});

		it("plays the card it picked when it can", () => {
			const next = playBotTurn(stuck(), normal, keepOrder);
			expect(topOf(next)).toEqual(card(6, Suit.DIAMS));
			expect(next.hands[Turn.OPPONENT].length).toBe(1);
			expect(next.turn).toBe(Turn.ME);
			expect(next.drawn).toBeNull();
		});

		it("keeps the card on Easy", () => {
			const next = playBotTurn(stuck(), Difficulty.EASY, keepOrder);
			expect(topOf(next)).toEqual(card(6, Suit.SPADES));
			expect(next.hands[Turn.OPPONENT].length).toBe(2);
			expect(next.turn).toBe(Turn.ME);
			expect(next.drawn).toBeNull();
		});

		it("keeps the card with the rule off", () => {
			const next = playBotTurn(
				stuck({ rules: DEFAULT_RULES }),
				normal,
				keepOrder,
			);
			expect(next.hands[Turn.OPPONENT].length).toBe(2);
			expect(next.turn).toBe(Turn.ME);
		});

		it("calls a rank when the picked card is a Jack", () => {
			const jack = card(RankCharacter.Jack, Suit.SPADES);
			const next = playBotTurn(
				stuck({ deck: [card(7, Suit.CLUBS), jack] }),
				normal,
				keepOrder,
			);
			expect(topOf(next)).toEqual(jack);
			expect(next.obligation.kind).toBe("rank");
		});
	});
});
