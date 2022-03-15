import {Injectable} from '@angular/core';
import {Turn} from "../model/enum/Turn";
import {PlayerService} from "./player.service";
import {Card} from "../model/Card";
import {Rank, RankCharacter} from "../model/Rank";
import {State} from "../model/enum/State";
import {CardService} from "./card.service";

@Injectable({
	providedIn: 'root'
})
export class GameService {
	turn: Turn
	players: PlayerService[]
	state: State
	cardCalled: Rank | null = null
	cardsToPick: number = 0

	constructor(public cardService: CardService) {
		this.turn = Turn.MY
		this.players = [new PlayerService(this, cardService), new PlayerService(this, cardService)]
		this.state = State.WAITING_FOR_CARD
		cardService.dealCards(this.players)
	}

	playCard(card: Card): void {
		if (!this.isLegalMove(card)) throw new Error(`Illegal move: ${card} while ${this.cardService.discardPileTop} is on discard pile!`)
		this.cardService.putCardOnDiscardPile(card)
		this.switchTurn()
		this.switchState(card)
	}

	isLegalMove(card: Card): boolean {
		if (this.state === State.CARD_PICKING) return false;
		if (this.state === State.CARD_CALLED && this.cardCalled !== card.rank) return false;
		if (this.state === State.MISSING) return false;
		return card.rank === this.cardService.discardPileTop.rank || card.suit === this.cardService.discardPileTop.suit;
	}

	switchState(card: Card): void {
		this.resetState()
		switch (card.rank.value) {
			case 2:
				this.state = State.CARD_PICKING
				this.cardsToPick = 2
				break;
			case 3:
				this.state = State.CARD_PICKING
				this.cardsToPick = 3
				break;
			case 4:
				this.state = State.MISSING
				break;
			case RankCharacter.Jack:
				this.state = State.CARD_CALLED
				this.cardCalled = new Rank(6)
				break;
			case RankCharacter.King:
				this.state = State.CARD_PICKING
				this.cardsToPick = 5
				break;
		}
	}

	switchTurn(): void {
		this.turn = this.turn === 0 ? 1 : 0;
	}

	private resetState(): void {
		this.state = State.WAITING_FOR_CARD
		this.cardsToPick = 0
		this.cardCalled = null
	}
}
