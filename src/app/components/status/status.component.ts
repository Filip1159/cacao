import { Component, computed } from "@angular/core";
import { GameService } from "../../service/game.service";
import { Turn } from "../../model/enum/Turn";

@Component({
	selector: "app-status",
	templateUrl: "./status.component.html",
	styleUrls: ["./status.component.scss"],
})
export class StatusComponent {
	readonly turn = computed(() => this.game.state().turn);
	readonly message = computed(() => {
		const notice = this.game.notice();
		const base = this.baseMessage();
		return notice ? `${notice} ${base}` : base;
	});

	constructor(readonly game: GameService) {}

	private baseMessage(): string {
		const state = this.game.state();
		if (state.winner !== null) return "Game over";
		if (state.macauPending) return "You have one card left – press Macau!";
		if (state.turn === Turn.OPPONENT) return "Opponent is thinking…";
		if (state.chain.length > 0)
			return `Play another ${state.chain[0].rank} – or end your turn`;
		const canCounter = this.game.hasCounter();
		const { obligation } = state;
		switch (obligation.kind) {
			case "pick":
				return canCounter
					? `Pick ${obligation.count} cards – or pass the penalty on with another ${this.game.top().rank}`
					: `You must pick ${obligation.count} cards`;
			case "miss":
				return canCounter
					? "You miss a turn – or pass it on with a 4"
					: "You miss a turn";
			case "rank":
				return `Opponent called ${obligation.rank} – play it or pick a card`;
			case "suit":
				return `Opponent called ${obligation.suit} – play that suit or pick a card`;
			case "none":
				return "Your turn – play a card or pick one";
		}
	}
}
