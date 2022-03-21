import {Component, OnInit} from '@angular/core';
import {Card} from "../../../model/Card";
import {GameService} from "../../../service/game.service";

@Component({
	selector: 'app-opponent',
	templateUrl: './opponent.component.html',
	styleUrls: ['./opponent.component.scss']
})
export class OpponentComponent implements OnInit {
	cards: Card[]

	constructor(private gameService: GameService) {
		this.cards = gameService.players[1].cards
	}

	ngOnInit(): void {
	}
}
