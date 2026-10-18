import { TestBed } from "@angular/core/testing";
import { Injectable } from "@angular/core";
import { GameService } from "../service/game.service";
import { CardService } from "../service/card.service";
import { BotPlayer } from "../service/player/BotPlayer";
import { Card } from "../model/Card";
import { Suit } from "../model/Suit";
import { Rank, RankCharacter } from "../model/Rank";
import { State } from "../model/enum/State";
import { Turn } from "../model/enum/Turn";
import { PlayerComponent } from "../components/players/player/player.component";
import { SuitCalledModalComponent } from "../components/suit-called-modal/suit-called-modal.component";
import { CardCalledModalComponent } from "../components/card-called-modal/card-called-modal.component";

const card = (rank: number, suit: Suit): Card => ({
	rank: new Rank(rank),
	suit,
});

@Injectable()
class MockCardService extends CardService {
	// deterministic (unshuffled) deck
	protected override init(): void {
		this.deck = CardService.createFullDeck();
		this.discardPile = [this.pickBasicCardFromTop()];
	}

	getDeck(): Card[] {
		return this.deck;
	}

	setDeck(cards: Card[]): void {
		this.deck = cards;
	}

	getDiscardPile(): Card[] {
		return this.discardPile;
	}

	setDiscardPile(cards: Card[]): void {
		this.discardPile = cards;
	}
}

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
			setHand(human, [card(RankCharacter.Ace, Suit.CLUBS)]);
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
