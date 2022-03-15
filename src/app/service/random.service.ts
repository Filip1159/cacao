import {Injectable} from '@angular/core';

@Injectable({
	providedIn: 'root'
})
export class RandomService {

	private constructor() {
	}

	generate(min: number, max: number): number {
		return Math.floor(Math.random() * (max - min)) + min
	}
}

