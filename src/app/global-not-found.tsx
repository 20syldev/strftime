import { type Metadata } from "next";
import { getMessages, setRequestLocale } from "next-intl/server";

import { NotFound, type NotFoundCopy } from "@/components/notfound";
import { Shell } from "@/components/shell";
import { type AppLocale, routing } from "@/i18n/routing";

export const metadata: Metadata = {
	title: "404 — strftime",
};

/**
 * Global 404, rendered for any unmatched route. Each locale lives in its own
 * route group with its own root layout, so there is no layout to wrap the
 * not-found page: it owns the whole document via the Shell, and Next skips its
 * default layout (see experimental.globalNotFound in next.config).
 *
 * A static export serves a single 404 document for every path, so it renders in
 * the default locale and hands the client every locale's copy to localize from
 * the URL. The copy map is built from routing.locales, so a new locale needs no
 * change here: add it to the routing and ship its messages file.
 */
export default async function GlobalNotFound() {
	setRequestLocale(routing.defaultLocale);
	const messages = await getMessages({ locale: routing.defaultLocale });
	const entries = await Promise.all(
		routing.locales.map(
			async (locale) =>
				[locale, (await import(`../../messages/${locale}.json`)).default.notFound] as [
					AppLocale,
					NotFoundCopy,
				],
		),
	);
	const copy = Object.fromEntries(entries) as Record<AppLocale, NotFoundCopy>;
	return (
		<Shell locale={routing.defaultLocale} messages={messages}>
			<NotFound copy={copy} />
		</Shell>
	);
}
