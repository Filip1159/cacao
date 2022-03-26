import {Card} from "../../model/Card";
import {State} from "../../model/enum/State";
import {GameService} from "../game.service";
import {CardService} from "../card.service";

export abstract class Player {
	cards: Card[]
	state: State
	chosenMove: number
	chosenRank?: number

	protected constructor(protected gameService: GameService, protected cardService: CardService) {
		this.cards = []
		this.state = State.WAITING_FOR_CARD
		this.chosenMove = -1
	}

	addCard(card: Card): void {
		this.cards.push(card)
	}

	removeCard(cardIndex: number): Card {
		return this.cards.splice(cardIndex, 1)[0]
	}

	makeAction() {
		if (this.state === State.WAITING_FOR_CARD) {
			this.playCard()
		} else if (this.state === State.MISSING) {
			this.gameService.afterCardPlayed(null)
		} else if (this.state === State.CARD_PICKING) {
			for (let i = 0; i < this.gameService.cardsToPick; i++)
				this.addCard(this.cardService.pickCardFromTop())
			this.gameService.cardsToPick = 0
			this.gameService.afterCardPlayed(null)
		} else if (this.state === State.CARD_CALLED) {
			const calledCardIndex = this.cards.map(card => card.rank.value).indexOf(this.gameService.cardCalled!)
			if (calledCardIndex !== -1) {
				const playedCard = this.removeCard(this.chosenMove)
				this.gameService.afterCardPlayed(playedCard)
			} else {
				this.addCard(this.cardService.pickCardFromTop())
				this.gameService.afterCardPlayed(null)
			}
		}
	}

	abstract playCard(cardIndex?: number): void
}

