"use client";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";

import { LocaleSwitcher } from "@/components/locale";
import { ThemeToggle } from "@/components/theme";
import { Button } from "@/components/ui/button";

interface HeaderProps {
	onSearchOpen: () => void;
}

/**
 * Sticky top bar with the search trigger, locale switcher and theme toggle.
 *
 * @param onSearchOpen - Opens the command palette when the search button is hit
 */
export function Header({ onSearchOpen }: HeaderProps) {
	const tCommand = useTranslations("command");

	return (
		<header className="sticky top-0 z-40 border-b-2 bg-background/90 backdrop-blur">
			<div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-2 px-4">
				<div className="flex items-center gap-3">
					<span
						aria-hidden="true"
						className="grid size-8 -rotate-3 place-items-center rounded-md border-2 bg-primary font-mono text-lg font-black text-primary-foreground shadow-raised-sm"
					>
						%
					</span>
					<span className="text-lg font-black tracking-tight">strftime</span>
				</div>
				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						onClick={onSearchOpen}
						aria-label={tCommand("open")}
						className="gap-2"
					>
						<Search className="size-4" />
						<kbd className="pointer-events-none hidden rounded border px-1.5 font-mono text-[10px] font-bold sm:inline-block">
							Ctrl K
						</kbd>
					</Button>
					<LocaleSwitcher />
					<ThemeToggle />
				</div>
			</div>
		</header>
	);
}
