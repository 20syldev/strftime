import { getMessages, setRequestLocale } from "next-intl/server";

import { Shell } from "@/components/shell";
import { buildMetadata } from "@/lib/metadata";

/**
 * Document metadata for the default locale.
 * Delegates to the shared buildMetadata helper.
 *
 * @returns Metadata for the locale's document head
 */
export function generateMetadata() {
	return buildMetadata("en");
}

/**
 * Root layout for the default locale, served at "/".
 * Pins the request locale and hydrates the shell with its translated messages.
 *
 * @param children - Page tree rendered inside the shell
 */
export default async function EnLayout({ children }: { children: React.ReactNode }) {
	setRequestLocale("en");
	const messages = await getMessages({ locale: "en" });
	return (
		<Shell locale="en" messages={messages}>
			{children}
		</Shell>
	);
}
