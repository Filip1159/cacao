import { Component, OnInit } from "@angular/core";
import { Card } from "../../../model/Card";
import { GameService } from "../../../service/game.service";
import { stateToString } from "../../../model/enum/State";
import { Player } from "../../../service/player/Player";
import { CardFaceDownComponent } from "../../cards/card-face-down/card-face-down.component";

@Component({
	selector: "app-opponent",
	templateUrl: "./opponent.component.html",
	styleUrls: ["./opponent.component.scss"],
	standalone: true,
	imports: [CardFaceDownComponent],
})
export class OpponentComponent implements OnInit {
	cards: Card[];
	player: Player;

	constructor(private gameService: GameService) {
		this.cards = gameService.players[1].cards;
		this.player = gameService.players[1];
	}

	ngOnInit(): void {}

	get state(): string {
		return stateToString(this.player.state);
	}
}
