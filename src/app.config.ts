import {
	ApplicationConfig,
	provideZonelessChangeDetection,
} from "@angular/core";
import { provideRouter } from "@angular/router";

import {
	provideHttpClient,
	withInterceptorsFromDi,
} from "@angular/common/http";
import { AppComponent } from "./app/app.component";

export const appConfig: ApplicationConfig = {
	providers: [
		provideZonelessChangeDetection(),
		provideRouter([{ path: "", component: AppComponent }]),
		provideHttpClient(withInterceptorsFromDi()),
	],
};
