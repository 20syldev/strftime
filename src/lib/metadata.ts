import { type Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { type AppLocale } from "@/i18n/routing";

/**
 * Build localized document metadata from the "meta" message namespace.
 *
 * @param locale - Target locale
 * @returns Title and description for the document head
 */
export async function buildMetadata(locale: AppLocale): Promise<Metadata> {
	const t = await getTranslations({ locale, namespace: "meta" });
	return { title: t("title"), description: t("description") };
}
