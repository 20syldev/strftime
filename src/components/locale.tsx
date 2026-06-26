"use client";

import { Languages } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect } from "react";

import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { routing } from "@/i18n/routing";

// Each language is shown in its own name (autonym), so the menu needs no
// translated labels and a newly added locale labels itself.
const autonym = (code: string): string => {
	const name = new Intl.DisplayNames([code], { type: "language" }).of(code) ?? code;
	return name.charAt(0).toUpperCase() + name.slice(1);
};

/**
 * Dropdown that switches the active locale by navigating to its root.
 * Persists the choice best-effort and supports the Alt+L shortcut.
 */
export function LocaleSwitcher() {
	const t = useTranslations("header.language");
	const locale = useLocale();

	const apply = useCallback((next: string) => {
		try {
			window.localStorage.setItem("locale", next);
		} catch {
			// Persisting the preference is best-effort only
		}
		// Default locale lives at "/", the others under "/<locale>/". Each
		// locale is its own root layout, so switching means a full navigation;
		// the query string (?f=) and hash are carried across.
		const prefix = next === routing.defaultLocale ? "/" : `/${next}/`;
		window.location.href = prefix + window.location.search + window.location.hash;
	}, []);

	// Alt+L cycles to the next locale; e.code is layout-independent
	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.altKey && event.code === "KeyL") {
				event.preventDefault();
				const index = routing.locales.indexOf(locale as (typeof routing.locales)[number]);
				apply(routing.locales[(index + 1) % routing.locales.length]);
			}
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [locale, apply]);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline" aria-label={t("label")} title={t("shortcut")}>
					<Languages className="size-4" />
					<span className="font-mono text-xs font-bold uppercase">{locale}</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuRadioGroup value={locale} onValueChange={apply}>
					{routing.locales.map((l) => (
						<DropdownMenuRadioItem key={l} value={l}>
							{autonym(l)}
						</DropdownMenuRadioItem>
					))}
				</DropdownMenuRadioGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
