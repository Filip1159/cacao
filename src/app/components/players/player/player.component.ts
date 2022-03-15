import { Component, OnInit } from '@angular/core';
import {PlayerService} from "../../../service/player.service";
import {Card} from "../../../model/Card";

@Component({
  selector: 'app-player',
  templateUrl: './player.component.html',
  styleUrls: ['./player.component.scss']
})
export class PlayerComponent implements OnInit {
  cards: Card[]

  constructor(private playerService: PlayerService) {
    this.cards = playerService.cards;
  }

  ngOnInit(): void {
  }

}
