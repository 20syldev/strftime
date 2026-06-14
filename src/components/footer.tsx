"use client";

import { ArrowUpRight } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * Site footer with the one-line pitch, engine note and author credit.
 * Locale-aware copy, no interactive state.
 */
export function Footer() {
	const t = useTranslations("footer");

	return (
		<footer className="border-t-2 py-6">
			<div className="mx-auto flex max-w-2xl flex-col items-center gap-2 px-4 text-center text-sm text-balance text-muted-foreground">
				<p>{t("pitch")}</p>
				<p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
					<span>{t("engine")}</span>
					<span aria-hidden="true">·</span>
					<span>
						{t.rich("credit", {
							author: (chunks) => (
								<a
									href="https://sylvain.sh"
									target="_blank"
									rel="noopener noreferrer"
									className="ml-1 inline-flex items-center gap-0.5 rounded-sm px-1 font-semibold text-foreground underline decoration-2 underline-offset-2 transition-colors hover:bg-primary hover:text-primary-foreground hover:no-underline focus-visible:bg-primary focus-visible:text-primary-foreground focus-visible:no-underline focus-visible:outline-none"
								>
									{chunks}
									<ArrowUpRight aria-hidden="true" className="size-3.5" />
								</a>
							),
						})}
					</span>
				</p>
			</div>
		</footer>
	);
}
