import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";

import { Shell } from "@/components/shell";
import { routing } from "@/i18n/routing";
import { buildMetadata } from "@/lib/metadata";

/**
 * Pre-render every locale except the default one, which the (site) group serves
 * unprefixed at the root. With dynamicParams disabled, any other prefix falls
 * through to the global 404. Adding a locale to the routing is enough to get
 * its pages; no new route files are needed.
 */
export function generateStaticParams() {
	return routing.locales
		.filter((locale) => locale !== routing.defaultLocale)
		.map((locale) => ({ locale }));
}

export const dynamicParams = false;

/**
 * Localized document metadata, resolved from the active locale segment.
 *
 * @param params - Route params carrying the locale segment
 * @returns Metadata for the locale's document head
 */
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
	const { locale } = await params;
	return hasLocale(routing.locales, locale) ? buildMetadata(locale) : {};
}

/**
 * Root layout for the non-default locales, served under their prefix (/fr, ...).
 * Each locale renders its own document so the html lang stays correct.
 *
 * @param children - Page tree for this locale
 * @param params - Route params carrying the locale segment
 */
export default async function LocaleLayout({
	children,
	params,
}: {
	children: React.ReactNode;
	params: Promise<{ locale: string }>;
}) {
	const { locale } = await params;
	if (!hasLocale(routing.locales, locale)) notFound();
	setRequestLocale(locale);
	const messages = await getMessages({ locale });
	return (
		<Shell locale={locale} messages={messages}>
			{children}
		</Shell>
	);
}
