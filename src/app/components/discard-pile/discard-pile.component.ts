import { Component, OnInit } from "@angular/core";
import { GameService } from "../../service/game.service";
import { CardComponent } from "../cards/card/card.component";

@Component({
	selector: "app-discard-pile",
	templateUrl: "./discard-pile.component.html",
	styleUrls: ["./discard-pile.component.scss"],
	standalone: true,
	imports: [CardComponent],
})
export class DiscardPileComponent implements OnInit {
	constructor(public gameService: GameService) {}

	ngOnInit(): void {}
}
