import {Card} from "../model/Card";
import {GameService} from "./game.service";
import {CardService} from "./card.service";

export class PlayerService {
	cards: Card[]

	constructor(private gameService: GameService, private cardService: CardService) {
		this.cards = []
	}

	addCard(card: Card): void {
		this.cards.push(card)
	}

	playCard(index: number): void {
		if (this.gameService.isLegalMove(this.cards[index]))
			this.gameService.playCard(this.cards.splice(index, 1)[0])
	}

	pickCard(): void {
		this.cards.push(this.cardService.pickCardFromTop())
	}

	toString(): string {
		let result = ""
		for (let card of this.cards) {
			result += this.cardService.cardToString(card)
		}
		return result
	}
}
