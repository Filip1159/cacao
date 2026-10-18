import { TestBed } from "@angular/core/testing";
import { GameService } from "../service/game.service";
import { topOf } from "../service/rules";
import { Suit } from "../model/Suit";
import { RankCharacter } from "../model/Rank";
import { Turn } from "../model/enum/Turn";
import { Difficulty } from "../model/enum/Difficulty";
import { card, setHands, setTop, unshuffled } from "./support";

describe("GameService", () => {
	let game: GameService;

	const me = () => game.state().hands[Turn.ME];
	const opponent = () => game.state().hands[Turn.OPPONENT];

	beforeEach(() => {
		// the bot's reply is scheduled with a timer
		jasmine.clock().install();
		TestBed.configureTestingModule({
			providers: unshuffled(),
		});
		game = TestBed.inject(GameService);
	});

	afterEach(() => jasmine.clock().uninstall());

	describe("initial state", () => {
		it("deals 5 cards to each player", () => {
			expect(me().length).toBe(5);
			expect(opponent().length).toBe(5);
		});

		it("leaves 41 cards in the deck", () => {
			expect(game.deckSize()).toBe(41);
		});

		it("starts with a basic card on the discard pile", () => {
			expect(game.top()).toEqual(card(RankCharacter.King, Suit.CLUBS));
		});

		it("starts with the human's turn", () => {
			expect(game.state().turn).toBe(Turn.ME);
			expect(game.isMyTurn()).toBeTrue();
		});
	});

	describe("human moves", () => {
		beforeEach(() => {
			setTop(game, card(9, Suit.CLUBS));
			setHands(game, {
				me: [card(8, Suit.CLUBS), card(5, Suit.DIAMS)],
				opponent: [card(6, Suit.HEARTS), card(7, Suit.HEARTS)],
			});
		});

		it("play puts the card on the discard pile and hands over to the bot", () => {
			game.play(0);
			expect(me()).toEqual([card(5, Suit.DIAMS)]);
			expect(game.top()).toEqual(card(8, Suit.CLUBS));
			expect(game.state().turn).toBe(Turn.OPPONENT);
			expect(game.isOpponentsTurn()).toBeTrue();
		});

		it("play passes the call of a Jack on", () => {
			setHands(game, {
				me: [card(RankCharacter.Jack, Suit.CLUBS), card(5, Suit.DIAMS)],
			});
			game.play(0, { rank: 7 });
			expect(game.state().obligation).toEqual({ kind: "rank", rank: 7 });
		});

		it("play does nothing on the bot's turn", () => {
			game.play(0);
			const state = game.state();
			game.play(0);
			expect(game.state()).toBe(state);
		});

		it("pick draws one card, or the whole penalty", () => {
			game.pick();
			expect(me().length).toBe(3);
			expect(game.deckSize()).toBe(40);
			expect(game.state().turn).toBe(Turn.OPPONENT);

			game.patch({
				turn: Turn.ME,
				obligation: { kind: "pick", count: 4 },
			});
			game.pick();
			expect(me().length).toBe(7);
		});

		it("canHumanPick is true on the human's turn only", () => {
			expect(game.canHumanPick()).toBeTrue();
			game.patch({ turn: Turn.OPPONENT });
			expect(game.canHumanPick()).toBeFalse();
		});

		it("canHumanPick is false while missing a turn, and miss serves it", () => {
			game.patch({
				obligation: { kind: "miss", turns: 1 },
			});
			expect(game.canHumanPick()).toBeFalse();
			expect(game.canMiss()).toBeTrue();
			game.pick();
			expect(me().length).toBe(2);
			game.miss();
			expect(game.state().turn).toBe(Turn.OPPONENT);
			expect(me().length).toBe(2);
		});

		it("miss is not possible without a turn to miss or on the bot's turn", () => {
			expect(game.canMiss()).toBeFalse();
			game.miss();
			expect(game.state().turn).toBe(Turn.ME);

			game.patch({
				obligation: { kind: "miss", turns: 1 },
				turn: Turn.OPPONENT,
			});
			expect(game.canMiss()).toBeFalse();
		});

		it("nothing is possible after the game", () => {
			game.patch({ winner: Turn.OPPONENT });
			expect(game.canHumanPick()).toBeFalse();
			expect(game.isLegalMove(card(8, Suit.CLUBS))).toBeFalse();
		});

		it("a chain keeps the turn until it is ended", () => {
			setHands(game, {
				me: [
					card(7, Suit.CLUBS),
					card(7, Suit.HEARTS),
					card(9, Suit.CLUBS),
				],
			});
			game.play(0);
			expect(game.isChaining()).toBeTrue();
			expect(game.canHumanPick()).toBeFalse();
			expect(game.state().turn).toBe(Turn.ME);
			game.endTurn();
			expect(game.isChaining()).toBeFalse();
			expect(game.state().turn).toBe(Turn.OPPONENT);
		});

		it("endTurn does nothing without a chain", () => {
			game.endTurn();
			expect(game.state().turn).toBe(Turn.ME);
		});

		it("hasCounter looks at the human's hand", () => {
			expect(game.hasCounter()).toBeTrue();
			setHands(game, { me: [card(8, Suit.HEARTS)] });
			expect(game.hasCounter()).toBeFalse();
		});
	});

	describe("the bot", () => {
		beforeEach(() => {
			setTop(game, card(9, Suit.CLUBS));
			setHands(game, {
				me: [
					card(8, Suit.CLUBS),
					card(5, Suit.DIAMS),
					card(5, Suit.HEARTS),
				],
				opponent: [card(6, Suit.HEARTS), card(7, Suit.HEARTS)],
			});
			game.play(0);
		});

		it("answers after a short delay", () => {
			jasmine.clock().tick(900);
			expect(game.state().turn).toBe(Turn.OPPONENT);
			jasmine.clock().tick(200);
			// nothing to play on the 8♣: it drew a card
			expect(opponent().length).toBe(3);
			expect(game.state().turn).toBe(Turn.ME);
		});

		it("is recorded as the one who played the top card", () => {
			expect(game.lastPlayer()).toBe(Turn.ME);
			game.patch({ discard: [card(6, Suit.CLUBS)] });
			setHands(game, {
				opponent: [card(6, Suit.HEARTS), card(7, Suit.HEARTS)],
			});
			jasmine.clock().tick(1100);
			expect(game.top()).toEqual(card(6, Suit.HEARTS));
			expect(game.lastPlayer()).toBe(Turn.OPPONENT);
		});

		it("does not change the last player when a card is only picked", () => {
			jasmine.clock().tick(1100); // draws: nothing fits the 8♣
			expect(game.lastPlayer()).toBe(Turn.ME);
		});

		it("follows the difficulty that is set", () => {
			// easy never chains cards, so it can only play one of its 6s
			game.difficulty.set(Difficulty.EASY);
			game.patch({ turn: Turn.OPPONENT, discard: [card(6, Suit.CLUBS)] });
			setHands(game, {
				opponent: [card(6, Suit.HEARTS), card(6, Suit.SPADES)],
			});
			jasmine.clock().tick(1100);
			expect(opponent().length).toBe(1);
		});
	});

	describe("Macau", () => {
		beforeEach(() => {
			setTop(game, card(9, Suit.CLUBS));
			// nothing in the bot's hand can be played on the 8♣, so it just draws
			setHands(game, {
				me: [card(8, Suit.CLUBS), card(5, Suit.DIAMS)],
				opponent: [card(6, Suit.HEARTS), card(7, Suit.HEARTS)],
			});
			game.play(0);
		});

		it("is pending once the human is down to one card", () => {
			expect(game.macauPending()).toBeTrue();
		});

		it("saying Macau in time avoids the penalty", () => {
			game.callMacau();
			jasmine.clock().tick(2600);
			expect(opponent().length).toBe(3);
			expect(me().length).toBe(1);
			expect(game.notice()).toBeNull();
		});

		it("gives the human extra time before the bot moves", () => {
			jasmine.clock().tick(1100);
			expect(opponent().length).toBe(2);
			expect(game.macauPending()).toBeTrue();
		});

		it("forgetting Macau costs 2 cards", () => {
			jasmine.clock().tick(2600);
			expect(me().length).toBe(3);
			expect(game.macauPending()).toBeFalse();
			expect(game.notice()).toContain("forgot to say Macau");
			expect(opponent().length).toBe(3);
		});

		it("the penalty message goes away after the human's next turn", () => {
			jasmine.clock().tick(2600);
			expect(game.notice()).not.toBeNull();
			game.pick();
			expect(game.notice()).toBeNull();
		});
	});

	describe("game over", () => {
		beforeEach(() => {
			setTop(game, card(9, Suit.CLUBS));
			setHands(game, { me: [card(8, Suit.CLUBS)] });
		});

		it("the human wins by playing the last card", () => {
			game.play(0);
			expect(game.winner()).toBe(Turn.ME);
			expect(game.isMyTurn()).toBeFalse();
			expect(game.isOpponentsTurn()).toBeFalse();
		});

		it("the bot does not move after the human has won", () => {
			game.play(0);
			jasmine.clock().tick(5000);
			expect(opponent().length).toBe(5);
		});

		it("the bot wins by playing its last card", () => {
			setHands(game, {
				me: [
					card(5, Suit.DIAMS),
					card(6, Suit.DIAMS),
					card(7, Suit.DIAMS),
				],
				opponent: [card(5, Suit.HEARTS)],
			});
			game.play(0);
			jasmine.clock().tick(1100);
			expect(game.winner()).toBe(Turn.OPPONENT);
		});

		it("restart deals a new game", () => {
			game.play(0);
			game.patch({
				obligation: { kind: "suit", suit: Suit.HEARTS },
			});
			game.notice.set("something");

			game.restart();

			const state = game.state();
			expect(state.winner).toBeNull();
			expect(state.turn).toBe(Turn.ME);
			expect(me().length).toBe(5);
			expect(opponent().length).toBe(5);
			expect(game.deckSize()).toBe(41);
			expect(state.discard.length).toBe(1);
			expect(state.obligation).toEqual({ kind: "none" });
			expect(state.macauPending).toBeFalse();
			expect(game.notice()).toBeNull();
		});

		it("restart cancels the bot's pending move", () => {
			setHands(game, { me: [card(8, Suit.CLUBS), card(5, Suit.DIAMS)] });
			game.play(0); // schedules the bot's reply
			game.restart();
			jasmine.clock().tick(5000);
			expect(game.state().turn).toBe(Turn.ME);
			expect(opponent().length).toBe(5);
		});
	});
});
