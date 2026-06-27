"use client";

import {
	type CollisionDetection,
	DndContext,
	type DragEndEvent,
	DragOverlay,
	KeyboardSensor,
	PointerSensor,
	pointerWithin,
	rectIntersection,
	useDroppable,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	arrayMove,
	rectSortingStrategy,
	SortableContext,
	sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { Copy, Link, Trash2, Type } from "lucide-react";
import { useTranslations } from "next-intl";
import { type ReactNode, useMemo, useState } from "react";
import { toast } from "sonner";

import { DROP_COPY, DROP_TRASH, OverlayChip, SortableChip } from "@/components/chip";
import { CodeExport } from "@/components/codegen";
import { PortabilityBar } from "@/components/portability";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { type Dialect } from "@/data/directives";
import { buildFormat, renderToken, tokenize } from "@/lib/strftime";
import { cn } from "@/lib/utils";

// The copy/trash zones only count when the pointer is actually over them;
// chips only count when the dragged piece genuinely overlaps them, so the
// drop target (and its wiggle) never triggers from far away
const collisionDetection: CollisionDetection = (args) => {
	const onZone = pointerWithin(args).find(({ id }) => id === DROP_COPY || id === DROP_TRASH);
	if (onZone) {
		return [onZone];
	}
	return rectIntersection({
		...args,
		droppableContainers: args.droppableContainers.filter(
			({ id }) => id !== DROP_COPY && id !== DROP_TRASH,
		),
	});
};

function DropAction({
	id,
	label,
	dropLabel,
	children,
}: {
	id: string;
	label: string;
	dropLabel: string;
	children: ReactNode;
}) {
	const { setNodeRef, isOver, active } = useDroppable({ id });
	const [hovered, setHovered] = useState(false);
	return (
		<Tooltip open={isOver || hovered} onOpenChange={setHovered}>
			<TooltipTrigger asChild>
				<div
					ref={setNodeRef}
					className={cn(
						"rounded-md",
						active && "ring-2 ring-ring/40",
						isOver && "bg-accent ring-2 ring-ring",
					)}
				>
					{children}
				</div>
			</TooltipTrigger>
			<TooltipContent>{isOver ? dropLabel : label}</TooltipContent>
		</Tooltip>
	);
}

interface BuilderProps {
	format: string;
	onFormatChange: (format: string) => void;
	date: Date | null;
	locale: string;
	dialect: Dialect | "all";
}

/**
 * Drag-and-drop canvas that renders the format as sortable chips.
 * Tokenizes the format, lets pieces be reordered, duplicated or removed,
 * and emits the rebuilt format string on every change.
 *
 * @param format - Current strftime format string
 * @param onFormatChange - Receives the rebuilt format after any edit
 * @param date - Preview date for live chip values, null before hydration
 * @param locale - Preview locale ("C" or a BCP 47 tag)
 * @param dialect - Active dialect filter, or "all"
 */
export function Builder({ format, onFormatChange, date, locale, dialect }: BuilderProps) {
	const t = useTranslations("builder");

	const tokens = useMemo(() => tokenize(format), [format]);
	const ids = tokens.map((_, index) => `chip-${index}`);

	const [editTarget, setEditTarget] = useState<{ id: string; nonce: number } | null>(null);
	const [activeId, setActiveId] = useState<string | null>(null);
	const [overId, setOverId] = useState<string | null>(null);
	const activeToken = activeId ? (tokens[ids.indexOf(activeId)] ?? null) : null;
	const overIndex = overId ? ids.indexOf(overId) : -1;

	// Drags start only from the dedicated grip handles, so a small distance
	// constraint is enough and taps on the handles stay cheap
	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
		useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
	);

	// Localized live-region strings for dnd-kit, which only ships English
	const labelFor = (id: unknown) => tokens[ids.indexOf(String(id))]?.raw ?? "";
	const accessibility = {
		screenReaderInstructions: { draggable: t("srInstructions") },
		announcements: {
			onDragStart: ({ active }: { active: { id: unknown } }) =>
				t("srPickedUp", { item: labelFor(active.id) }),
			onDragOver: ({
				active,
				over,
			}: {
				active: { id: unknown };
				over: { id: unknown } | null;
			}) =>
				over
					? t("srOver", { item: labelFor(active.id), target: labelFor(over.id) })
					: t("srPickedUp", { item: labelFor(active.id) }),
			onDragEnd: ({
				active,
				over,
			}: {
				active: { id: unknown };
				over: { id: unknown } | null;
			}) =>
				over
					? t("srDropped", { item: labelFor(active.id), target: labelFor(over.id) })
					: t("srCanceled"),
			onDragCancel: () => t("srCanceled"),
		},
	};

	const handleDragEnd = ({ active, over }: DragEndEvent) => {
		setActiveId(null);
		setOverId(null);
		if (!over) {
			return;
		}
		const from = ids.indexOf(String(active.id));
		if (from === -1) {
			return;
		}
		if (over.id === DROP_TRASH) {
			removeToken(from);
			return;
		}
		if (over.id === DROP_COPY) {
			duplicateToken(from);
			return;
		}
		if (active.id === over.id) {
			return;
		}
		const to = ids.indexOf(String(over.id));
		onFormatChange(buildFormat(arrayMove([...tokens], from, to)));
	};

	const updateToken = (index: number, raw: string) => {
		const next = tokens.map((token, i) => (i === index ? { ...token, raw } : token));
		onFormatChange(buildFormat(next));
	};

	const removeToken = (index: number) => {
		onFormatChange(buildFormat(tokens.filter((_, i) => i !== index)));
	};

	const duplicateToken = (index: number) => {
		const next = [...tokens];
		next.splice(index + 1, 0, { ...tokens[index] });
		onFormatChange(buildFormat(next));
	};

	const addText = () => {
		const last = tokens[tokens.length - 1];
		const endsWithLiteral = last?.kind === "literal";
		const index = endsWithLiteral ? tokens.length - 1 : tokens.length;
		if (!endsWithLiteral) {
			onFormatChange(buildFormat([...tokens, { kind: "literal", raw: " " }]));
		}
		setEditTarget((prev) => ({ id: `chip-${index}`, nonce: (prev?.nonce ?? 0) + 1 }));
	};

	const copyFormat = async () => {
		await navigator.clipboard.writeText(format);
		toast(t("copied"));
	};

	const copyLink = async () => {
		const url = new URL(window.location.href);
		url.searchParams.set("f", format);
		await navigator.clipboard.writeText(url.toString());
		toast(t("shared"));
	};

	const actions = [
		{
			label: t("copy"),
			icon: Copy,
			onClick: copyFormat,
			dropId: DROP_COPY,
			dropLabel: t("dropDuplicate"),
		},
		{ label: t("share"), icon: Link, onClick: copyLink },
		{ label: t("addText"), icon: Type, onClick: addText },
		{
			label: t("clear"),
			icon: Trash2,
			onClick: () => onFormatChange(""),
			dropId: DROP_TRASH,
			dropLabel: t("dropDelete"),
		},
	];

	return (
		<DndContext
			id="builder-dnd"
			sensors={sensors}
			collisionDetection={collisionDetection}
			onDragStart={({ active }) => setActiveId(String(active.id))}
			onDragOver={({ over }) => setOverId(over ? String(over.id) : null)}
			onDragEnd={handleDragEnd}
			onDragCancel={() => {
				setActiveId(null);
				setOverId(null);
			}}
			accessibility={accessibility}
		>
			<section className="flex flex-col gap-4 rounded-xl border-2 bg-card p-4 shadow-raised sm:p-6">
				<div className="flex flex-wrap items-center justify-between gap-2">
					<Label
						htmlFor="format-input"
						className="text-xs font-black tracking-wider uppercase"
					>
						{t("label")}
					</Label>
					<div className="flex gap-1.5">
						{actions.map(({ label, icon: Icon, onClick, dropId, dropLabel }) => {
							const button = (
								<Button
									variant="outline"
									size="icon"
									aria-label={label}
									onClick={onClick}
								>
									<Icon className="size-4" />
								</Button>
							);
							return dropId ? (
								<DropAction
									key={label}
									id={dropId}
									label={label}
									dropLabel={dropLabel as string}
								>
									{button}
								</DropAction>
							) : (
								<Tooltip key={label}>
									<TooltipTrigger asChild>{button}</TooltipTrigger>
									<TooltipContent>{label}</TooltipContent>
								</Tooltip>
							);
						})}
						<CodeExport format={format} />
					</div>
				</div>
				<Input
					id="format-input"
					value={format}
					onChange={(e) => onFormatChange(e.target.value)}
					placeholder={t("placeholder")}
					autoComplete="off"
					autoCorrect="off"
					autoCapitalize="off"
					spellCheck={false}
					className="h-12 font-mono text-base md:text-lg"
				/>
				{tokens.length === 0 ? (
					<p className="text-sm text-muted-foreground">{t("empty")}</p>
				) : (
					<SortableContext items={ids} strategy={rectSortingStrategy}>
						<div
							role="list"
							className="flex flex-wrap items-start gap-2"
							aria-label={t("dragHint")}
						>
							{tokens.map((token, index) => (
								<SortableChip
									key={ids[index]}
									id={ids[index]}
									token={token}
									value={date ? renderToken(token, date, locale) : null}
									dialect={dialect}
									onChange={(raw) => updateToken(index, raw)}
									onRemove={() => removeToken(index)}
									editTarget={
										editTarget?.id === ids[index] ? editTarget.nonce : null
									}
									wiggle={
										overIndex >= 0 &&
										ids[index] !== activeId &&
										Math.abs(index - overIndex) <= 1
									}
								/>
							))}
						</div>
					</SortableContext>
				)}
				{tokens.length > 0 && <PortabilityBar format={format} />}
			</section>
			<DragOverlay dropAnimation={null}>
				{activeToken ? (
					<OverlayChip
						token={activeToken}
						value={date ? renderToken(activeToken, date, locale) : null}
						dialect={dialect}
					/>
				) : null}
			</DragOverlay>
		</DndContext>
	);
}
