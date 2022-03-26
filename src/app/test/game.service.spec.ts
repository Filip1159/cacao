import {GameService} from "../service/game.service";
import {CardService} from "../service/card.service";
import {PlayerService} from "../service/player/Player";
import {TestBed} from "@angular/core/testing";
import {Card} from "../model/Card";
import {Suit} from "../model/Suit";
import {Rank, RankCharacter} from "../model/Rank";
import {Injectable} from "@angular/core";
import {State} from "../model/enum/State";
import {Turn} from "../model/enum/Turn";

@Injectable()
class MockCardService extends CardService {
	constructor() {
		super()
		this.init()
	}

	getDeck(): Card[] {
		return this.deck
	}

	override init(): void {
		super.deck = CardService.createFullDeck()
		super.discardPile = [super.pickBasicCardFromTop()]
	}

	override dealCards(players: PlayerService[]): void {
		for (let i = 0; i < 5; i++) {
			for (let player of players) {
				const card = this.deck.pop()!
				player.addCard(card)
			}
		}
	}
}

describe("Game Service", () => {
	let gameService: GameService
	let playerServices: PlayerService[]
	let mockCardService: MockCardService

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				{provide: CardService, useClass: MockCardService}
			]
		})
		gameService = TestBed.inject(GameService)
		playerServices = gameService.players
		mockCardService = gameService.cardService as MockCardService
	})

	it("players has cards", () => {
		expect(playerServices[0].cards).toEqual([
			{rank: new Rank(RankCharacter.Queen), suit: Suit.CLUBS},
			{rank: new Rank(10), suit: Suit.CLUBS},
			{rank: new Rank(8), suit: Suit.CLUBS},
			{rank: new Rank(6), suit: Suit.CLUBS},
			{rank: new Rank(4), suit: Suit.CLUBS},
		])
		expect(playerServices[1].cards).toEqual([
			{rank: new Rank(RankCharacter.Jack), suit: Suit.CLUBS},
			{rank: new Rank(9), suit: Suit.CLUBS},
			{rank: new Rank(7), suit: Suit.CLUBS},
			{rank: new Rank(5), suit: Suit.CLUBS},
			{rank: new Rank(3), suit: Suit.CLUBS},
		])
	})

	it("discard pile top is KING CLUBS", () => {
		expect(mockCardService.discardPileTop).toEqual({rank: new Rank(RankCharacter.King), suit: Suit.CLUBS})
	})

	it("deck has 41 cards after dealing", () => {
		expect(mockCardService.getDeck().length).toBe(41)
	})

	it("makes some correct moves", () => {
		expect(gameService.isLegalMove(playerServices[0].cards[0])).toBeTrue()
		playerServices[0].playCard(0)
		expect(playerServices[0].cards.length).toBe(4)
		expect(gameService.cardCalled).toBeNull()
		expect(gameService.state).toBe(State.WAITING_FOR_CARD)
		expect(mockCardService.discardPileTop).toEqual({rank: new Rank(RankCharacter.Queen), suit: Suit.CLUBS})
		expect(gameService.turn).toBe(Turn.OPPONENT)
	})
})
