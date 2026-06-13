"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";

import {
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import { CATEGORY_ORDER, DIRECTIVES } from "@/data/directives";
import { PRESETS } from "@/data/presets";

interface CommandMenuProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onInsert: (code: string) => void;
	onPreset: (format: string) => void;
}

/**
 * Command palette (Cmd/Ctrl+K) for inserting directives or applying presets.
 * Groups directives by category and lists every curated preset.
 *
 * @param open - Whether the dialog is visible
 * @param onOpenChange - Toggles the dialog open state
 * @param onInsert - Appends a directive code to the format
 * @param onPreset - Replaces the format with a preset
 */
export function CommandMenu({ open, onOpenChange, onInsert, onPreset }: CommandMenuProps) {
	const t = useTranslations("command");
	const tDir = useTranslations("directives");
	const tCat = useTranslations("categories");
	const tPresets = useTranslations("presets");

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
				event.preventDefault();
				onOpenChange(!open);
			}
		};
		document.addEventListener("keydown", onKeyDown);
		return () => document.removeEventListener("keydown", onKeyDown);
	}, [open, onOpenChange]);

	return (
		<CommandDialog
			open={open}
			onOpenChange={onOpenChange}
			title={t("open")}
			description={t("hint")}
			closeLabel={t("close")}
		>
			<CommandInput placeholder={t("placeholder")} />
			<CommandList>
				<CommandEmpty>{t("empty")}</CommandEmpty>
				<CommandGroup heading={tPresets("title")}>
					{PRESETS.map((preset) => (
						<CommandItem
							key={preset.key}
							value={`${tPresets(`names.${preset.key}`)} ${preset.format}`}
							onSelect={() => {
								onPreset(preset.format);
								onOpenChange(false);
							}}
						>
							<span>{tPresets(`names.${preset.key}`)}</span>
							<span className="ml-auto font-mono text-xs text-muted-foreground">
								{preset.format}
							</span>
						</CommandItem>
					))}
				</CommandGroup>
				{CATEGORY_ORDER.map((category) => (
					<CommandGroup key={category} heading={tCat(category)}>
						{DIRECTIVES.filter((d) => d.category === category).map((directive) => (
							<CommandItem
								key={directive.key}
								value={`${directive.code} ${tDir(`${directive.key}.description`)}`}
								onSelect={() => {
									onInsert(directive.code);
									onOpenChange(false);
								}}
							>
								<span className="font-mono font-bold">{directive.code}</span>
								<span className="truncate text-sm text-muted-foreground">
									{tDir(`${directive.key}.description`)}
								</span>
							</CommandItem>
						))}
					</CommandGroup>
				))}
			</CommandList>
		</CommandDialog>
	);
}
