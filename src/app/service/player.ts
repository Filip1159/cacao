import {Card} from "../model/Card";

export class Player {
	cards: Card[]

	constructor() {
		this.cards = []
	}

	addCard(card: Card): void {
		this.cards.push(card)
	}

	removeCard(cardIndex: number) {
		this.cards.splice(cardIndex, 1)
	}

	toString(): string {
		let result = ""
		for (let card of this.cards) {
			result += card.toString()
		}
		return result
	}
}
