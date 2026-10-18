import { Component, EventEmitter, Input, OnInit, Output } from "@angular/core";

@Component({
	selector: "app-card-called-modal",
	templateUrl: "./card-called-modal.component.html",
	styleUrls: ["./card-called-modal.component.scss"],
	standalone: true,
})
export class CardCalledModalComponent implements OnInit {
	@Output()
	onSelected: EventEmitter<number>;
	@Input()
	visible: boolean = false;

	constructor() {
		this.onSelected = new EventEmitter<number>();
	}

	ngOnInit(): void {}

	readonly ranks = [5, 6, 7, 8, 9, 10];
}
