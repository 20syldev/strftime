"use client";

import { Download, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { type SavedFormat, useSavedFormats } from "@/hooks/useSavedFormats";
import { cn } from "@/lib/utils";

interface LibraryProps {
	format: string;
	onSelect: (format: string) => void;
}

type DialogState = { mode: "save" } | { mode: "rename"; id: string };

/**
 * Personal library of saved formats, mirroring the Presets card: each entry is
 * a select-to-load chip with rename/delete, plus save/export/import controls.
 *
 * @param format - Current format string, used to mark the active saved entry
 * @param onSelect - Applies the chosen saved format
 */
export function Library({ format, onSelect }: LibraryProps) {
	const t = useTranslations("library");
	const { items, save, remove, rename, restore, exportJson, importJson } = useSavedFormats();

	const [dialog, setDialog] = useState<DialogState | null>(null);
	const [name, setName] = useState("");
	const fileInput = useRef<HTMLInputElement>(null);

	const openSave = () => {
		setName("");
		setDialog({ mode: "save" });
	};

	const openRename = (item: SavedFormat) => {
		setName(item.name);
		setDialog({ mode: "rename", id: item.id });
	};

	const submit = () => {
		const trimmed = name.trim();
		if (!trimmed || !dialog) {
			return;
		}
		if (dialog.mode === "save") {
			save(trimmed, format);
			toast(t("saved"));
		} else {
			rename(dialog.id, trimmed);
			toast(t("renamed"));
		}
		setDialog(null);
	};

	const onDelete = (item: SavedFormat) => {
		remove(item.id);
		toast(t("deleted"), { action: { label: t("undo"), onClick: () => restore(item) } });
	};

	const onExport = () => {
		const blob = new Blob([exportJson()], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement("a");
		anchor.href = url;
		anchor.download = "strftime-formats.json";
		anchor.click();
		URL.revokeObjectURL(url);
	};

	return (
		<section className="flex flex-col gap-4 rounded-xl border-2 bg-card p-4 shadow-raised sm:p-6">
			<div className="flex items-center justify-between gap-2">
				<h2 className="text-xs font-black tracking-wider text-muted-foreground uppercase">
					{t("title")}
				</h2>
				<div className="flex items-center gap-1">
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="outline"
								size="icon-sm"
								aria-label={t("saveCurrent")}
								onClick={openSave}
							>
								<Plus className="size-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent>{t("saveCurrent")}</TooltipContent>
					</Tooltip>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="outline"
								size="icon-sm"
								aria-label={t("export")}
								onClick={onExport}
								disabled={items.length === 0}
							>
								<Download className="size-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent>{t("export")}</TooltipContent>
					</Tooltip>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="outline"
								size="icon-sm"
								aria-label={t("import")}
								onClick={() => fileInput.current?.click()}
							>
								<Upload className="size-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent>{t("import")}</TooltipContent>
					</Tooltip>
					<input
						ref={fileInput}
						type="file"
						accept="application/json"
						className="hidden"
						onChange={(event) => {
							const input = event.target;
							const file = input.files?.[0];
							// Reset so re-picking the same file still fires change
							input.value = "";
							if (!file) {
								return;
							}
							file.text()
								.then((text) => toast(t("imported", { count: importJson(text) })))
								.catch(() => toast(t("importError")));
						}}
					/>
				</div>
			</div>

			{items.length === 0 ? (
				<p className="text-sm text-muted-foreground">{t("empty")}</p>
			) : (
				<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
					{items.map((item) => {
						const active = item.format === format;
						return (
							<div key={item.id} className="relative">
								<button
									type="button"
									aria-pressed={active}
									aria-label={t("load", { name: item.name })}
									onClick={() => onSelect(item.format)}
									className={cn(
										"flex w-full flex-col items-start gap-0.5 rounded-md border-2 px-3 py-1.5 pr-16 text-left",
										"shadow-raised-sm transition-all hover:shadow-raised",
										"active:translate-x-(--press-x) active:translate-y-(--press-y) active:shadow-pressed",
										active ? "bg-primary text-primary-foreground" : "bg-card",
									)}
								>
									<span className="w-full truncate text-xs font-bold">
										{item.name}
									</span>
									<span
										className={cn(
											"w-full truncate font-mono text-[11px]",
											!active && "text-muted-foreground",
										)}
									>
										{item.format}
									</span>
								</button>
								<div
									className={cn(
										"absolute top-1/2 right-2 flex -translate-y-1/2 items-center gap-1",
										active
											? "text-primary-foreground"
											: "text-muted-foreground",
									)}
								>
									<Button
										variant="ghost"
										size="icon-xs"
										aria-label={t("rename")}
										onClick={() => openRename(item)}
									>
										<Pencil className="size-3.5" />
									</Button>
									<Button
										variant="ghost"
										size="icon-xs"
										aria-label={t("delete")}
										onClick={() => onDelete(item)}
									>
										<Trash2 className="size-3.5" />
									</Button>
								</div>
							</div>
						);
					})}
				</div>
			)}

			<Dialog open={dialog !== null} onOpenChange={(open) => !open && setDialog(null)}>
				<DialogContent className="sm:max-w-sm" closeLabel={t("close")}>
					<DialogHeader>
						<DialogTitle>
							{dialog?.mode === "rename" ? t("renameTitle") : t("saveCurrent")}
						</DialogTitle>
					</DialogHeader>
					<form
						className="flex flex-col gap-4"
						onSubmit={(event) => {
							event.preventDefault();
							submit();
						}}
					>
						<Input
							value={name}
							onChange={(event) => setName(event.target.value)}
							placeholder={t("namePlaceholder")}
						/>
						<DialogFooter>
							<Button type="submit" disabled={name.trim() === ""}>
								{t("save")}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		</section>
	);
}
