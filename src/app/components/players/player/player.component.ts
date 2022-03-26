import {Component, OnInit} from '@angular/core';
import {Card} from "../../../model/Card";
import {GameService} from "../../../service/game.service";
import {HumanPlayer} from "../../../service/player/HumanPlayer";
import {State, stateToString} from "../../../model/enum/State";
import {Turn} from "../../../model/enum/Turn";
import {Subject} from "rxjs";
import {RankCharacter} from "../../../model/Rank";

@Component({
	selector: 'app-player',
	templateUrl: './player.component.html',
	styleUrls: ['./player.component.scss']
})
export class PlayerComponent implements OnInit {
	cards: Card[]
	player: HumanPlayer
	showCardCalledModal: boolean = false

	constructor(private gameService: GameService) {
		this.cards = gameService.players[0].cards
		this.player = gameService.players[0] as HumanPlayer
	}

	ngOnInit(): void {
	}

	onCardClick(cardIndex: number): void {
		if (this.gameService.isLegalMove(this.cards[cardIndex])) {
			this.player.chosenMove = cardIndex
			if (this.cards[cardIndex].rank.value === RankCharacter.Jack)
				this.showCardCalledModal = true
			else
				this.player.makeAction()
		}
	}

	onRankSelected(rank: number) {
		this.player.chosenRank = rank
		this.showCardCalledModal = false
		this.player.makeAction()
	}

	isLegalMove(card: Card): boolean {
		return this.gameService.isLegalMove(card)
	}

	pickCardFromStack(): void {
		this.player.addCard(this.gameService.cardService.pickCardFromTop())
		this.gameService.afterCardPlayed(null)
	}

	get state(): string {
		return stateToString(this.player.state)
	}

	missTurn(): void {
		this.gameService.afterCardPlayed(null)
	}

	doesMissTurn(): boolean {
		return this.player.state === State.MISSING
	}

	isMyTurn(): boolean {
		return this.gameService.turn === Turn.MY
	}
}
