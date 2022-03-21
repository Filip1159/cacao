import {Component, OnInit} from '@angular/core';
import {Card} from "../../../model/Card";
import {GameService} from "../../../service/game.service";

@Component({
	selector: 'app-player',
	templateUrl: './player.component.html',
	styleUrls: ['./player.component.scss']
})
export class PlayerComponent implements OnInit {
	cards: Card[]

	constructor(private gameService: GameService) {
		this.cards = gameService.players[0].cards
	}

	ngOnInit(): void {
	}

	onCardPlayed(cardIndex: number): void {
		this.gameService.playCard(this.gameService.players[0], cardIndex)
		console.log(`player's card played: ${cardIndex}`)
	}
}
