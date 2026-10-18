import { Component, OnInit } from "@angular/core";
import { Card } from "../../../model/Card";
import { GameService } from "../../../service/game.service";
import { Turn } from "../../../model/enum/Turn";
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

	get isActive(): boolean {
		return this.gameService.turn.value === Turn.OPPONENT;
	}
}
