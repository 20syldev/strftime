"use client";

import { useDndContext } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { GripVertical, Trash2, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { DialectSupport } from "@/components/support";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CATEGORY_SWATCH, type Dialect, findDirective } from "@/data/directives";
import { analyzeToken } from "@/lib/portability";
import {
	buildDirective,
	type CaseFlag,
	type DirectiveToken,
	type PaddingFlag,
	type Token,
} from "@/lib/strftime";
import { cn } from "@/lib/utils";

export const DROP_COPY = "drop-copy";
export const DROP_TRASH = "drop-trash";

export const SWATCH_CLASSES: Record<number, string> = {
	1: "bg-swatch-1",
	2: "bg-swatch-2",
	3: "bg-swatch-3",
	4: "bg-swatch-4",
	5: "bg-swatch-5",
	6: "bg-swatch-6",
};

const CHIP_FRAME_BASE =
	"inline-flex shrink-0 items-stretch overflow-hidden rounded-md border-2 shadow-raised-sm " +
	"transition-shadow hover:shadow-raised active:translate-x-(--press-x) " +
	"active:translate-y-(--press-y) active:shadow-pressed";

const CHIP_FRAME = CHIP_FRAME_BASE + " motion-safe:animate-pop";

function FlagToggle({ value, label }: { value: string; label: string }) {
	return (
		<ToggleGroupItem value={value}>
			<Tooltip>
				<TooltipTrigger asChild>
					<span className="flex h-full w-full items-center justify-center">{label}</span>
				</TooltipTrigger>
				<TooltipContent className="font-mono">{value}</TooltipContent>
			</Tooltip>
		</ToggleGroupItem>
	);
}

const CHIP_BODY =
	"flex flex-col items-start gap-1 py-1.5 pr-2.5 pl-1 text-left " +
	"focus-visible:outline-2 focus-visible:-outline-offset-2";

interface ChipProps {
	id: string;
	token: Token;
	value: string | null;
	dialect: Dialect | "all";
	onChange: (raw: string) => void;
	onRemove: () => void;
	editTarget?: number | null;
	wiggle?: boolean;
}

/**
 * One piece of the format string: a directive with its live value and an
 * explanation popover, an editable literal, or an invalid sequence. Dragging
 * goes through a dedicated grip handle so the popover trigger and the inputs
 * inside it keep their normal keyboard and touch behavior.
 */
export function SortableChip(props: ChipProps) {
	const t = useTranslations("chip");
	const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useSortable({
		id: props.id,
		attributes: { roleDescription: t("sortable") },
	});

	const { token } = props;

	return (
		<span
			role="listitem"
			ref={setNodeRef}
			className={cn("inline-flex shrink-0", props.wiggle && "motion-safe:animate-wiggle")}
		>
			<span className={cn(CHIP_FRAME, frameClass(token), isDragging && "opacity-30")}>
				<button
					type="button"
					ref={setActivatorNodeRef}
					aria-label={t("drag")}
					className="cursor-grab touch-none self-stretch px-0.5 opacity-60 transition-opacity hover:opacity-100 focus-visible:outline-2 focus-visible:-outline-offset-2 active:cursor-grabbing"
					{...attributes}
					{...listeners}
				>
					<GripVertical aria-hidden="true" className="size-3.5" />
				</button>
				{token.kind === "directive" ? (
					<DirectiveChip {...props} token={token} />
				) : token.kind === "literal" ? (
					<LiteralChip {...props} />
				) : (
					<InvalidChip {...props} />
				)}
			</span>
		</span>
	);
}

interface DirectiveChipProps extends ChipProps {
	token: DirectiveToken;
}

function DirectiveChip({ token, value, dialect, onChange, onRemove }: DirectiveChipProps) {
	const t = useTranslations("chip");
	const tDir = useTranslations("directives");
	const tCat = useTranslations("categories");
	const tPalette = useTranslations("palette");
	const tDialects = useTranslations("dialects");
	const tPortability = useTranslations("portability");

	const directive = findDirective(token.conversion, token.colons);
	const selectedIssue = dialect !== "all" ? analyzeToken(token)[dialect] : null;
	const unsupported = selectedIssue ? !selectedIssue.ok : false;

	const update = (patch: Partial<DirectiveToken>) =>
		onChange(buildDirective({ ...token, ...patch }));

	return (
		<Popover>
			<PopoverTrigger asChild>
				<button type="button" className={CHIP_BODY}>
					<span className="inline-flex items-center gap-1 font-mono text-sm leading-none font-bold">
						{token.raw}
						{unsupported && <TriangleAlert aria-hidden="true" className="size-3" />}
					</span>
					<span className="min-h-3 font-mono text-xs leading-none whitespace-pre opacity-80">
						{value ?? " "}
					</span>
				</button>
			</PopoverTrigger>
			<PopoverContent
				align="start"
				className="flex w-max max-w-[calc(100vw-2rem)] flex-col gap-3"
			>
				{directive && (
					<>
						<div className="flex items-start justify-between gap-2">
							<span className="font-mono text-lg font-black">{directive.code}</span>
							<Badge variant="secondary">{tCat(directive.category)}</Badge>
						</div>
						<p className="w-0 min-w-full text-sm">
							{tDir(`${directive.key}.description`)}
						</p>
						<p className="w-0 min-w-full text-xs text-muted-foreground">
							{tDir(`${directive.key}.notes`)}
						</p>
						<div className="grid grid-cols-[auto_1fr] items-baseline gap-x-3 gap-y-1 text-xs">
							<span className="text-muted-foreground">{t("value")}</span>
							<span className="font-mono whitespace-pre-wrap">{value ?? ""}</span>
							{directive.range && (
								<>
									<span className="text-muted-foreground">{t("range")}</span>
									<span className="font-mono">{directive.range}</span>
								</>
							)}
							<span className="text-muted-foreground">{t("support")}</span>
							<DialectSupport directive={directive} />
						</div>
						{unsupported && selectedIssue && dialect !== "all" && (
							<p className="flex w-0 min-w-full items-center gap-1.5 text-xs font-bold text-destructive">
								<TriangleAlert aria-hidden="true" className="size-3.5" />
								{selectedIssue.reason === "conversion"
									? tPalette("unsupported", {
											code: directive.code,
											dialect: tDialects(dialect),
										})
									: tPortability(`chip.${selectedIssue.reason}`, {
											code: token.raw,
											dialect: tDialects(dialect),
										})}
							</p>
						)}
						<div className="flex flex-col gap-2">
							<Label className="text-xs">{t("padding")}</Label>
							<ToggleGroup
								type="single"
								variant="outline"
								size="sm"
								value={token.padding ?? "default"}
								onValueChange={(v) =>
									update({
										padding:
											v && v !== "default" ? (v as PaddingFlag) : undefined,
									})
								}
							>
								<ToggleGroupItem value="default">
									{t("paddingDefault")}
								</ToggleGroupItem>
								<FlagToggle value="-" label={t("paddingNone")} />
								<FlagToggle value="_" label={t("paddingSpace")} />
								<FlagToggle value="0" label={t("paddingZero")} />
							</ToggleGroup>
						</div>
						<div className="flex flex-col gap-2">
							<Label className="text-xs">{t("casing")}</Label>
							<ToggleGroup
								type="single"
								variant="outline"
								size="sm"
								value={token.casing ?? "default"}
								onValueChange={(v) =>
									update({
										casing: v && v !== "default" ? (v as CaseFlag) : undefined,
									})
								}
							>
								<ToggleGroupItem value="default">
									{t("casingDefault")}
								</ToggleGroupItem>
								<FlagToggle value="^" label={t("casingUpper")} />
								<FlagToggle value="#" label={t("casingSwap")} />
							</ToggleGroup>
						</div>
						<div className="flex items-center gap-2">
							<Label htmlFor={`width-${token.raw}`} className="text-xs">
								{t("width")}
							</Label>
							<Input
								id={`width-${token.raw}`}
								type="number"
								min={1}
								max={12}
								className="h-8 w-20 font-mono"
								value={token.width ?? ""}
								onChange={(e) => {
									const parsed = parseInt(e.target.value, 10);
									update({
										width: Number.isNaN(parsed)
											? undefined
											: Math.min(12, Math.max(1, parsed)),
									});
								}}
							/>
						</div>
					</>
				)}
				<Button variant="destructive" size="sm" onClick={onRemove}>
					<Trash2 /> {t("remove")}
				</Button>
			</PopoverContent>
		</Popover>
	);
}

function LiteralChip({ token, onChange, onRemove, editTarget }: ChipProps) {
	const t = useTranslations("chip");
	const tBuilder = useTranslations("builder");
	const [open, setOpen] = useState(false);
	const [seenTarget, setSeenTarget] = useState(editTarget);

	if (editTarget !== seenTarget) {
		setSeenTarget(editTarget);
		if (editTarget != null) {
			setOpen(true);
		}
	}

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<button type="button" className={CHIP_BODY}>
					<span className="inline-flex min-h-3 items-center font-mono text-sm leading-none font-bold whitespace-pre">
						{token.raw}
					</span>
					<span className="text-xs leading-none text-muted-foreground uppercase">
						{tBuilder("literal")}
					</span>
				</button>
			</PopoverTrigger>
			<PopoverContent align="start" className="flex w-64 flex-col gap-2">
				<Label htmlFor="literal-input" className="text-xs">
					{t("editText")}
				</Label>
				<Input
					id="literal-input"
					className="font-mono"
					autoFocus
					value={token.raw}
					onFocus={(e) => e.currentTarget.select()}
					onChange={(e) => {
						// A literal can never contain %, that is the %% directive's job
						if (!e.target.value.includes("%")) {
							onChange(e.target.value);
						}
					}}
				/>
				<p className="text-xs text-muted-foreground">{t("literalNoPercent")}</p>
				<Button variant="destructive" size="sm" onClick={onRemove}>
					<Trash2 /> {t("remove")}
				</Button>
			</PopoverContent>
		</Popover>
	);
}

function InvalidChip({ token, onRemove }: ChipProps) {
	const t = useTranslations("chip");
	const tBuilder = useTranslations("builder");

	return (
		<Popover>
			<PopoverTrigger asChild>
				<button type="button" className={CHIP_BODY}>
					<span className="inline-flex min-h-3 items-center gap-1 font-mono text-sm leading-none font-bold whitespace-pre">
						{token.raw}
						<TriangleAlert aria-hidden="true" className="size-3" />
					</span>
					<span className="text-xs leading-none uppercase opacity-80">
						{tBuilder("invalid")}
					</span>
				</button>
			</PopoverTrigger>
			<PopoverContent align="start" className="flex w-64 flex-col gap-2">
				<p className="text-sm font-bold">{tBuilder("invalid")}</p>
				<p className="font-mono text-sm">{token.raw}</p>
				<Button variant="destructive" size="sm" onClick={onRemove}>
					<Trash2 /> {t("remove")}
				</Button>
			</PopoverContent>
		</Popover>
	);
}

function frameClass(token: Token): string {
	if (token.kind === "directive") {
		const directive = findDirective(token.conversion, token.colons);
		return cn(
			directive ? SWATCH_CLASSES[CATEGORY_SWATCH[directive.category]] : "bg-muted",
			"text-swatch-foreground",
		);
	}
	return token.kind === "literal"
		? "border-dashed bg-card text-card-foreground"
		: "border-destructive bg-destructive text-destructive-foreground";
}

interface FaceProps {
	token: Token;
	value: string | null;
	dialect: Dialect | "all";
}

function ChipFace({ token, value, dialect }: FaceProps) {
	const tBuilder = useTranslations("builder");
	const selectedIssue =
		token.kind === "directive" && dialect !== "all" ? analyzeToken(token)[dialect] : null;
	const unsupported = selectedIssue ? !selectedIssue.ok : false;

	return (
		<span className={cn(CHIP_FRAME_BASE, frameClass(token), "cursor-grabbing")}>
			<span className="grid place-items-center self-stretch px-0.5 opacity-60">
				<GripVertical aria-hidden="true" className="size-3.5" />
			</span>
			<span className={CHIP_BODY}>
				{token.kind === "directive" ? (
					<>
						<span className="inline-flex items-center gap-1 font-mono text-sm leading-none font-bold">
							{token.raw}
							{unsupported && <TriangleAlert aria-hidden="true" className="size-3" />}
						</span>
						<span className="min-h-3 font-mono text-xs leading-none whitespace-pre opacity-80">
							{value ?? " "}
						</span>
					</>
				) : token.kind === "literal" ? (
					<>
						<span className="inline-flex min-h-3 items-center font-mono text-sm leading-none font-bold whitespace-pre">
							{token.raw}
						</span>
						<span className="text-xs leading-none text-muted-foreground uppercase">
							{tBuilder("literal")}
						</span>
					</>
				) : (
					<>
						<span className="inline-flex min-h-3 items-center gap-1 font-mono text-sm leading-none font-bold whitespace-pre">
							{token.raw}
							<TriangleAlert aria-hidden="true" className="size-3" />
						</span>
						<span className="text-xs leading-none uppercase opacity-80">
							{tBuilder("invalid")}
						</span>
					</>
				)}
			</span>
		</span>
	);
}

/**
 * Drag overlay rendering of a chip that follows the pointer during a drag.
 * Reflects the hovered drop zone, switching to a trash or copy affordance.
 *
 * @param props - Face props of the dragged chip (token, value, dialect)
 */
export function OverlayChip(props: FaceProps) {
	const { over } = useDndContext();
	const trashing = over?.id === DROP_TRASH;
	const copying = over?.id === DROP_COPY;

	return (
		<div className="flex items-center gap-1.5">
			<div className="relative">
				<ChipFace {...props} />
				{trashing && (
					<div className="absolute inset-0 grid place-items-center rounded-md bg-destructive/80">
						<Trash2 className="size-5 text-destructive-foreground" />
					</div>
				)}
			</div>
			{copying && <ChipFace {...props} />}
		</div>
	);
}
