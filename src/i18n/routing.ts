import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
	locales: ["en", "fr"],
	defaultLocale: "en",
	// Default locale (en) is served at "/", the others under their prefix (/fr)
	localePrefix: "as-needed",
});

export type AppLocale = (typeof routing.locales)[number];
