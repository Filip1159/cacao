import { ComponentFixture, TestBed } from "@angular/core/testing";
import { GameService } from "../service/game.service";
import { Suit } from "../model/Suit";
import { RankCharacter } from "../model/Rank";
import { Turn } from "../model/enum/Turn";
import { CardComponent } from "../components/cards/card/card.component";
import { CardFaceDownComponent } from "../components/cards/card-face-down/card-face-down.component";
import { DiscardPileComponent } from "../components/discard-pile/discard-pile.component";
import { OpponentComponent } from "../components/players/opponent/opponent.component";
import { PlayerComponent } from "../components/players/player/player.component";
import { CardCalledModalComponent } from "../components/card-called-modal/card-called-modal.component";
import { SuitCalledModalComponent } from "../components/suit-called-modal/suit-called-modal.component";
import { GameOverComponent } from "../components/game-over/game-over.component";
import { StatusComponent } from "../components/status/status.component";
import { DrawPileComponent } from "../components/draw-pile/draw-pile.component";
import { RulesModalComponent } from "../components/rules-modal/rules-modal.component";
import { Obligation } from "../service/rules";
import { card, setHands, setTop, unshuffled } from "./support";

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

describe("table components", () => {
	let gameService: GameService;

	beforeEach(() => {
		jasmine.clock().install();
		TestBed.configureTestingModule({
			providers: unshuffled(),
		});
		gameService = TestBed.inject(GameService);
		setTop(gameService, card(5, Suit.CLUBS));
		setHands(gameService, {
			me: [
				card(8, Suit.CLUBS),
				card(9, Suit.HEARTS),
				card(RankCharacter.Jack, Suit.CLUBS),
			],
		});
	});

	afterEach(() => jasmine.clock().uninstall());

	const myHand = () => gameService.state().hands[Turn.ME];

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
		const button = (fixture: ReturnType<typeof render>, text: string) =>
			Array.from<HTMLButtonElement>(
				fixture.nativeElement.querySelectorAll("button"),
			).find((b) => b.textContent!.includes(text))!;

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
			gameService.patch({ turn: Turn.OPPONENT });
			fixture.detectChanges();
			expect(cards(fixture).every(isDisabled)).toBeTrue();
		});

		it("plays a playable card when it is clicked", () => {
			const fixture = render();
			cards(fixture)[0].click();
			fixture.detectChanges();
			expect(gameService.top()).toEqual(card(8, Suit.CLUBS));
			expect(cards(fixture).length).toBe(2);
		});

		it("ignores a click on an unplayable card", () => {
			const fixture = render();
			cards(fixture)[1].click();
			expect(gameService.top()).toEqual(card(5, Suit.CLUBS));
			expect(myHand().length).toBe(3);
		});

		it("ignores clicks on the bot's turn", () => {
			const fixture = render();
			gameService.patch({ turn: Turn.OPPONENT });
			cards(fixture)[0].click();
			expect(myHand().length).toBe(3);
		});

		it("asks for a rank before playing a Jack", () => {
			const fixture = render();
			cards(fixture)[2].click();
			fixture.detectChanges();
			expect(fixture.componentInstance.pending()?.call).toBe("rank");
			expect(gameService.top()).toEqual(card(5, Suit.CLUBS));

			fixture.componentInstance.onRankSelected(7);
			expect(gameService.top().rank.value).toBe(RankCharacter.Jack);
			expect(gameService.state().obligation).toEqual({
				kind: "rank",
				rank: 7,
			});
			expect(fixture.componentInstance.pending()).toBeNull();
		});

		it("asks for a suit before playing an Ace", () => {
			const fixture = render();
			setHands(gameService, {
				me: [...myHand(), card(RankCharacter.Ace, Suit.CLUBS)],
			});
			fixture.detectChanges();
			cards(fixture)[3].click();
			expect(fixture.componentInstance.pending()?.call).toBe("suit");

			fixture.componentInstance.onSuitSelected(Suit.HEARTS);
			expect(gameService.state().obligation).toEqual({
				kind: "suit",
				suit: Suit.HEARTS,
			});
			expect(gameService.state().obligation.kind).toBe("suit");
		});

		it("only offers 'Miss turn' while a turn has to be missed", () => {
			const fixture = render();
			expect(button(fixture, "Miss turn").disabled).toBeTrue();
			gameService.patch({
				obligation: { kind: "miss", turns: 1 },
			});
			fixture.detectChanges();
			expect(button(fixture, "Miss turn").disabled).toBeFalse();
		});

		it("disables 'Pick card' on the bot's turn", () => {
			const fixture = render();
			expect(button(fixture, "Pick card").disabled).toBeFalse();
			gameService.patch({ turn: Turn.OPPONENT });
			fixture.detectChanges();
			expect(button(fixture, "Pick card").disabled).toBeTrue();
		});

		it("offers 'End turn' while a chain is open and 'Macau!' when due", () => {
			const fixture = render();
			const text = () => fixture.nativeElement.textContent as string;
			expect(text()).not.toContain("End turn");
			gameService.patch({
				chain: [card(8, Suit.CLUBS)],
				macauPending: true,
			});
			fixture.detectChanges();
			expect(text()).toContain("End turn");
			const macau = button(fixture, "Macau");
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
			setHands(gameService, { opponent: [card(5, Suit.CLUBS)] });
			const fixture = TestBed.createComponent(OpponentComponent);
			fixture.detectChanges();
			expect(fixture.nativeElement.textContent).toContain(
				"Opponent · 1 card – Macau!",
			);
		});

		it("follows the bot's hand", () => {
			const fixture = TestBed.createComponent(OpponentComponent);
			fixture.detectChanges();
			setHands(gameService, { opponent: [card(5, Suit.CLUBS)] });
			fixture.detectChanges();
			expect(
				fixture.nativeElement.querySelectorAll("app-card-face-down")
					.length,
			).toBe(1);
		});

		it("highlights the bot's hand on its turn", () => {
			const fixture = TestBed.createComponent(OpponentComponent);
			fixture.detectChanges();
			const hand = () => fixture.nativeElement.querySelector(".hand");
			expect(hand().classList).not.toContain("hand--active");
			gameService.patch({ turn: Turn.OPPONENT });
			fixture.detectChanges();
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

			const effects = () =>
				element.querySelector(".effects")!.textContent!;
			const show = (obligation: Obligation) => {
				gameService.patch({ obligation });
				fixture.detectChanges();
			};
			show({ kind: "pick", count: 4 });
			expect(effects()).toContain("Cards to pick: 4");
			show({ kind: "miss", turns: 2 });
			expect(effects()).toContain("Turns to miss: 2");
			show({ kind: "rank", rank: 7 });
			expect(effects()).toContain("Called rank: 7");
			show({ kind: "suit", suit: Suit.HEARTS });
			expect(effects()).toContain("Called suit: ♥");
			show({ kind: "none" });
			expect(effects().trim()).toBe("");
		});

		it("follows the top card", () => {
			const fixture = TestBed.createComponent(DiscardPileComponent);
			fixture.detectChanges();
			gameService.patch({
				discard: [card(RankCharacter.King, Suit.HEARTS)],
			});
			fixture.detectChanges();
			expect(
				fixture.nativeElement.querySelector(".discard .number")!
					.textContent,
			).toBe("K");
		});
	});

	describe("StatusComponent", () => {
		let fixture: ComponentFixture<StatusComponent>;
		const message = () => fixture.componentInstance.message();

		beforeEach(() => {
			fixture = TestBed.createComponent(StatusComponent);
			setHands(gameService, { me: [card(9, Suit.SPADES)] });
			gameService.patch({ discard: [card(5, Suit.HEARTS)] });
		});

		it("invites the human to play", () => {
			expect(message()).toBe("Your turn – play a card or pick one");
		});

		it("says when it is the opponent's turn or the game is over", () => {
			gameService.patch({ turn: Turn.OPPONENT });
			expect(message()).toBe("Opponent's turn…");
			gameService.patch({ winner: Turn.OPPONENT });
			expect(message()).toBe("Game over");
		});

		it("explains a penalty, and mentions passing it on only when possible", () => {
			gameService.patch({
				discard: [card(2, Suit.HEARTS)],
				obligation: { kind: "pick", count: 2 },
			});
			expect(message()).toBe("You must pick 2 cards");

			setHands(gameService, {
				me: [card(9, Suit.SPADES), card(2, Suit.CLUBS)],
			});
			expect(message()).toBe(
				"Pick 2 cards – or pass the penalty on with another 2",
			);
		});

		it("explains a missed turn, and passing it on with a 4", () => {
			gameService.patch({
				discard: [card(4, Suit.HEARTS)],
				obligation: { kind: "miss", turns: 1 },
			});
			expect(message()).toBe("You miss a turn");

			setHands(gameService, {
				me: [card(9, Suit.SPADES), card(4, Suit.CLUBS)],
			});
			expect(message()).toBe("You miss a turn – or pass it on with a 4");
		});

		it("explains the opponent's rank and suit calls", () => {
			gameService.patch({
				obligation: { kind: "rank", rank: 7 },
			});
			expect(message()).toBe(
				"Opponent called 7 – play it or pick a card",
			);

			gameService.patch({
				obligation: { kind: "suit", suit: Suit.HEARTS },
			});
			expect(message()).toBe(
				"Opponent called ♥ – play that suit or pick a card",
			);
		});

		it("asks the human to continue a chain or end the turn", () => {
			gameService.patch({ chain: [card(7, Suit.CLUBS)] });
			expect(message()).toBe("Play another 7 – or end your turn");
		});

		it("reminds the human to say Macau", () => {
			gameService.patch({ macauPending: true });
			expect(message()).toBe("You have one card left – press Macau!");
		});

		it("puts a notice in front of the usual message", () => {
			gameService.notice.set(
				"You forgot to say Macau – you picked 2 cards.",
			);
			expect(message()).toBe(
				"You forgot to say Macau – you picked 2 cards. Your turn – play a card or pick one",
			);
		});

		it("renders the message and follows the game", () => {
			fixture.detectChanges();
			expect(fixture.nativeElement.textContent).toContain("Your turn");
			gameService.patch({ turn: Turn.OPPONENT });
			fixture.detectChanges();
			expect(fixture.nativeElement.textContent).toContain(
				"Opponent's turn",
			);
			expect(
				fixture.nativeElement.querySelector(".status").dataset["turn"],
			).toBe(String(Turn.OPPONENT));
		});
	});

	describe("DrawPileComponent", () => {
		let fixture: ComponentFixture<DrawPileComponent>;

		beforeEach(() => {
			fixture = TestBed.createComponent(DrawPileComponent);
			fixture.detectChanges();
		});

		const button = (): HTMLButtonElement =>
			fixture.nativeElement.querySelector("button");

		it("shows the deck size", () => {
			expect(button().textContent).toContain("Deck: 41");
		});

		it("draws a card for the human when clicked", () => {
			button().click();
			fixture.detectChanges();
			expect(myHand().length).toBe(4);
			expect(button().textContent).toContain("Deck: 40");
		});

		it("is disabled on the bot's turn", () => {
			gameService.patch({ turn: Turn.OPPONENT });
			fixture.detectChanges();
			expect(button().disabled).toBeTrue();
		});
	});

	describe("GameOverComponent", () => {
		it("is hidden while the game is running", () => {
			const fixture = TestBed.createComponent(GameOverComponent);
			fixture.detectChanges();
			expect(
				fixture.nativeElement.querySelector(".game-over"),
			).toBeNull();
		});

		it("announces the winner and restarts the game", () => {
			const fixture = TestBed.createComponent(GameOverComponent);

			gameService.patch({ winner: Turn.ME });
			fixture.detectChanges();
			expect(fixture.nativeElement.textContent).toContain("You won!");

			gameService.patch({ winner: Turn.OPPONENT });
			fixture.detectChanges();
			expect(fixture.nativeElement.textContent).toContain("You lost");

			fixture.nativeElement.querySelector("button").click();
			fixture.detectChanges();
			expect(gameService.winner()).toBeNull();
			expect(
				fixture.nativeElement.querySelector(".game-over"),
			).toBeNull();
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
