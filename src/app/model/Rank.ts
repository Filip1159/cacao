export enum RankCharacter {
  Jack = 11, Queen, King, Ace
}

export class Rank {
  value: RankCharacter | number;

  constructor(value: number) {
    if (value < 2 || value > 14) throw new Error(`Illegal value: ${value}`);
    if (value <= 10) this.value = value;
    else this.value = value as RankCharacter
  }
}
