import { Component } from "@angular/core";
import { AsyncPipe } from "@angular/common";
import { GameService } from "../../service/game.service";
import { State } from "../../model/enum/State";
import { Turn } from "../../model/enum/Turn";

@Component({
	selector: "app-status",
	templateUrl: "./status.component.html",
	styleUrls: ["./status.component.scss"],
	standalone: true,
	imports: [AsyncPipe],
})
export class StatusComponent {
	// emits on every turn change so the view is re-checked
	turn$ = this.gameService.turn;

	constructor(public gameService: GameService) {}

	get message(): string {
		const game = this.gameService;
		if (game.winner() !== null) return "Game over";
		if (game.turn.value === Turn.OPPONENT) return "Opponent's turn…";
		const me = game.players[Turn.ME];
		const canCounter = me.hasCounter();
		switch (me.state) {
			case State.CARD_PICKING: {
				const n = game.cardsToPick;
				return canCounter
					? `Pick ${n} cards – or pass the penalty on with another ${game.cardService.discardPileTop.rank}`
					: `You must pick ${n} cards`;
			}
			case State.MISSING:
				return canCounter
					? "You miss a turn – or pass it on with a 4"
					: "You miss a turn";
			case State.CARD_CALLED:
				return `Opponent called ${game.cardCalled} – play it or pick a card`;
			case State.SUIT_CALLED:
				return `Opponent called ${game.suitCalled} – play that suit or pick a card`;
			default:
				return "Your turn – play a card or pick one";
		}
	}

	get isMyTurn(): boolean {
		return (
			this.gameService.winner() === null &&
			this.gameService.turn.value === Turn.ME
		);
	}
}
