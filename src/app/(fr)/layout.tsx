import { getMessages, setRequestLocale } from "next-intl/server";

import { Shell } from "@/components/shell";
import { buildMetadata } from "@/lib/metadata";

/**
 * Document metadata for the French locale.
 * Delegates to the shared buildMetadata helper.
 *
 * @returns Metadata for the locale's document head
 */
export function generateMetadata() {
	return buildMetadata("fr");
}

/**
 * Root layout for the French locale, served under "/fr".
 * Pins the request locale and hydrates the shell with its translated messages.
 *
 * @param children - Page tree rendered inside the shell
 */
export default async function FrLayout({ children }: { children: React.ReactNode }) {
	setRequestLocale("fr");
	const messages = await getMessages({ locale: "fr" });
	return (
		<Shell locale="fr" messages={messages}>
			{children}
		</Shell>
	);
}
