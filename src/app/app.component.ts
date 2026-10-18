import { Component } from "@angular/core";
import { PlayerComponent } from "./components/players/player/player.component";
import { OpponentComponent } from "./components/players/opponent/opponent.component";
import { DiscardPileComponent } from "./components/discard-pile/discard-pile.component";

@Component({
	selector: "app-root",
	templateUrl: "./app.component.html",
	styleUrls: ["./app.component.scss"],
	standalone: true,
	imports: [PlayerComponent, OpponentComponent, DiscardPileComponent],
})
export class AppComponent {
	constructor() {}
}
