import { setRequestLocale } from "next-intl/server";

import { Studio } from "@/components/studio";

/**
 * Home page for the French locale.
 * Pins the request locale for static export, then renders the studio.
 */
export default function FrenchHomePage() {
	setRequestLocale("fr");
	return <Studio />;
}
