import { setRequestLocale } from "next-intl/server";

import { Studio } from "@/components/studio";
import { routing } from "@/i18n/routing";

/**
 * Home page for the default locale.
 * Pins the request locale for static export, then renders the studio.
 */
export default function HomePage() {
	setRequestLocale(routing.defaultLocale);
	return <Studio />;
}
