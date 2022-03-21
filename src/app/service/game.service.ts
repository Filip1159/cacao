import {Injectable} from '@angular/core';
import {Turn} from "../model/enum/Turn";
import {Player} from "./player";
import {Card} from "../model/Card";
import {Rank, RankCharacter} from "../model/Rank";
import {State} from "../model/enum/State";
import {CardService} from "./card.service";

@Injectable({
	providedIn: 'root'
})
export class GameService {
	turn: Turn
	players: Player[]
	state: State
	cardCalled: Rank | null = null
	cardsToPick: number = 0

	constructor(public cardService: CardService) {
		this.turn = Turn.MY
		this.players = [new Player(), new Player()]
		this.state = State.WAITING_FOR_CARD
		cardService.dealCards(this.players)
	}

	playCard(player: Player, cardIndex: number): void {
		const card = player.cards[cardIndex]
		if (!this.isLegalMove(card)) {
			throw new Error(`Illegal move: ${JSON.stringify(card)} while
				${JSON.stringify(this.cardService.discardPileTop)} is on discard pile!`)
		}
		player.removeCard(cardIndex)
		this.cardService.putCardOnDiscardPile(card)
		this.switchState(card)
		this.switchTurn()
		if (this.turn == Turn.OPPONENT) {
			this.playCard(this.players[1], this.getBestMove(this.players[1]))
		}
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


	getBestMove(player: Player): number {
		for (let cardIndex in player.cards) {
			if (this.isLegalMove(player.cards[cardIndex])) return Number(cardIndex);
		}
		return -1;
	}
}
