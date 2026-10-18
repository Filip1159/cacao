import { Component, OnInit } from "@angular/core";
import { Card } from "../../../model/Card";
import { GameService } from "../../../service/game.service";
import { HumanPlayer } from "../../../service/player/HumanPlayer";
import { State, stateToString } from "../../../model/enum/State";
import { Turn } from "../../../model/enum/Turn";
import { RankCharacter } from "../../../model/Rank";
import { Suit } from "../../../model/Suit";
import { SuitCalledModalComponent } from "../../suit-called-modal/suit-called-modal.component";
import { CardComponent } from "../../cards/card/card.component";
import { CardCalledModalComponent } from "../../card-called-modal/card-called-modal.component";
import { AsyncPipe } from "@angular/common";

@Component({
	selector: "app-player",
	templateUrl: "./player.component.html",
	styleUrls: ["./player.component.scss"],
	standalone: true,
	imports: [
		CardComponent,
		CardCalledModalComponent,
		SuitCalledModalComponent,
		AsyncPipe,
	],
})
export class PlayerComponent implements OnInit {
	cards: Card[];
	player: HumanPlayer;
	showCardCalledModal: boolean = false;
	showSuitCalledModal: boolean = false;

	constructor(private gameService: GameService) {
		this.cards = gameService.players[0].cards;
		this.player = gameService.players[0] as HumanPlayer;
	}

	ngOnInit(): void {}

	onCardClick(card: Card): void {
		console.log("[ME] onCardClick");
		console.log(card);
		if (this.gameService.isLegalMove(card)) {
			this.player.chosenMove = this.cards.indexOf(card);
			if (card.rank.value === RankCharacter.Jack)
				this.showCardCalledModal = true;
			else if (card.rank.value === RankCharacter.Ace)
				this.showSuitCalledModal = true;
			else this.player.makeAction();
		}
		console.log("[ME] after onCardClick");
	}

	onRankSelected(rank: number) {
		this.player.chosenRank = rank;
		this.showCardCalledModal = false;
		this.player.makeAction();
	}

	onSuitSelected(suit: Suit) {
		this.player.chosenSuit = suit;
		this.showSuitCalledModal = false;
		this.player.makeAction();
	}

	isLegalMove(card: Card): boolean {
		return this.gameService.isLegalMove(card);
	}

	pickCardFromStack(): void {
		const count =
			this.player.state === State.CARD_PICKING
				? this.gameService.cardsToPick
				: 1;
		for (let i = 0; i < count; i++) this.player.drawCard();
		this.gameService.afterCardPlayed(null);
	}

	get state(): string {
		return stateToString(this.player.state);
	}

	missTurn(): void {
		this.gameService.afterCardPlayed(null);
	}

	doesMissTurn(): boolean {
		return this.player.state === State.MISSING;
	}

	isMyTurn(): boolean {
		return this.gameService.turn.value === Turn.ME;
	}

	// Emits on every turn change so the view is re-checked; the button state
	// itself is derived from the player's current state in isPickCardDisabled.
	turn$ = this.gameService.turn;

	isPickCardDisabled(turn: Turn | null): boolean {
		return this.doesMissTurn() || turn !== Turn.ME;
	}
}
