import {Component, Input, OnInit} from '@angular/core';
import {Rank} from "../../../model/Rank";
import {Suit} from "../../../model/Suit";
import {Card} from "../../../model/Card";

@Component({
  selector: 'app-card-face-down',
  templateUrl: './card-face-down.component.html',
  styleUrls: ['./card-face-down.component.scss']
})
export class CardFaceDownComponent implements OnInit {
  @Input() card: Card = {rank: new Rank(2), suit: Suit.HEARTS}

  ngOnInit(): void {
  }

}
