"use client";

import { MonitorCog, Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Dropdown to pick the light, dark or system theme via next-themes.
 * Also wires the Alt+T shortcut to flip between light and dark.
 */
export function ThemeToggle() {
	const t = useTranslations("header.theme");
	const { setTheme, resolvedTheme } = useTheme();

	// Alt+T flips between light and dark; e.code is layout-independent
	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.altKey && event.code === "KeyT") {
				event.preventDefault();
				setTheme(resolvedTheme === "dark" ? "light" : "dark");
			}
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [setTheme, resolvedTheme]);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline" size="icon" aria-label={t("label")} title={t("shortcut")}>
					<Sun className="size-4 scale-100 rotate-0 transition-transform dark:scale-0 dark:-rotate-90" />
					<Moon className="absolute size-4 scale-0 rotate-90 transition-transform dark:scale-100 dark:rotate-0" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuItem onClick={() => setTheme("light")}>
					<Sun /> {t("light")}
				</DropdownMenuItem>
				<DropdownMenuItem onClick={() => setTheme("dark")}>
					<Moon /> {t("dark")}
				</DropdownMenuItem>
				<DropdownMenuItem onClick={() => setTheme("system")}>
					<MonitorCog /> {t("system")}
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
