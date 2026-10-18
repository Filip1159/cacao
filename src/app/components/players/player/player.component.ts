import { Component, signal } from "@angular/core";
import { Card } from "../../../model/Card";
import { GameService } from "../../../service/game.service";
import { RankCharacter } from "../../../model/Rank";
import { Suit } from "../../../model/Suit";
import { SuitCalledModalComponent } from "../../suit-called-modal/suit-called-modal.component";
import { CardComponent } from "../../cards/card/card.component";
import { CardCalledModalComponent } from "../../card-called-modal/card-called-modal.component";

@Component({
	selector: "app-player",
	templateUrl: "./player.component.html",
	styleUrls: ["./player.component.scss"],
	imports: [
		CardComponent,
		CardCalledModalComponent,
		SuitCalledModalComponent,
	],
})
export class PlayerComponent {
	readonly cards = this.game.humanHand;
	/** The Jack or Ace waiting for the rank / suit to be called. */
	readonly pending = signal<{ index: number; call: "rank" | "suit" } | null>(
		null,
	);

	constructor(readonly game: GameService) {}

	onCardClick(card: Card): void {
		if (!this.game.isMyTurn() || !this.game.isLegalMove(card)) return;
		const index = this.cards().indexOf(card);
		if (card.rank.value === RankCharacter.Jack)
			this.pending.set({ index, call: "rank" });
		else if (card.rank.value === RankCharacter.Ace)
			this.pending.set({ index, call: "suit" });
		else this.game.play(index);
	}

	onRankSelected(rank: number): void {
		this.playPending({ rank });
	}

	onSuitSelected(suit: Suit): void {
		this.playPending({ suit });
	}

	private playPending(call: { rank?: number; suit?: Suit }): void {
		const pending = this.pending();
		this.pending.set(null);
		if (pending) this.game.play(pending.index, call);
	}
}
