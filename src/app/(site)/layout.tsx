import { getMessages, setRequestLocale } from "next-intl/server";

import { Shell } from "@/components/shell";
import { routing } from "@/i18n/routing";
import { buildMetadata } from "@/lib/metadata";

/**
 * Document metadata for the default locale.
 * Delegates to the shared buildMetadata helper.
 *
 * @returns Metadata for the locale's document head
 */
export function generateMetadata() {
	return buildMetadata(routing.defaultLocale);
}

/**
 * Root layout for the default locale, served at "/". The non-default locales
 * live under the sibling [locale] segment; keeping the default unprefixed is
 * why it gets its own root layout here.
 *
 * @param children - Page tree rendered inside the shell
 */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
	setRequestLocale(routing.defaultLocale);
	const messages = await getMessages({ locale: routing.defaultLocale });
	return (
		<Shell locale={routing.defaultLocale} messages={messages}>
			{children}
		</Shell>
	);
}
