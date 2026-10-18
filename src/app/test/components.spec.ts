import { ComponentFixture, TestBed } from "@angular/core/testing";
import { CardService } from "../service/card.service";
import { GameService } from "../service/game.service";
import { Suit } from "../model/Suit";
import { RankCharacter } from "../model/Rank";
import { State } from "../model/enum/State";
import { Turn } from "../model/enum/Turn";
import { CardComponent } from "../components/cards/card/card.component";
import { CardFaceDownComponent } from "../components/cards/card-face-down/card-face-down.component";
import { DiscardPileComponent } from "../components/discard-pile/discard-pile.component";
import { OpponentComponent } from "../components/players/opponent/opponent.component";
import { PlayerComponent } from "../components/players/player/player.component";
import { CardCalledModalComponent } from "../components/card-called-modal/card-called-modal.component";
import { SuitCalledModalComponent } from "../components/suit-called-modal/suit-called-modal.component";
import { MockCardService, card } from "./support";

describe("CardComponent", () => {
	const render = (rank: number, suit: Suit, disabled = false) => {
		const fixture = TestBed.createComponent(CardComponent);
		fixture.componentInstance.card = card(rank, suit);
		fixture.componentInstance.disabled = disabled;
		fixture.detectChanges();
		return fixture.nativeElement as HTMLElement;
	};

	it("shows rank and suit", () => {
		const element = render(RankCharacter.Queen, Suit.SPADES);
		expect(element.querySelector(".number")!.textContent).toBe("Q");
		expect(element.querySelector(".suit")!.textContent).toBe("♠");
	});

	it("colours hearts and diamonds red, spades and clubs black", () => {
		expect(
			render(5, Suit.HEARTS).querySelector(".number--red"),
		).not.toBeNull();
		expect(
			render(5, Suit.DIAMS).querySelector(".suit--red"),
		).not.toBeNull();
		expect(
			render(5, Suit.SPADES).querySelector(".number--black"),
		).not.toBeNull();
		expect(
			render(5, Suit.CLUBS).querySelector(".suit--black"),
		).not.toBeNull();
	});

	it("greys out disabled cards", () => {
		expect(
			render(5, Suit.CLUBS, true).querySelector(".card--disabled"),
		).not.toBeNull();
		expect(
			render(5, Suit.CLUBS, false).querySelector(".card--disabled"),
		).toBeNull();
	});
});

describe("card animation", () => {
	it("plays when the card shown changes, not on the first render", () => {
		const animate = spyOn(Element.prototype, "animate");
		const fixture = TestBed.createComponent(CardComponent);
		fixture.componentRef.setInput("card", card(5, Suit.CLUBS));
		fixture.detectChanges();
		expect(animate).not.toHaveBeenCalled();

		fixture.componentRef.setInput("card", card(6, Suit.CLUBS));
		fixture.detectChanges();
		expect(animate).toHaveBeenCalledTimes(1);
	});
});

describe("CardFaceDownComponent", () => {
	it("hides the card", () => {
		const fixture = TestBed.createComponent(CardFaceDownComponent);
		fixture.detectChanges();
		const element: HTMLElement = fixture.nativeElement;
		expect(element.querySelector(".card--face_down")).not.toBeNull();
		expect(element.querySelector(".number")).toBeNull();
	});
});

/** Re-renders after the game state was changed from outside the component. */
const refresh = (fixture: ComponentFixture<unknown>) => {
	fixture.changeDetectorRef.markForCheck();
	fixture.detectChanges();
};

describe("table components", () => {
	let gameService: GameService;
	let cardService: MockCardService;

	beforeEach(() => {
		jasmine.clock().install();
		TestBed.configureTestingModule({
			providers: [{ provide: CardService, useClass: MockCardService }],
		});
		gameService = TestBed.inject(GameService);
		cardService = gameService.cardService as MockCardService;
		const human = gameService.players[Turn.ME];
		human.cards.length = 0;
		human.cards.push(
			card(8, Suit.CLUBS),
			card(9, Suit.HEARTS),
			card(RankCharacter.Jack, Suit.CLUBS),
		);
		cardService.setDiscardPile([card(5, Suit.CLUBS)]);
	});

	afterEach(() => jasmine.clock().uninstall());

	describe("PlayerComponent", () => {
		const render = () => {
			const fixture = TestBed.createComponent(PlayerComponent);
			fixture.detectChanges();
			return fixture;
		};
		const cards = (fixture: ReturnType<typeof render>) =>
			Array.from<HTMLElement>(
				fixture.nativeElement.querySelectorAll("app-card"),
			);
		const isDisabled = (element: HTMLElement) =>
			element.querySelector(".card--disabled") !== null;

		it("renders the hand and disables the unplayable cards", () => {
			const fixture = render();
			const hand = cards(fixture);
			expect(hand.length).toBe(3);
			// the top card is 5♣: the clubs can be played, the 9♥ cannot
			expect(hand.map(isDisabled)).toEqual([false, true, false]);
			expect(fixture.nativeElement.textContent).toContain(
				"You · 3 cards",
			);
		});

		it("disables every card on the bot's turn", () => {
			const fixture = render();
			gameService.turn.next(Turn.OPPONENT);
			refresh(fixture);
			expect(cards(fixture).every(isDisabled)).toBeTrue();
		});

		it("plays a playable card when it is clicked", () => {
			const fixture = render();
			spyOn(gameService.players[Turn.OPPONENT], "makeAction");
			cards(fixture)[0].click();
			refresh(fixture);
			expect(cardService.discardPileTop).toEqual(card(8, Suit.CLUBS));
			expect(cards(fixture).length).toBe(2);
		});

		it("ignores a click on an unplayable card", () => {
			const fixture = render();
			cards(fixture)[1].click();
			expect(cardService.discardPileTop).toEqual(card(5, Suit.CLUBS));
			expect(gameService.players[Turn.ME].cards.length).toBe(3);
		});

		it("asks for a rank before playing a Jack", () => {
			const fixture = render();
			spyOn(gameService.players[Turn.OPPONENT], "makeAction");
			cards(fixture)[2].click();
			refresh(fixture);
			expect(fixture.componentInstance.showCardCalledModal).toBeTrue();
			expect(cardService.discardPileTop).toEqual(card(5, Suit.CLUBS));

			fixture.componentInstance.onRankSelected(7);
			expect(cardService.discardPileTop.rank.value).toBe(
				RankCharacter.Jack,
			);
			expect(gameService.cardCalled).toBe(7);
			expect(fixture.componentInstance.showCardCalledModal).toBeFalse();
		});

		it("asks for a suit before playing an Ace", () => {
			const fixture = render();
			spyOn(gameService.players[Turn.OPPONENT], "makeAction");
			const human = gameService.players[Turn.ME];
			human.cards.push(card(RankCharacter.Ace, Suit.CLUBS));
			refresh(fixture);
			cards(fixture)[3].click();
			expect(fixture.componentInstance.showSuitCalledModal).toBeTrue();

			fixture.componentInstance.onSuitSelected(Suit.HEARTS);
			expect(gameService.suitCalled).toBe(Suit.HEARTS);
			expect(gameService.players[Turn.OPPONENT].state).toBe(
				State.SUIT_CALLED,
			);
		});

		it("only offers 'Miss turn' while a turn has to be missed", () => {
			const fixture = render();
			const button = (): HTMLButtonElement =>
				Array.from<HTMLButtonElement>(
					fixture.nativeElement.querySelectorAll("button"),
				).find((b) => b.textContent!.includes("Miss turn"))!;
			expect(button().disabled).toBeTrue();
			gameService.players[Turn.ME].state = State.MISSING;
			refresh(fixture);
			expect(button().disabled).toBeFalse();
		});

		it("offers 'End turn' while a chain is open and 'Macau!' when due", () => {
			const fixture = render();
			const text = () => fixture.nativeElement.textContent as string;
			expect(text()).not.toContain("End turn");
			gameService.chain.push(card(8, Suit.CLUBS));
			gameService.macauPending.set(true);
			refresh(fixture);
			expect(text()).toContain("End turn");
			const macau: HTMLButtonElement = Array.from<HTMLButtonElement>(
				fixture.nativeElement.querySelectorAll("button"),
			).find((b) => b.textContent!.includes("Macau"))!;
			expect(macau.disabled).toBeFalse();
			macau.click();
			expect(gameService.macauPending()).toBeFalse();
		});
	});

	describe("OpponentComponent", () => {
		it("shows the bot's cards face down with their count", () => {
			const fixture = TestBed.createComponent(OpponentComponent);
			fixture.detectChanges();
			const element: HTMLElement = fixture.nativeElement;
			expect(element.querySelectorAll("app-card-face-down").length).toBe(
				5,
			);
			expect(element.textContent).toContain("Opponent · 5 cards");
			expect(element.querySelector(".number")).toBeNull();
		});

		it("announces Macau at one card", () => {
			const bot = gameService.players[Turn.OPPONENT];
			bot.cards.length = 0;
			bot.cards.push(card(5, Suit.CLUBS));
			const fixture = TestBed.createComponent(OpponentComponent);
			fixture.detectChanges();
			expect(fixture.nativeElement.textContent).toContain(
				"Opponent · 1 card – Macau!",
			);
		});

		it("highlights the bot's hand on its turn", () => {
			const fixture = TestBed.createComponent(OpponentComponent);
			fixture.detectChanges();
			const hand = () => fixture.nativeElement.querySelector(".hand");
			expect(hand().classList).not.toContain("hand--active");
			gameService.turn.next(Turn.OPPONENT);
			refresh(fixture);
			expect(hand().classList).toContain("hand--active");
		});
	});

	describe("DiscardPileComponent", () => {
		it("shows the top card and the active effects", () => {
			const fixture = TestBed.createComponent(DiscardPileComponent);
			fixture.detectChanges();
			const element: HTMLElement = fixture.nativeElement;
			expect(element.querySelector(".discard .number")!.textContent).toBe(
				"5",
			);
			expect(element.querySelector(".effects")!.textContent!.trim()).toBe(
				"",
			);

			gameService.cardsToPick = 4;
			gameService.turnsToMiss = 2;
			gameService.cardCalled = 7;
			gameService.suitCalled = Suit.HEARTS;
			refresh(fixture);
			const effects = element.querySelector(".effects")!.textContent!;
			expect(effects).toContain("Cards to pick: 4");
			expect(effects).toContain("Turns to miss: 2");
			expect(effects).toContain("Called rank: 7");
			expect(effects).toContain("Called suit: ♥");
		});

		it("follows the discard pile", () => {
			const fixture = TestBed.createComponent(DiscardPileComponent);
			fixture.detectChanges();
			cardService.putCardOnDiscardPile(
				card(RankCharacter.King, Suit.HEARTS),
			);
			refresh(fixture);
			expect(
				fixture.nativeElement.querySelector(".discard .number")!
					.textContent,
			).toBe("K");
		});
	});
});

describe("modals", () => {
	it("the rank modal is only shown when visible", () => {
		const fixture = TestBed.createComponent(CardCalledModalComponent);
		fixture.detectChanges();
		const modal = () =>
			fixture.nativeElement.querySelector(".card-called-modal");
		expect(modal().classList).not.toContain("card-called-modal--visible");
		fixture.componentInstance.visible = true;
		fixture.changeDetectorRef.detectChanges();
		expect(modal().classList).toContain("card-called-modal--visible");
	});

	it("the suit modal is only shown when visible", () => {
		const fixture = TestBed.createComponent(SuitCalledModalComponent);
		fixture.detectChanges();
		const modal = () =>
			fixture.nativeElement.querySelector(".suit-called-modal");
		expect(modal().classList).not.toContain("suit-called-modal--visible");
		fixture.componentInstance.visible = true;
		fixture.changeDetectorRef.detectChanges();
		expect(modal().classList).toContain("suit-called-modal--visible");
	});
});
