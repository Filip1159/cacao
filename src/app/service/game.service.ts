import {Injectable} from '@angular/core';
import {Turn} from "../model/enum/Turn";
import {Player} from "./player/Player";
import {Card} from "../model/Card";
import {RankCharacter} from "../model/Rank";
import {State} from "../model/enum/State";
import {CardService} from "./card.service";
import {BotPlayer} from "./player/BotPlayer";
import {HumanPlayer} from "./player/HumanPlayer";

@Injectable({
	providedIn: 'root'
})
export class GameService {
	turn: Turn
	players: Player[]
	cardCalled: number | null = null
	cardsToPick: number = 0

	constructor(public cardService: CardService) {
		this.turn = Turn.MY
		this.players = [new HumanPlayer(this, this.cardService), new BotPlayer(this, this.cardService)]
		cardService.dealCards(this.players)
	}

	afterCardPlayed(card: Card | null, cardCalled?: number): void {
		if (card !== null)
			console.log(`${this.turn} played ${JSON.stringify(card)}`)
		else
			console.log(`${this.turn} picked card`)
		if (card !== null) this.cardService.putCardOnDiscardPile(card)
		this.switchTurn()
		this.resetState()
		if (card !== null) this.switchState(card, cardCalled)
		if (this.turn == Turn.OPPONENT) {
			setTimeout(() =>
				this.players[Turn.OPPONENT].makeAction(),
				1000
			)
		}
	}

	isLegalMove(card: Card): boolean {
		if (this.players[this.turn].state === State.CARD_PICKING) return false;
		if (this.players[this.turn].state === State.CARD_CALLED && this.cardCalled !== card.rank.value) return false;
		if (this.players[this.turn].state === State.MISSING) return false;
		return card.rank === this.cardService.discardPileTop.rank || card.suit === this.cardService.discardPileTop.suit;
	}

	switchState(card: Card, cardCalled?: number): void {
		switch (card.rank.value) {
			case 2:
				this.players[this.turn].state = State.CARD_PICKING
				this.cardsToPick = 2
				break;
			case 3:
				this.players[this.turn].state = State.CARD_PICKING
				this.cardsToPick = 3
				break;
			case 4:
				this.players[this.turn].state = State.MISSING
				break;
			case RankCharacter.Jack:
				this.players[this.turn].state = State.CARD_CALLED
				this.cardCalled = cardCalled!
				break;
			case RankCharacter.King:
				this.players[this.turn].state = State.CARD_PICKING
				this.cardsToPick = 5
				break;
		}
	}

	switchTurn(): void {
		this.turn = this.turn === 0 ? 1 : 0;
	}

	private resetState(): void {
		this.players[this.turn].state = State.WAITING_FOR_CARD
		this.cardsToPick = 0
		this.cardCalled = null
	}
}
