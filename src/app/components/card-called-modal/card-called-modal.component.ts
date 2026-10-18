import { CALLABLE_RANKS } from "../../model/Rank";
import { Component, EventEmitter, Input, Output } from "@angular/core";

@Component({
	selector: "app-card-called-modal",
	templateUrl: "./card-called-modal.component.html",
	styleUrls: ["./card-called-modal.component.scss"],
})
export class CardCalledModalComponent {
	@Output()
	onSelected: EventEmitter<number>;
	@Input()
	visible: boolean = false;

	constructor() {
		this.onSelected = new EventEmitter<number>();
	}

	readonly ranks = CALLABLE_RANKS;
}
