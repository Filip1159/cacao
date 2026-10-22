import { Card } from "../model/Card";
import { RankCharacter } from "../model/Rank";
import { Suit } from "../model/Suit";
import { Turn } from "../model/enum/Turn";
import { DEFAULT_RULES } from "../model/rule-options";
import {
	GameState,
	Obligation,
	canChain,
	endChain,
	hasCounter,
	isLegalMove,
	keepDrawn,
	newGame,
	pickCards,
	playCard,
	topOf,
} from "../service/rules";
import { card, hands, keepOrder, makeState, withRules } from "./support";

describe("rules", () => {
	describe("optional rule: Queen", () => {
		const queenRules = withRules("queenWild");
		const queen = card(RankCharacter.Queen, Suit.HEARTS);
		const queenGame = (changes: Partial<GameState> & { top?: Card } = {}) =>
			makeState({
				rules: queenRules,
				top: card(6, Suit.SPADES),
				hands: hands(
					[queen, card(9, Suit.DIAMS)],
					[card(5, Suit.CLUBS)],
				),
				...changes,
			});

		it("is off by default", () => {
			expect(newGame(keepOrder).rules).toEqual(DEFAULT_RULES);
			expect(
				isLegalMove(makeState({ top: card(6, Suit.SPADES) }), queen),
			).toBeFalse();
		});

		it("goes on any card", () => {
			expect(isLegalMove(queenGame(), queen)).toBeTrue();
			expect(isLegalMove(queenGame(), card(9, Suit.DIAMS))).toBeFalse();
		});

		it("lets any card be played on a Queen", () => {
			const state = queenGame({
				top: card(RankCharacter.Queen, Suit.CLUBS),
			});
			expect(isLegalMove(state, card(9, Suit.DIAMS))).toBeTrue();
		});

		it("needs the rule for any card to go on a Queen", () => {
			const state = queenGame({
				rules: DEFAULT_RULES,
				top: card(RankCharacter.Queen, Suit.CLUBS),
			});
			expect(isLegalMove(state, card(9, Suit.DIAMS))).toBeFalse();
		});

		for (const obligation of [
			{ kind: "pick", count: 5 },
			{ kind: "miss", turns: 3 },
			{ kind: "rank", rank: 7 },
			{ kind: "suit", suit: Suit.CLUBS },
		] as Obligation[]) {
			it(`cancels a pending ${obligation.kind}`, () => {
				const state = queenGame({ obligation });
				expect(isLegalMove(state, queen)).toBeTrue();
				const next = playCard(state, 0);
				expect(next.turn).toBe(Turn.OPPONENT);
				expect(next.obligation).toEqual({ kind: "none" });
			});
		}

		it("keeps the opponent from passing on a cancelled penalty", () => {
			const state = queenGame({
				top: card(2, Suit.SPADES),
				obligation: { kind: "pick", count: 4 },
				hands: hands(
					[queen, card(9, Suit.DIAMS)],
					[card(2, Suit.CLUBS), card(5, Suit.CLUBS)],
				),
			});
			const next = playCard(state, 0);
			// 2♣ goes on the Queen like any card, and only costs the human 2
			expect(isLegalMove(next, card(2, Suit.CLUBS))).toBeTrue();
			const after = playCard({ ...next }, 0);
			expect(after.obligation).toEqual({ kind: "pick", count: 2 });
		});

		it("can be played several at a time", () => {
			const state = queenGame({
				hands: hands(
					[
						queen,
						card(RankCharacter.Queen, Suit.SPADES),
						card(9, Suit.DIAMS),
					],
					[card(5, Suit.CLUBS)],
				),
			});
			const first = playCard(state, 0);
			expect(canChain(first)).toBeTrue();
			expect(
				isLegalMove(first, card(RankCharacter.Queen, Suit.SPADES)),
			).toBeTrue();
			expect(isLegalMove(first, card(9, Suit.DIAMS))).toBeFalse();
		});

		it("does not cancel the misses a player still owes after the opponent moved", () => {
			const state = queenGame({
				turn: Turn.OPPONENT,
				pendingMiss: { player: Turn.ME, left: 2 },
				hands: hands(
					[card(9, Suit.DIAMS)],
					[
						card(RankCharacter.Queen, Suit.CLUBS),
						card(5, Suit.CLUBS),
					],
				),
			});
			const next = playCard(state, 0);
			expect(next.turn).toBe(Turn.ME);
			expect(next.obligation).toEqual({ kind: "miss", turns: 2 });
			// the Queen on top does not let the human out of it
			expect(isLegalMove(next, card(9, Suit.DIAMS))).toBeFalse();
		});
	});

	describe("optional rule: Binding Jack", () => {
		const bindingRules = withRules("jackBindsBoth");
		const jack = card(RankCharacter.Jack, Suit.SPADES);
		const jackGame = (changes: Partial<GameState> & { top?: Card } = {}) =>
			makeState({
				rules: bindingRules,
				top: card(6, Suit.SPADES),
				hands: hands(
					[jack, card(7, Suit.CLUBS), card(9, Suit.DIAMS)],
					[
						card(7, Suit.HEARTS),
						card(8, Suit.HEARTS),
						card(5, Suit.HEARTS),
					],
				),
				...changes,
			});

		it("is off by default: the Jack only binds the opponent", () => {
			let state = playCard(jackGame({ rules: DEFAULT_RULES }), 0, {
				rank: 7,
			});
			expect(state.demand).toBeNull();
			state = playCard(state, 0);
			expect(state.turn).toBe(Turn.ME);
			expect(state.obligation).toEqual({ kind: "none" });
		});

		it("binds the opponent, then the owner, then ends", () => {
			let state = playCard(jackGame(), 0, { rank: 7 });
			expect(state.turn).toBe(Turn.OPPONENT);
			expect(state.obligation).toEqual({ kind: "rank", rank: 7 });
			expect(state.demand).toEqual({
				rank: 7,
				owner: Turn.ME,
				stage: "opponent",
			});

			state = playCard(state, 0); // 7♥
			expect(state.turn).toBe(Turn.ME);
			expect(state.obligation).toEqual({ kind: "rank", rank: 7 });
			expect(state.demand?.stage).toBe("owner");
			expect(isLegalMove(state, card(9, Suit.DIAMS))).toBeFalse();
			expect(isLegalMove(state, card(7, Suit.CLUBS))).toBeTrue();

			state = playCard(state, 0); // 7♣
			expect(state.turn).toBe(Turn.OPPONENT);
			expect(state.obligation).toEqual({ kind: "none" });
			expect(state.demand).toBeNull();
		});

		it("still binds the owner after the opponent picked a card", () => {
			let state = playCard(jackGame(), 0, { rank: 10 });

			state = pickCards(state, keepOrder);

			expect(state.hands[Turn.OPPONENT].length).toBe(4);
			expect(state.turn).toBe(Turn.ME);
			expect(state.obligation).toEqual({ kind: "rank", rank: 10 });
		});

		it("lets the owner pick when they cannot play the rank, which ends the call", () => {
			let state = playCard(jackGame(), 0, { rank: 8 });
			state = playCard(state, 1); // 8♥
			expect(state.obligation).toEqual({ kind: "rank", rank: 8 });

			state = pickCards(state, keepOrder);

			expect(state.turn).toBe(Turn.OPPONENT);
			expect(state.obligation).toEqual({ kind: "none" });
			expect(state.demand).toBeNull();
		});

		it("works for the bot's Jack too", () => {
			const state = playCard(
				jackGame({
					turn: Turn.OPPONENT,
					hands: hands(
						[card(7, Suit.CLUBS), card(9, Suit.DIAMS)],
						[jack, card(5, Suit.HEARTS)],
					),
				}),
				0,
				{ rank: 7 },
			);
			expect(state.turn).toBe(Turn.ME);
			const answered = playCard(state, 0); // 7♣
			expect(answered.turn).toBe(Turn.OPPONENT);
			expect(answered.obligation).toEqual({ kind: "rank", rank: 7 });
			expect(answered.demand?.owner).toBe(Turn.OPPONENT);
		});

		it("ends the game when the opponent plays its last card", () => {
			const state = playCard(
				jackGame({
					hands: hands(
						[jack, card(7, Suit.CLUBS)],
						[card(7, Suit.HEARTS)],
					),
				}),
				0,
				{ rank: 7 },
			);
			expect(playCard(state, 0).winner).toBe(Turn.OPPONENT);
		});

		it("is cancelled by a Queen when that rule is on too", () => {
			const rules = { ...bindingRules, queenWild: true };
			const state = playCard(
				jackGame({
					rules,
					hands: hands(
						[jack, card(7, Suit.CLUBS)],
						[
							card(RankCharacter.Queen, Suit.CLUBS),
							card(5, Suit.HEARTS),
						],
					),
				}),
				0,
				{ rank: 7 },
			);

			const next = playCard(state, 0);

			expect(next.turn).toBe(Turn.ME);
			expect(next.obligation).toEqual({ kind: "none" });
			expect(next.demand).toBeNull();
		});
	});

	describe("optional rule: Stacking penalties", () => {
		const stackRules = withRules("anyPenaltyStacks");
		const stackGame = (changes: Partial<GameState> = {}) =>
			makeState({
				rules: stackRules,
				top: card(2, Suit.SPADES),
				obligation: { kind: "pick", count: 2 },
				hands: hands(
					[
						card(3, Suit.CLUBS),
						card(RankCharacter.King, Suit.HEARTS),
						card(RankCharacter.King, Suit.CLUBS),
						card(2, Suit.DIAMS),
						card(9, Suit.DIAMS),
					],
					[card(5, Suit.CLUBS), card(6, Suit.CLUBS)],
				),
				...changes,
			});

		it("is off by default: only the same rank passes a penalty", () => {
			const state = stackGame({ rules: DEFAULT_RULES });
			expect(isLegalMove(state, card(3, Suit.CLUBS))).toBeFalse();
			expect(
				isLegalMove(state, card(RankCharacter.King, Suit.HEARTS)),
			).toBeFalse();
			expect(isLegalMove(state, card(2, Suit.DIAMS))).toBeTrue();
		});

		it("lets any penalty card pass a penalty", () => {
			const state = stackGame();
			expect(isLegalMove(state, card(3, Suit.CLUBS))).toBeTrue();
			expect(
				isLegalMove(state, card(RankCharacter.King, Suit.HEARTS)),
			).toBeTrue();
			expect(isLegalMove(state, card(2, Suit.DIAMS))).toBeTrue();
		});

		it("does not let a card without a penalty through", () => {
			const state = stackGame();
			expect(
				isLegalMove(state, card(RankCharacter.King, Suit.CLUBS)),
			).toBeFalse();
			expect(isLegalMove(state, card(9, Suit.DIAMS))).toBeFalse();
		});

		it("adds the penalties up", () => {
			const next = playCard(stackGame(), 0); // 3♣ on the 2
			expect(next.turn).toBe(Turn.OPPONENT);
			expect(next.obligation).toEqual({ kind: "pick", count: 5 });
		});

		it("can be passed back with another kind of penalty card", () => {
			let state = endChain(playCard(stackGame(), 1)); // K♥: 2 + 5, the K♣ stays in hand
			expect(state.obligation).toEqual({ kind: "pick", count: 7 });
			state = {
				...state,
				hands: hands(state.hands[0], [
					card(3, Suit.HEARTS),
					card(5, Suit.CLUBS),
				]),
			};
			const back = playCard(state, 0);
			expect(back.turn).toBe(Turn.ME);
			expect(back.obligation).toEqual({ kind: "pick", count: 10 });
		});
	});

	describe("optional rule: No finishing on an action card", () => {
		const noFinish = withRules("noActionFinish");
		const lastCard = (
			last: Card,
			changes: Partial<GameState> & { top?: Card } = {},
		) =>
			makeState({
				rules: noFinish,
				top: card(5, Suit.HEARTS),
				hands: hands(
					[last],
					[card(5, Suit.CLUBS), card(6, Suit.CLUBS)],
				),
				...changes,
			});

		it("is off by default: an action card can win the game", () => {
			const state = lastCard(card(2, Suit.HEARTS), {
				rules: DEFAULT_RULES,
			});
			expect(isLegalMove(state, card(2, Suit.HEARTS))).toBeTrue();
			expect(playCard(state, 0).winner).toBe(Turn.ME);
		});

		for (const action of [
			card(2, Suit.HEARTS),
			card(3, Suit.HEARTS),
			card(4, Suit.HEARTS),
			card(RankCharacter.Jack, Suit.HEARTS),
			card(RankCharacter.Ace, Suit.HEARTS),
			card(RankCharacter.King, Suit.HEARTS),
		])
			it(`does not allow ${action.rank}${action.suit} as the last card`, () => {
				expect(isLegalMove(lastCard(action), action)).toBeFalse();
			});

		it("allows other cards to finish", () => {
			for (const plain of [
				card(9, Suit.HEARTS),
				card(RankCharacter.Queen, Suit.HEARTS),
				card(RankCharacter.King, Suit.CLUBS),
			]) {
				const state = lastCard(plain, { top: card(5, plain.suit) });
				expect(isLegalMove(state, plain)).toBeTrue();
				expect(playCard(state, 0).winner).toBe(Turn.ME);
			}
		});

		it("allows an action card while there is another card in hand", () => {
			const state = lastCard(card(2, Suit.HEARTS), {
				hands: hands(
					[card(2, Suit.HEARTS), card(9, Suit.CLUBS)],
					[card(5, Suit.CLUBS), card(6, Suit.CLUBS)],
				),
			});
			expect(isLegalMove(state, card(2, Suit.HEARTS))).toBeTrue();
		});

		it("leaves a player with only an action card unable to pass a penalty on", () => {
			const state = lastCard(card(2, Suit.HEARTS), {
				top: card(2, Suit.SPADES),
				obligation: { kind: "pick", count: 2 },
			});
			expect(hasCounter(state)).toBeFalse();
		});

		it("does not let a chain end with the last card", () => {
			const state = lastCard(card(2, Suit.HEARTS), {
				hands: hands(
					[card(2, Suit.HEARTS), card(2, Suit.CLUBS)],
					[card(5, Suit.CLUBS), card(6, Suit.CLUBS)],
				),
			});

			const next = playCard(state, 0);

			// the other 2 would be the last card, so the turn is over
			expect(next.turn).toBe(Turn.OPPONENT);
			expect(next.chain).toEqual([]);
			expect(next.hands[Turn.ME].length).toBe(1);
			expect(next.obligation).toEqual({ kind: "pick", count: 2 });
		});
	});

	describe("optional rule: Playing the drawn card", () => {
		const drawRules = withRules("playAfterDraw");
		/** The human has two cards, none of which is playable; the next card in the deck is a 6♦. */
		const drawGame = (changes: Partial<GameState> & { top?: Card } = {}) =>
			makeState({
				rules: drawRules,
				top: card(6, Suit.SPADES),
				hands: hands(
					[card(9, Suit.HEARTS), card(10, Suit.HEARTS)],
					[card(5, Suit.CLUBS), card(8, Suit.CLUBS)],
				),
				...changes,
			});

		it("is off by default: picking a card ends the turn", () => {
			const next = pickCards(
				drawGame({ rules: DEFAULT_RULES }),
				keepOrder,
			);
			expect(next.turn).toBe(Turn.OPPONENT);
			expect(next.drawn).toBeNull();
		});

		it("keeps the turn open for a picked card that can be played", () => {
			const next = pickCards(drawGame(), keepOrder);

			expect(next.turn).toBe(Turn.ME);
			expect(next.drawn).toEqual(card(6, Suit.DIAMS));
			expect(next.hands[Turn.ME].length).toBe(3);
			expect(next.deck.length).toBe(19);
		});

		it("ends the turn when the picked card can't be played", () => {
			const next = pickCards(
				drawGame({ top: card(9, Suit.CLUBS) }),
				keepOrder,
			);
			expect(next.turn).toBe(Turn.OPPONENT);
			expect(next.drawn).toBeNull();
			expect(next.hands[Turn.ME].length).toBe(3);
		});

		it("only lets the picked card be played", () => {
			const state = pickCards(
				drawGame({
					hands: hands(
						[card(9, Suit.SPADES), card(10, Suit.HEARTS)],
						[card(5, Suit.CLUBS), card(8, Suit.CLUBS)],
					),
					top: card(6, Suit.SPADES),
				}),
				keepOrder,
			);
			// 9♠ matches the suit, but a card was picked and only that one counts
			expect(state.drawn).not.toBeNull();
			expect(isLegalMove(state, card(9, Suit.SPADES))).toBeFalse();
			expect(isLegalMove(state, card(6, Suit.DIAMS))).toBeTrue();
		});

		it("plays the picked card", () => {
			const state = pickCards(drawGame(), keepOrder);

			const next = playCard(state, 2);

			expect(topOf(next)).toEqual(card(6, Suit.DIAMS));
			expect(next.turn).toBe(Turn.OPPONENT);
			expect(next.drawn).toBeNull();
			expect(next.hands[Turn.ME].length).toBe(2);
		});

		it("keeps the picked card and ends the turn", () => {
			const next = keepDrawn(pickCards(drawGame(), keepOrder));

			expect(next.turn).toBe(Turn.OPPONENT);
			expect(next.drawn).toBeNull();
			expect(next.hands[Turn.ME].length).toBe(3);
			expect(next.obligation).toEqual({ kind: "none" });
		});

		it("can't be picked twice", () => {
			const state = pickCards(drawGame(), keepOrder);
			expect(pickCards(state, keepOrder)).toBe(state);
		});

		it("does not apply to penalty cards", () => {
			const next = pickCards(
				drawGame({
					top: card(2, Suit.SPADES),
					obligation: { kind: "pick", count: 2 },
				}),
				keepOrder,
			);
			expect(next.turn).toBe(Turn.OPPONENT);
			expect(next.drawn).toBeNull();
			expect(next.hands[Turn.ME].length).toBe(4);
		});

		it("lets a card be played that answers a called rank", () => {
			const wanted = pickCards(
				drawGame({ obligation: { kind: "rank", rank: 6 } }),
				keepOrder,
			);
			expect(wanted.drawn).not.toBeNull();

			const other = pickCards(
				drawGame({ obligation: { kind: "rank", rank: 7 } }),
				keepOrder,
			);
			expect(other.drawn).toBeNull();
			expect(other.turn).toBe(Turn.OPPONENT);
		});
	});
});
