import { ComponentFixture, TestBed } from "@angular/core/testing";
import { GameService } from "../service/game.service";
import { CardService } from "../service/card.service";
import { BotPlayer } from "../service/player/BotPlayer";
import { Card } from "../model/Card";
import { MockCardService, card } from "./support";
import { Suit } from "../model/Suit";
import { RankCharacter } from "../model/Rank";
import { State } from "../model/enum/State";
import { Difficulty } from "../model/enum/Difficulty";
import { Turn } from "../model/enum/Turn";
import { PlayerComponent } from "../components/players/player/player.component";
import { SuitCalledModalComponent } from "../components/suit-called-modal/suit-called-modal.component";
import { GameOverComponent } from "../components/game-over/game-over.component";
import { StatusComponent } from "../components/status/status.component";
import { DrawPileComponent } from "../components/draw-pile/draw-pile.component";
import { RulesModalComponent } from "../components/rules-modal/rules-modal.component";
import { CardCalledModalComponent } from "../components/card-called-modal/card-called-modal.component";

describe("Game logic", () => {
	let gameService: GameService;
	let cardService: MockCardService;
	let human: GameService["players"][number];
	let bot: GameService["players"][number];

	afterEach(() => jasmine.clock().uninstall());

	const setHand = (player: typeof human, cards: Card[]) => {
		player.cards.length = 0;
		player.cards.push(...cards);
	};

	beforeEach(() => {
		// the bot's reply is scheduled with a timer; keep it from firing
		jasmine.clock().install();
		TestBed.configureTestingModule({
			providers: [{ provide: CardService, useClass: MockCardService }],
		});
		gameService = TestBed.inject(GameService);
		cardService = gameService.cardService as MockCardService;
		human = gameService.players[Turn.ME];
		bot = gameService.players[Turn.OPPONENT];
	});

	describe("initial state", () => {
		it("deals 5 cards to each player", () => {
			expect(human.cards.length).toBe(5);
			expect(bot.cards.length).toBe(5);
		});

		it("leaves 41 cards in the deck", () => {
			expect(cardService.getDeck().length).toBe(41);
		});

		it("starts with a basic card on the discard pile", () => {
			expect(cardService.discardPileTop).toEqual(
				card(RankCharacter.King, Suit.CLUBS),
			);
		});

		it("starts with the human's turn", () => {
			expect(gameService.turn.value).toBe(Turn.ME);
		});
	});

	describe("isLegalMove", () => {
		beforeEach(() => {
			cardService.setDiscardPile([card(6, Suit.SPADES)]);
		});

		it("accepts a card with the same suit", () => {
			expect(gameService.isLegalMove(card(9, Suit.SPADES))).toBeTrue();
		});

		it("accepts a card with the same rank, even as a different Rank instance", () => {
			expect(gameService.isLegalMove(card(6, Suit.HEARTS))).toBeTrue();
		});

		it("rejects a card matching neither rank nor suit", () => {
			expect(gameService.isLegalMove(card(9, Suit.HEARTS))).toBeFalse();
		});

		it("rejects every card while the player has to pick cards", () => {
			human.state = State.CARD_PICKING;
			expect(gameService.isLegalMove(card(9, Suit.SPADES))).toBeFalse();
		});

		it("while picking cards only accepts a penalty card of the same rank", () => {
			human.state = State.CARD_PICKING;
			cardService.setDiscardPile([card(2, Suit.HEARTS)]);
			expect(gameService.isLegalMove(card(2, Suit.SPADES))).toBeTrue();
			expect(gameService.isLegalMove(card(3, Suit.HEARTS))).toBeFalse();
			expect(gameService.isLegalMove(card(9, Suit.HEARTS))).toBeFalse();

			cardService.setDiscardPile([card(RankCharacter.King, Suit.SPADES)]);
			expect(
				gameService.isLegalMove(card(RankCharacter.King, Suit.HEARTS)),
			).toBeTrue();
			// K♦ and K♣ carry no penalty, so they can't pass one on
			expect(
				gameService.isLegalMove(card(RankCharacter.King, Suit.DIAMS)),
			).toBeFalse();
		});

		it("rejects every card while the player misses a turn", () => {
			human.state = State.MISSING;
			expect(gameService.isLegalMove(card(9, Suit.SPADES))).toBeFalse();
		});

		it("after an Ace only accepts the called suit, regardless of rank", () => {
			cardService.setDiscardPile([card(RankCharacter.Ace, Suit.SPADES)]);
			human.state = State.SUIT_CALLED;
			gameService.suitCalled = Suit.HEARTS;
			expect(gameService.isLegalMove(card(9, Suit.HEARTS))).toBeTrue();
			expect(
				gameService.isLegalMove(card(RankCharacter.Ace, Suit.HEARTS)),
			).toBeTrue();
			expect(gameService.isLegalMove(card(9, Suit.SPADES))).toBeFalse();
			expect(
				gameService.isLegalMove(card(RankCharacter.Ace, Suit.SPADES)),
			).toBeFalse();
		});

		it("after a Jack only accepts the called rank, regardless of suit", () => {
			cardService.setDiscardPile([card(RankCharacter.Jack, Suit.SPADES)]);
			human.state = State.CARD_CALLED;
			gameService.cardCalled = 7;
			expect(gameService.isLegalMove(card(7, Suit.DIAMS))).toBeTrue();
			expect(gameService.isLegalMove(card(8, Suit.SPADES))).toBeFalse();
		});
	});

	describe("special card effects", () => {
		beforeEach(() => {
			// the bot's reaction is scheduled with a timer; don't let it run
			spyOn(bot, "makeAction");
		});

		it("2 makes the opponent pick 2 cards", () => {
			setHand(human, [card(2, Suit.HEARTS), card(5, Suit.DIAMS)]);
			cardService.setDiscardPile([card(9, Suit.HEARTS)]);
			human.chosenMove = 0;
			human.playCard();
			expect(bot.state).toBe(State.CARD_PICKING);
			expect(gameService.cardsToPick).toBe(2);
		});

		it("3 makes the opponent pick 3 cards", () => {
			setHand(human, [card(3, Suit.HEARTS), card(5, Suit.DIAMS)]);
			cardService.setDiscardPile([card(9, Suit.HEARTS)]);
			human.chosenMove = 0;
			human.playCard();
			expect(bot.state).toBe(State.CARD_PICKING);
			expect(gameService.cardsToPick).toBe(3);
		});

		it("4 makes the opponent miss a turn", () => {
			setHand(human, [card(4, Suit.HEARTS), card(5, Suit.DIAMS)]);
			cardService.setDiscardPile([card(9, Suit.HEARTS)]);
			human.chosenMove = 0;
			human.playCard();
			expect(bot.state).toBe(State.MISSING);
		});

		[Suit.HEARTS, Suit.SPADES].forEach((suit) => {
			it(`K${suit} makes the opponent pick 5 cards`, () => {
				setHand(human, [
					card(RankCharacter.King, suit),
					card(5, Suit.DIAMS),
				]);
				cardService.setDiscardPile([card(9, suit)]);
				human.chosenMove = 0;
				human.playCard();
				expect(bot.state).toBe(State.CARD_PICKING);
				expect(gameService.cardsToPick).toBe(5);
			});
		});

		[Suit.DIAMS, Suit.CLUBS].forEach((suit) => {
			it(`K${suit} has no effect`, () => {
				setHand(human, [
					card(RankCharacter.King, suit),
					card(5, Suit.HEARTS),
				]);
				cardService.setDiscardPile([card(9, suit)]);
				human.chosenMove = 0;
				human.playCard();
				expect(bot.state).toBe(State.WAITING_FOR_CARD);
				expect(gameService.cardsToPick).toBe(0);
			});
		});

		it("A makes the opponent play the called suit", () => {
			setHand(human, [
				card(RankCharacter.Ace, Suit.CLUBS),
				card(5, Suit.DIAMS),
			]);
			cardService.setDiscardPile([card(9, Suit.CLUBS)]);
			human.chosenMove = 0;
			human.chosenSuit = Suit.HEARTS;
			human.playCard();
			expect(bot.state).toBe(State.SUIT_CALLED);
			expect(gameService.suitCalled).toBe(Suit.HEARTS);
		});

		it("the called suit is forgotten once the opponent has moved", () => {
			setHand(human, [
				card(RankCharacter.Ace, Suit.CLUBS),
				card(5, Suit.DIAMS),
			]);
			setHand(bot, [card(9, Suit.HEARTS), card(3, Suit.SPADES)]);
			cardService.setDiscardPile([card(9, Suit.CLUBS)]);
			human.chosenMove = 0;
			human.chosenSuit = Suit.HEARTS;
			human.playCard();
			(bot.makeAction as jasmine.Spy).and.callThrough();
			bot.makeAction();
			expect(cardService.discardPileTop).toEqual(card(9, Suit.HEARTS));
			expect(gameService.suitCalled).toBeNull();
			expect(human.state).toBe(State.WAITING_FOR_CARD);
		});

		it("a countered penalty adds up for the next player", () => {
			setHand(human, [card(2, Suit.SPADES), card(5, Suit.DIAMS)]);
			cardService.setDiscardPile([card(2, Suit.HEARTS)]);
			human.state = State.CARD_PICKING;
			gameService.cardsToPick = 4;
			human.chosenMove = 0;
			human.makeAction();
			expect(cardService.discardPileTop).toEqual(card(2, Suit.SPADES));
			expect(bot.state).toBe(State.CARD_PICKING);
			expect(gameService.cardsToPick).toBe(6);
		});

		it("drawing the penalty does not carry it over", () => {
			setHand(human, [card(9, Suit.CLUBS)]);
			human.state = State.CARD_PICKING;
			gameService.cardsToPick = 4;
			human.makeAction();
			expect(human.cards.length).toBe(5);
			expect(bot.state).toBe(State.WAITING_FOR_CARD);
			expect(gameService.cardsToPick).toBe(0);
		});

		it("playing a card moves it to the discard pile and passes the turn", () => {
			setHand(human, [card(8, Suit.CLUBS), card(5, Suit.DIAMS)]);
			cardService.setDiscardPile([card(9, Suit.CLUBS)]);
			human.chosenMove = 0;
			human.playCard();
			expect(human.cards.length).toBe(1);
			expect(cardService.discardPileTop).toEqual(card(8, Suit.CLUBS));
			expect(gameService.turn.value).toBe(Turn.OPPONENT);
		});
	});

	describe("bot", () => {
		beforeEach(() => {
			gameService.turn.next(Turn.OPPONENT);
		});

		it("calls the rank it holds most of when playing a Jack", () => {
			setHand(bot, [
				card(RankCharacter.Jack, Suit.CLUBS),
				card(7, Suit.HEARTS),
				card(7, Suit.DIAMS),
				card(9, Suit.SPADES),
			]);
			cardService.setDiscardPile([card(5, Suit.CLUBS)]);
			bot.makeAction();
			expect(cardService.discardPileTop.rank.value).toBe(
				RankCharacter.Jack,
			);
			expect(gameService.cardCalled).toBe(7);
			expect(human.state).toBe(State.CARD_CALLED);
		});

		it("calls a rank between 5 and 10 when it has none to prefer", () => {
			setHand(bot, [
				card(RankCharacter.Jack, Suit.CLUBS),
				card(2, Suit.HEARTS),
			]);
			const rank = (bot as BotPlayer).chooseRankToCall();
			expect(rank).toBeGreaterThanOrEqual(5);
			expect(rank).toBeLessThanOrEqual(10);
		});

		it("plays the called rank after the human's Jack", () => {
			setHand(bot, [
				card(3, Suit.HEARTS),
				card(7, Suit.DIAMS),
				card(9, Suit.SPADES),
			]);
			cardService.setDiscardPile([card(RankCharacter.Jack, Suit.SPADES)]);
			bot.state = State.CARD_CALLED;
			gameService.cardCalled = 7;
			bot.makeAction();
			expect(bot.cards).toEqual([
				card(3, Suit.HEARTS),
				card(9, Suit.SPADES),
			]);
			expect(cardService.discardPileTop).toEqual(card(7, Suit.DIAMS));
		});

		it("draws one card when it cannot play the called rank", () => {
			setHand(bot, [card(3, Suit.HEARTS), card(9, Suit.SPADES)]);
			cardService.setDiscardPile([card(RankCharacter.Jack, Suit.SPADES)]);
			bot.state = State.CARD_CALLED;
			gameService.cardCalled = 7;
			bot.makeAction();
			expect(bot.cards.length).toBe(3);
			expect(cardService.discardPileTop).toEqual(
				card(RankCharacter.Jack, Suit.SPADES),
			);
		});

		it("calls the suit it holds most of when playing an Ace", () => {
			setHand(bot, [
				card(RankCharacter.Ace, Suit.CLUBS),
				card(7, Suit.HEARTS),
				card(8, Suit.HEARTS),
				card(9, Suit.SPADES),
			]);
			cardService.setDiscardPile([card(5, Suit.CLUBS)]);
			bot.makeAction();
			expect(cardService.discardPileTop.rank.value).toBe(
				RankCharacter.Ace,
			);
			expect(gameService.suitCalled).toBe(Suit.HEARTS);
			expect(human.state).toBe(State.SUIT_CALLED);
		});

		it("plays a card of the called suit after the human's Ace", () => {
			setHand(bot, [
				card(3, Suit.SPADES),
				card(7, Suit.HEARTS),
				card(9, Suit.SPADES),
			]);
			cardService.setDiscardPile([card(RankCharacter.Ace, Suit.SPADES)]);
			bot.state = State.SUIT_CALLED;
			gameService.suitCalled = Suit.HEARTS;
			bot.makeAction();
			expect(cardService.discardPileTop).toEqual(card(7, Suit.HEARTS));
			expect(bot.cards.length).toBe(2);
		});

		it("draws one card when it cannot follow the called suit", () => {
			setHand(bot, [card(3, Suit.SPADES), card(9, Suit.SPADES)]);
			cardService.setDiscardPile([card(RankCharacter.Ace, Suit.SPADES)]);
			bot.state = State.SUIT_CALLED;
			gameService.suitCalled = Suit.HEARTS;
			bot.makeAction();
			expect(bot.cards.length).toBe(3);
			expect(cardService.discardPileTop).toEqual(
				card(RankCharacter.Ace, Suit.SPADES),
			);
		});

		it("counters a penalty with a card of the same rank", () => {
			setHand(bot, [card(9, Suit.SPADES), card(3, Suit.CLUBS)]);
			cardService.setDiscardPile([card(3, Suit.HEARTS)]);
			bot.state = State.CARD_PICKING;
			gameService.cardsToPick = 3;
			bot.makeAction();
			expect(cardService.discardPileTop).toEqual(card(3, Suit.CLUBS));
			expect(bot.cards.length).toBe(1);
			expect(human.state).toBe(State.CARD_PICKING);
			expect(gameService.cardsToPick).toBe(6);
		});

		describe("strategy", () => {
			const humanWithCards = (n: number) =>
				setHand(
					human,
					Array.from({ length: n }, () => card(9, Suit.HEARTS)),
				);
			const bestMove = () => (bot as BotPlayer).getBestMove();

			beforeEach(() => {
				cardService.setDiscardPile([card(5, Suit.CLUBS)]);
				humanWithCards(5);
			});

			it("plays plain cards before Jacks, Aces and attack cards", () => {
				setHand(bot, [
					card(RankCharacter.Jack, Suit.CLUBS),
					card(RankCharacter.Ace, Suit.CLUBS),
					card(2, Suit.CLUBS),
					card(4, Suit.CLUBS),
					card(7, Suit.CLUBS),
				]);
				expect(bestMove()).toBe(4);
			});

			it("holds back attack cards while the human has many cards", () => {
				setHand(bot, [card(2, Suit.CLUBS), card(7, Suit.CLUBS)]);
				expect(bestMove()).toBe(1);
			});

			it("attacks once the human is close to winning", () => {
				humanWithCards(3);
				setHand(bot, [card(7, Suit.CLUBS), card(2, Suit.CLUBS)]);
				expect(bestMove()).toBe(1);
			});

			it("saves Jacks and Aces for when nothing else is playable", () => {
				setHand(bot, [
					card(RankCharacter.Ace, Suit.CLUBS),
					card(RankCharacter.Jack, Suit.CLUBS),
					card(2, Suit.CLUBS),
				]);
				expect(bestMove()).toBe(2); // the 2, then the Jack, then the Ace
				bot.removeCard(2);
				expect(bestMove()).toBe(1);
			});

			it("takes the earliest card among equals", () => {
				setHand(bot, [card(8, Suit.CLUBS), card(7, Suit.CLUBS)]);
				expect(bestMove()).toBe(0);
			});

			it("ignores cards it cannot play", () => {
				setHand(bot, [card(8, Suit.HEARTS), card(7, Suit.CLUBS)]);
				expect(bestMove()).toBe(1);
				setHand(bot, [card(8, Suit.HEARTS)]);
				expect(bestMove()).toBe(-1);
			});
		});

		it("draws the penalty cards", () => {
			setHand(bot, [card(9, Suit.SPADES)]);
			bot.state = State.CARD_PICKING;
			gameService.cardsToPick = 3;
			bot.makeAction();
			expect(bot.cards.length).toBe(4);
		});
	});

	describe("human picking cards", () => {
		let component: PlayerComponent;

		beforeEach(() => {
			component =
				TestBed.createComponent(PlayerComponent).componentInstance;
			setHand(human, [card(9, Suit.SPADES)]);
			spyOn(bot, "makeAction");
		});

		it("draws all penalty cards", () => {
			human.state = State.CARD_PICKING;
			gameService.cardsToPick = 5;
			component.pickCardFromStack();
			expect(human.cards.length).toBe(6);
		});

		it("draws a single card when there is no penalty", () => {
			component.pickCardFromStack();
			expect(human.cards.length).toBe(2);
		});
	});

	describe("stacked misses", () => {
		beforeEach(() => {
			cardService.setDiscardPile([card(4, Suit.HEARTS)]);
		});

		it("while missing a turn only a 4 is playable, and only on a 4", () => {
			human.state = State.MISSING;
			expect(gameService.isLegalMove(card(4, Suit.CLUBS))).toBeTrue();
			expect(gameService.isLegalMove(card(9, Suit.HEARTS))).toBeFalse();
			cardService.setDiscardPile([card(9, Suit.HEARTS)]);
			expect(gameService.isLegalMove(card(4, Suit.HEARTS))).toBeFalse();
		});

		it("a 4 makes the opponent miss one turn", () => {
			setHand(human, [card(4, Suit.CLUBS), card(5, Suit.DIAMS)]);
			human.chosenMove = 0;
			human.playCard();
			expect(bot.state).toBe(State.MISSING);
			expect(gameService.turnsToMiss).toBe(1);
		});

		it("the bot passes a 4 back, doubling the misses", () => {
			gameService.turn.next(Turn.OPPONENT);
			bot.state = State.MISSING;
			gameService.turnsToMiss = 1;
			setHand(bot, [card(9, Suit.SPADES), card(4, Suit.DIAMS)]);
			bot.makeAction();
			expect(cardService.discardPileTop).toEqual(card(4, Suit.DIAMS));
			expect(human.state).toBe(State.MISSING);
			expect(gameService.turnsToMiss).toBe(2);
		});

		it("the human passes a 4 back too", () => {
			human.state = State.MISSING;
			gameService.turnsToMiss = 2;
			setHand(human, [card(4, Suit.CLUBS), card(5, Suit.DIAMS)]);
			human.chosenMove = 0;
			human.makeAction();
			expect(bot.state).toBe(State.MISSING);
			expect(gameService.turnsToMiss).toBe(3);
		});

		it("the bot misses its turn when it has no 4", () => {
			gameService.turn.next(Turn.OPPONENT);
			bot.state = State.MISSING;
			gameService.turnsToMiss = 1;
			setHand(bot, [card(9, Suit.HEARTS)]);
			bot.makeAction();
			expect(bot.cards.length).toBe(1);
			expect(gameService.turn.value).toBe(Turn.ME);
		});

		it("two stacked misses make a player miss two turns in a row", () => {
			human.state = State.MISSING;
			gameService.turnsToMiss = 2;
			setHand(human, [card(9, Suit.SPADES)]);
			setHand(bot, [card(8, Suit.HEARTS), card(9, Suit.HEARTS)]);

			human.makeAction(); // first miss
			expect(gameService.turn.value).toBe(Turn.OPPONENT);
			bot.makeAction();
			expect(bot.cards.length).toBe(1);

			// back to the human, who still has one turn to miss
			expect(gameService.turn.value).toBe(Turn.ME);
			expect(human.state).toBe(State.MISSING);
			expect(gameService.turnsToMiss).toBe(1);

			human.makeAction(); // second miss
			bot.makeAction();
			expect(bot.cards.length).toBe(0);
		});

		it("the missed turns end once they are served", () => {
			human.state = State.MISSING;
			gameService.turnsToMiss = 2;
			setHand(human, [card(9, Suit.SPADES)]);
			setHand(bot, [
				card(8, Suit.HEARTS),
				card(9, Suit.HEARTS),
				card(2, Suit.CLUBS),
			]);
			human.makeAction();
			bot.makeAction();
			human.makeAction();
			bot.makeAction();
			expect(gameService.turn.value).toBe(Turn.ME);
			expect(human.state as State).toBe(State.WAITING_FOR_CARD);
			expect(gameService.turnsToMiss).toBe(0);
		});
	});

	describe("same-rank chains", () => {
		beforeEach(() => {
			cardService.setDiscardPile([card(9, Suit.CLUBS)]);
		});

		const playFirst = () => {
			human.chosenMove = 0;
			human.playCard();
		};

		it("keeps the turn while more cards of the rank can be added", () => {
			setHand(human, [
				card(7, Suit.CLUBS),
				card(7, Suit.HEARTS),
				card(9, Suit.CLUBS),
			]);
			playFirst();
			expect(gameService.chain).toEqual([card(7, Suit.CLUBS)]);
			expect(gameService.turn.value).toBe(Turn.ME);
			expect(cardService.discardPileTop).toEqual(card(7, Suit.CLUBS));
			expect(gameService.canHumanPick()).toBeFalse();
		});

		it("only allows cards of the same rank while chaining", () => {
			setHand(human, [
				card(7, Suit.CLUBS),
				card(7, Suit.HEARTS),
				card(9, Suit.CLUBS),
			]);
			playFirst();
			expect(gameService.isLegalMove(card(7, Suit.HEARTS))).toBeTrue();
			// matches the suit of the top card, but not the chain's rank
			expect(gameService.isLegalMove(card(9, Suit.CLUBS))).toBeFalse();
		});

		it("ends the turn on request", () => {
			setHand(human, [
				card(7, Suit.CLUBS),
				card(7, Suit.HEARTS),
				card(9, Suit.CLUBS),
			]);
			playFirst();
			gameService.endChain();
			expect(gameService.chain).toEqual([]);
			expect(gameService.turn.value).toBe(Turn.OPPONENT);
			expect(human.cards.length).toBe(2);
		});

		it("ends the turn by itself after the last card of the rank", () => {
			setHand(human, [
				card(7, Suit.CLUBS),
				card(7, Suit.HEARTS),
				card(9, Suit.CLUBS),
			]);
			playFirst();
			human.chosenMove = 0; // 7♥
			human.playCard();
			expect(gameService.chain).toEqual([]);
			expect(gameService.turn.value).toBe(Turn.OPPONENT);
			expect(cardService.discardPileTop).toEqual(card(7, Suit.HEARTS));
		});

		it("adds up penalties: two 2s make 4 cards", () => {
			setHand(human, [
				card(2, Suit.CLUBS),
				card(2, Suit.HEARTS),
				card(5, Suit.DIAMS),
			]);
			playFirst();
			human.chosenMove = 0;
			human.playCard();
			expect(bot.state).toBe(State.CARD_PICKING);
			expect(gameService.cardsToPick).toBe(4);
		});

		it("adds up misses: two 4s make 2 turns", () => {
			setHand(human, [
				card(4, Suit.CLUBS),
				card(4, Suit.HEARTS),
				card(5, Suit.DIAMS),
			]);
			playFirst();
			human.chosenMove = 0;
			human.playCard();
			expect(bot.state).toBe(State.MISSING);
			expect(gameService.turnsToMiss).toBe(2);
		});

		it("playing every card of a chain wins", () => {
			setHand(human, [card(7, Suit.CLUBS), card(7, Suit.HEARTS)]);
			playFirst();
			human.chosenMove = 0;
			human.playCard();
			expect(gameService.winner()).toBe(Turn.ME);
		});

		it("never chains Jacks or Aces, they need a call", () => {
			setHand(human, [
				card(RankCharacter.Jack, Suit.CLUBS),
				card(RankCharacter.Jack, Suit.HEARTS),
				card(5, Suit.DIAMS),
			]);
			human.chosenRank = 7;
			playFirst();
			expect(gameService.chain).toEqual([]);
			expect(gameService.turn.value).toBe(Turn.OPPONENT);
			expect(gameService.cardCalled).toBe(7);
		});

		it("the bot plays all its cards of a rank", () => {
			gameService.turn.next(Turn.OPPONENT);
			cardService.setDiscardPile([card(5, Suit.CLUBS)]);
			setHand(bot, [
				card(7, Suit.CLUBS),
				card(9, Suit.DIAMS),
				card(7, Suit.HEARTS),
			]);
			bot.makeAction();
			expect(bot.cards).toEqual([card(9, Suit.DIAMS)]);
			expect(cardService.discardPileTop).toEqual(card(7, Suit.HEARTS));
			expect(gameService.turn.value).toBe(Turn.ME);
		});

		it("the easy bot plays a single card", () => {
			gameService.difficulty.set(Difficulty.EASY);
			gameService.turn.next(Turn.OPPONENT);
			cardService.setDiscardPile([card(5, Suit.CLUBS)]);
			setHand(bot, [card(7, Suit.CLUBS), card(7, Suit.HEARTS)]);
			bot.makeAction();
			expect(bot.cards.length).toBe(1);
		});
	});

	describe("Macau", () => {
		beforeEach(() => {
			cardService.setDiscardPile([card(9, Suit.CLUBS)]);
			spyOn(bot, "makeAction");
		});

		const playLeavingOneCard = () => {
			setHand(human, [card(8, Suit.CLUBS), card(5, Suit.DIAMS)]);
			human.chosenMove = 0;
			human.playCard();
		};

		it("is pending once the human is down to one card", () => {
			playLeavingOneCard();
			expect(gameService.macauPending()).toBeTrue();
		});

		it("is not pending with more cards left, or after winning", () => {
			setHand(human, [
				card(8, Suit.CLUBS),
				card(5, Suit.DIAMS),
				card(6, Suit.DIAMS),
			]);
			human.chosenMove = 0;
			human.playCard();
			expect(gameService.macauPending()).toBeFalse();
		});

		it("saying Macau in time avoids the penalty", () => {
			playLeavingOneCard();
			gameService.callMacau();
			jasmine.clock().tick(2600);
			expect(bot.makeAction).toHaveBeenCalled();
			expect(human.cards.length).toBe(1);
			expect(gameService.notice()).toBeNull();
		});

		it("gives the human extra time before the bot moves", () => {
			playLeavingOneCard();
			jasmine.clock().tick(1100);
			expect(bot.makeAction).not.toHaveBeenCalled();
			expect(gameService.macauPending()).toBeTrue();
		});

		it("forgetting Macau costs 2 cards", () => {
			playLeavingOneCard();
			jasmine.clock().tick(2600);
			expect(human.cards.length).toBe(3);
			expect(gameService.macauPending()).toBeFalse();
			expect(gameService.notice()).toContain("forgot to say Macau");
			expect(bot.makeAction).toHaveBeenCalled();
		});

		it("the penalty message goes away after the human's next turn", () => {
			playLeavingOneCard();
			jasmine.clock().tick(2600);
			gameService.turn.next(Turn.ME);
			gameService.humanPicks();
			expect(gameService.notice()).toBeNull();
		});

		it("restart clears it", () => {
			playLeavingOneCard();
			gameService.restart();
			expect(gameService.macauPending()).toBeFalse();
		});
	});

	describe("difficulty", () => {
		beforeEach(() => {
			gameService.turn.next(Turn.OPPONENT);
			cardService.setDiscardPile([card(5, Suit.CLUBS)]);
		});

		it("easy plays the first legal card and calls a random rank", () => {
			gameService.difficulty.set(Difficulty.EASY);
			setHand(bot, [
				card(RankCharacter.Jack, Suit.CLUBS),
				card(7, Suit.CLUBS),
			]);
			expect((bot as BotPlayer).getBestMove()).toBe(0);
			const rank = (bot as BotPlayer).chooseRankToCall([
				card(7, Suit.CLUBS),
			]);
			expect(rank).toBeGreaterThanOrEqual(5);
			expect(rank).toBeLessThanOrEqual(10);
		});

		it("normal saves the Jack for later", () => {
			setHand(bot, [
				card(RankCharacter.Jack, Suit.CLUBS),
				card(7, Suit.CLUBS),
			]);
			expect((bot as BotPlayer).getBestMove()).toBe(1);
		});

		it("hard attacks right away, normal waits", () => {
			setHand(bot, [card(7, Suit.CLUBS), card(2, Suit.CLUBS)]);
			expect((bot as BotPlayer).getBestMove()).toBe(0);
			gameService.difficulty.set(Difficulty.HARD);
			expect((bot as BotPlayer).getBestMove()).toBe(1);
		});

		it("easy keeps playing a legal card even when it is not the best", () => {
			gameService.difficulty.set(Difficulty.EASY);
			setHand(bot, [card(8, Suit.HEARTS), card(2, Suit.CLUBS)]);
			expect((bot as BotPlayer).getBestMove()).toBe(1);
		});
	});

	describe("game over", () => {
		beforeEach(() => {
			spyOn(bot, "makeAction");
		});

		it("nobody has won while both players hold cards", () => {
			setHand(human, [card(8, Suit.CLUBS), card(5, Suit.DIAMS)]);
			cardService.setDiscardPile([card(9, Suit.CLUBS)]);
			human.chosenMove = 0;
			human.playCard();
			expect(gameService.winner()).toBeNull();
		});

		it("the human wins by playing the last card", () => {
			setHand(human, [card(8, Suit.CLUBS)]);
			cardService.setDiscardPile([card(9, Suit.CLUBS)]);
			human.chosenMove = 0;
			human.playCard();
			expect(gameService.winner()).toBe(Turn.ME);
			expect(cardService.discardPileTop).toEqual(card(8, Suit.CLUBS));
		});

		it("the bot wins by playing the last card", () => {
			gameService.turn.next(Turn.OPPONENT);
			(bot.makeAction as jasmine.Spy).and.callThrough();
			setHand(bot, [card(8, Suit.CLUBS)]);
			cardService.setDiscardPile([card(9, Suit.CLUBS)]);
			bot.makeAction();
			expect(gameService.winner()).toBe(Turn.OPPONENT);
		});

		it("the bot does not move after the human has won", () => {
			setHand(human, [card(8, Suit.CLUBS)]);
			cardService.setDiscardPile([card(9, Suit.CLUBS)]);
			human.chosenMove = 0;
			human.playCard();
			jasmine.clock().tick(5000);
			expect(bot.makeAction).not.toHaveBeenCalled();
		});

		it("no move is legal once the game is over", () => {
			cardService.setDiscardPile([card(9, Suit.CLUBS)]);
			gameService.winner.set(Turn.OPPONENT);
			expect(gameService.isLegalMove(card(8, Suit.CLUBS))).toBeFalse();
		});

		it("restart deals a new game", () => {
			setHand(human, [card(8, Suit.CLUBS)]);
			cardService.setDiscardPile([card(9, Suit.CLUBS)]);
			human.chosenMove = 0;
			human.playCard();
			human.state = State.MISSING;
			gameService.cardsToPick = 3;
			gameService.cardCalled = 7;
			gameService.suitCalled = Suit.HEARTS;
			const handRef = human.cards;

			gameService.restart();

			expect(gameService.winner()).toBeNull();
			expect(gameService.turn.value).toBe(Turn.ME);
			expect(human.cards.length).toBe(5);
			expect(bot.cards.length).toBe(5);
			expect(human.cards).toBe(handRef); // views keep their reference
			expect(cardService.getDeck().length).toBe(41);
			expect(cardService.getDiscardPile().length).toBe(1);
			expect(human.state as State).toBe(State.WAITING_FOR_CARD);
			expect(bot.state).toBe(State.WAITING_FOR_CARD);
			expect(gameService.cardsToPick).toBe(0);
			expect(gameService.cardCalled).toBeNull();
			expect(gameService.suitCalled).toBeNull();
		});

		it("restart cancels the bot's pending move", () => {
			setHand(human, [card(8, Suit.CLUBS), card(5, Suit.DIAMS)]);
			cardService.setDiscardPile([card(9, Suit.CLUBS)]);
			human.chosenMove = 0;
			human.playCard(); // schedules the bot's reply
			gameService.restart();
			jasmine.clock().tick(5000);
			expect(bot.makeAction).not.toHaveBeenCalled();
		});
	});

	describe("human picking", () => {
		beforeEach(() => {
			setHand(human, [card(9, Suit.SPADES)]);
		});

		it("canHumanPick is true on the human's turn only", () => {
			expect(gameService.canHumanPick()).toBeTrue();
			gameService.turn.next(Turn.OPPONENT);
			expect(gameService.canHumanPick()).toBeFalse();
		});

		it("canHumanPick is false while missing a turn or after the game", () => {
			human.state = State.MISSING;
			expect(gameService.canHumanPick()).toBeFalse();
			human.state = State.WAITING_FOR_CARD;
			gameService.winner.set(Turn.OPPONENT);
			expect(gameService.canHumanPick()).toBeFalse();
		});

		it("humanPicks draws one card, or the whole penalty", () => {
			gameService.humanPicks();
			expect(human.cards.length).toBe(2);

			gameService.turn.next(Turn.ME);
			human.state = State.CARD_PICKING;
			gameService.cardsToPick = 4;
			gameService.humanPicks();
			expect(human.cards.length).toBe(6);
		});

		it("deckSize follows the deck", () => {
			expect(cardService.deckSize).toBe(41);
			gameService.humanPicks();
			expect(cardService.deckSize).toBe(40);
		});
	});

	describe("empty deck", () => {
		it("reshuffles the discard pile, keeping its top card", () => {
			const a = card(5, Suit.HEARTS);
			const b = card(6, Suit.HEARTS);
			const c = card(7, Suit.HEARTS);
			const top = card(8, Suit.HEARTS);
			cardService.setDeck([]);
			cardService.setDiscardPile([a, b, c, top]);

			const picked = cardService.pickCardFromTop();

			expect([a, b, c]).toContain(picked!);
			expect(cardService.getDeck().length).toBe(2);
			expect(cardService.getDiscardPile()).toEqual([top]);
		});

		it("returns undefined when no cards are left anywhere", () => {
			cardService.setDeck([]);
			cardService.setDiscardPile([card(8, Suit.HEARTS)]);
			expect(cardService.pickCardFromTop()).toBeUndefined();
		});

		it("does not add anything to a hand when drawing fails", () => {
			cardService.setDeck([]);
			cardService.setDiscardPile([card(8, Suit.HEARTS)]);
			setHand(human, [card(9, Suit.SPADES)]);
			human.drawCard();
			expect(human.cards).toEqual([card(9, Suit.SPADES)]);
		});
	});
});

describe("CardCalledModalComponent", () => {
	it("offers ranks 5-10 and emits the clicked one, including 5", () => {
		const fixture = TestBed.createComponent(CardCalledModalComponent);
		fixture.detectChanges();
		const emitted: number[] = [];
		fixture.componentInstance.onSelected.subscribe((r: number) =>
			emitted.push(r),
		);
		const buttons: HTMLButtonElement[] = Array.from(
			fixture.nativeElement.querySelectorAll("button"),
		);
		expect(buttons.map((b) => b.textContent!.trim())).toEqual([
			"5",
			"6",
			"7",
			"8",
			"9",
			"10",
		]);
		buttons[0].click();
		buttons[5].click();
		expect(emitted).toEqual([5, 10]);
	});
});

describe("SuitCalledModalComponent", () => {
	it("offers all four suits and emits the clicked one", () => {
		const fixture = TestBed.createComponent(SuitCalledModalComponent);
		fixture.detectChanges();
		const emitted: Suit[] = [];
		fixture.componentInstance.onSelected.subscribe((suit: Suit) =>
			emitted.push(suit),
		);
		const buttons: HTMLButtonElement[] = Array.from(
			fixture.nativeElement.querySelectorAll("button"),
		);
		expect(buttons.map((b) => b.textContent!.trim())).toEqual([
			Suit.HEARTS,
			Suit.DIAMS,
			Suit.SPADES,
			Suit.CLUBS,
		]);
		buttons[2].click();
		expect(emitted).toEqual([Suit.SPADES]);
	});
});

describe("GameOverComponent", () => {
	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [{ provide: CardService, useClass: MockCardService }],
		});
	});

	it("is hidden while the game is running", () => {
		const fixture = TestBed.createComponent(GameOverComponent);
		fixture.detectChanges();
		expect(fixture.nativeElement.querySelector(".game-over")).toBeNull();
	});

	it("announces the winner and restarts the game", () => {
		const gameService = TestBed.inject(GameService);
		const fixture = TestBed.createComponent(GameOverComponent);

		gameService.winner.set(Turn.ME);
		fixture.detectChanges();
		expect(fixture.nativeElement.textContent).toContain("You won!");

		gameService.winner.set(Turn.OPPONENT);
		fixture.detectChanges();
		expect(fixture.nativeElement.textContent).toContain("You lost");

		fixture.nativeElement.querySelector("button").click();
		fixture.detectChanges();
		expect(gameService.winner()).toBeNull();
		expect(fixture.nativeElement.querySelector(".game-over")).toBeNull();
	});
});

describe("StatusComponent", () => {
	let gameService: GameService;
	let fixture: ComponentFixture<StatusComponent>;

	const message = () => fixture.componentInstance.message;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [{ provide: CardService, useClass: MockCardService }],
		});
		gameService = TestBed.inject(GameService);
		fixture = TestBed.createComponent(StatusComponent);
		const me = gameService.players[Turn.ME];
		me.cards.length = 0;
		me.cards.push(card(9, Suit.SPADES));
		(gameService.cardService as MockCardService).setDiscardPile([
			card(5, Suit.HEARTS),
		]);
	});

	it("invites the human to play", () => {
		expect(message()).toBe("Your turn – play a card or pick one");
	});

	it("says when it is the opponent's turn or the game is over", () => {
		gameService.turn.next(Turn.OPPONENT);
		expect(message()).toBe("Opponent's turn…");
		gameService.winner.set(Turn.OPPONENT);
		expect(message()).toBe("Game over");
	});

	it("explains a penalty, and mentions passing it on only when possible", () => {
		const me = gameService.players[Turn.ME];
		const pile = gameService.cardService as MockCardService;
		pile.setDiscardPile([card(2, Suit.HEARTS)]);
		me.state = State.CARD_PICKING;
		gameService.cardsToPick = 2;
		expect(message()).toBe("You must pick 2 cards");

		me.cards.push(card(2, Suit.CLUBS));
		expect(message()).toBe(
			"Pick 2 cards – or pass the penalty on with another 2",
		);
	});

	it("explains a missed turn, and passing it on with a 4", () => {
		const me = gameService.players[Turn.ME];
		const pile = gameService.cardService as MockCardService;
		pile.setDiscardPile([card(4, Suit.HEARTS)]);
		me.state = State.MISSING;
		expect(message()).toBe("You miss a turn");

		me.cards.push(card(4, Suit.CLUBS));
		expect(message()).toBe("You miss a turn – or pass it on with a 4");
	});

	it("explains the opponent's rank and suit calls", () => {
		const me = gameService.players[Turn.ME];
		me.state = State.CARD_CALLED;
		gameService.cardCalled = 7;
		expect(message()).toBe("Opponent called 7 – play it or pick a card");

		me.state = State.SUIT_CALLED;
		gameService.suitCalled = Suit.HEARTS;
		expect(message()).toBe(
			"Opponent called ♥ – play that suit or pick a card",
		);
	});

	it("asks the human to continue a chain or end the turn", () => {
		gameService.chain.push(card(7, Suit.CLUBS));
		expect(message()).toBe("Play another 7 – or end your turn");
	});

	it("reminds the human to say Macau", () => {
		gameService.macauPending.set(true);
		expect(message()).toBe("You have one card left – press Macau!");
	});

	it("puts a notice in front of the usual message", () => {
		gameService.notice.set("You forgot to say Macau – you picked 2 cards.");
		expect(message()).toBe(
			"You forgot to say Macau – you picked 2 cards. Your turn – play a card or pick one",
		);
	});

	it("renders the message", () => {
		fixture.detectChanges();
		expect(fixture.nativeElement.textContent).toContain("Your turn");
	});
});

describe("DrawPileComponent", () => {
	let gameService: GameService;
	let fixture: ComponentFixture<DrawPileComponent>;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [{ provide: CardService, useClass: MockCardService }],
		});
		gameService = TestBed.inject(GameService);
		fixture = TestBed.createComponent(DrawPileComponent);
		fixture.detectChanges();
	});

	const button = (): HTMLButtonElement =>
		fixture.nativeElement.querySelector("button");

	it("shows the deck size", () => {
		expect(button().textContent).toContain("Deck: 41");
	});

	it("draws a card for the human when clicked", () => {
		spyOn(gameService.players[Turn.OPPONENT], "makeAction");
		button().click();
		expect(gameService.players[Turn.ME].cards.length).toBe(6);
	});

	it("is disabled on the bot's turn", () => {
		gameService.turn.next(Turn.OPPONENT);
		fixture.detectChanges();
		expect(button().disabled).toBeTrue();
	});
});

describe("RulesModalComponent", () => {
	it("is empty when hidden and lists the rules when visible", () => {
		const fixture = TestBed.createComponent(RulesModalComponent);
		fixture.detectChanges();
		expect(fixture.nativeElement.querySelector(".rules")).toBeNull();

		fixture.componentInstance.visible = true;
		fixture.changeDetectorRef.detectChanges();
		expect(fixture.nativeElement.textContent).toContain(
			"Next player picks 2 cards",
		);
	});

	it("emits closed from the button and the backdrop", () => {
		const fixture = TestBed.createComponent(RulesModalComponent);
		fixture.componentInstance.visible = true;
		fixture.changeDetectorRef.detectChanges();
		let closed = 0;
		fixture.componentInstance.closed.subscribe(() => closed++);

		fixture.nativeElement.querySelector("button").click();
		fixture.nativeElement.querySelector(".rules").click();
		fixture.nativeElement.querySelector(".rules__content").click(); // clicks inside the dialog don't close it

		expect(closed).toBe(2);
	});
});
