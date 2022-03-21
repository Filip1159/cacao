import {Component, OnInit} from '@angular/core';
import {GameService} from "../../service/game.service";
import {Card} from "../../model/Card";

@Component({
	selector: 'app-discard-pile',
	templateUrl: './discard-pile.component.html',
	styleUrls: ['./discard-pile.component.scss']
})
export class DiscardPileComponent implements OnInit {

	constructor(public gameService: GameService) {

	}

	ngOnInit(): void {
	}

}
