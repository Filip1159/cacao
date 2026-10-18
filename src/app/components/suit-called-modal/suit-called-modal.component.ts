import { Component, EventEmitter, Input, Output } from "@angular/core";
import { Suit, getAllSuits } from "../../model/Suit";

@Component({
	selector: "app-suit-called-modal",
	templateUrl: "./suit-called-modal.component.html",
	styleUrls: ["./suit-called-modal.component.scss"],
})
export class SuitCalledModalComponent {
	@Output()
	onSelected = new EventEmitter<Suit>();
	@Input()
	visible: boolean = false;

	readonly suits = getAllSuits();
}
