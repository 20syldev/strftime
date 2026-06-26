import { setRequestLocale } from "next-intl/server";

import { Studio } from "@/components/studio";

/**
 * Home page for a non-default locale.
 * Pins the request locale for static export, then renders the studio.
 *
 * @param params - Route params carrying the locale segment
 */
export default async function LocaleHomePage({ params }: { params: Promise<{ locale: string }> }) {
	const { locale } = await params;
	setRequestLocale(locale);
	return <Studio />;
}
