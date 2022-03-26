export enum State {
  WAITING_FOR_CARD, CARD_PICKING, CARD_CALLED, MISSING
}

export const stateToString = (state: State) => {
	switch (state) {
		case State.WAITING_FOR_CARD:
			return "WAITING_FOR_CARD"
		case State.CARD_PICKING:
			return "CARD_PICKING"
		case State.CARD_CALLED:
			return "CARD_CALLED"
		case State.MISSING:
			return "MISSING"
	}
}
