"use client";

import * as React from "react";
import { Tooltip as TooltipPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

const LONG_PRESS_MS = 450;
const MOVE_TOLERANCE = 10;

function TooltipProvider({
	delayDuration = 0,
	...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
	return (
		<TooltipPrimitive.Provider
			data-slot="tooltip-provider"
			delayDuration={delayDuration}
			{...props}
		/>
	);
}

/** Touch handlers shared from {@link Tooltip} down to {@link TooltipTrigger}. */
interface TouchBinding {
	onPointerDown: React.PointerEventHandler;
	onPointerMove: React.PointerEventHandler;
	onPointerUp: React.PointerEventHandler;
	onPointerCancel: React.PointerEventHandler;
	onPointerLeave: React.PointerEventHandler;
	onContextMenu: React.MouseEventHandler;
	onClickCapture: React.MouseEventHandler;
}

const TooltipTouchContext = React.createContext<TouchBinding | null>(null);

function compose<E>(a: ((event: E) => void) | undefined, b: ((event: E) => void) | undefined) {
	return (event: E) => {
		a?.(event);
		b?.(event);
	};
}

/**
 * Tooltip root that also reveals on touch long-press: holding a trigger ~450ms
 * opens the tooltip without selecting text, and the next tap anywhere dismisses
 * it. A quick tap behaves as a normal click, so insert/copy actions still fire.
 */
function Tooltip({
	open: _open,
	onOpenChange,
	...props
}: React.ComponentProps<typeof TooltipPrimitive.Root>) {
	const [open, setOpen] = React.useState(false);
	const touchMode = React.useRef(false);
	const longPressed = React.useRef(false);
	const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
	const start = React.useRef<{ x: number; y: number } | null>(null);

	const setOpenSafe = React.useCallback(
		(value: boolean) => {
			onOpenChange?.(value);
			setOpen(value);
		},
		[onOpenChange],
	);

	const cancelTimer = React.useCallback(() => {
		if (timer.current) {
			clearTimeout(timer.current);
			timer.current = null;
		}
	}, []);

	// Ignore Radix hover/focus open requests during a touch session — touch is
	// driven entirely by the long-press handlers below.
	const handleOpenChange = React.useCallback(
		(value: boolean) => {
			if (touchMode.current) {
				return;
			}
			setOpenSafe(value);
		},
		[setOpenSafe],
	);

	const binding = React.useMemo<TouchBinding>(
		() => ({
			onPointerDown: (event) => {
				if (event.pointerType !== "touch") {
					return;
				}
				touchMode.current = true;
				longPressed.current = false;
				start.current = { x: event.clientX, y: event.clientY };
				cancelTimer();
				timer.current = setTimeout(() => {
					longPressed.current = true;
					setOpenSafe(true);
				}, LONG_PRESS_MS);
			},
			onPointerMove: (event) => {
				if (!start.current) {
					return;
				}
				const dx = event.clientX - start.current.x;
				const dy = event.clientY - start.current.y;
				if (Math.hypot(dx, dy) > MOVE_TOLERANCE) {
					cancelTimer();
				}
			},
			onPointerUp: () => {
				cancelTimer();
				if (!longPressed.current) {
					touchMode.current = false;
				}
			},
			onPointerCancel: () => {
				cancelTimer();
				touchMode.current = false;
			},
			onPointerLeave: () => {
				cancelTimer();
			},
			onContextMenu: (event) => {
				if (touchMode.current) {
					event.preventDefault();
				}
			},
			onClickCapture: (event) => {
				// Swallow the click that follows a long-press so it does not insert.
				if (longPressed.current) {
					event.preventDefault();
					event.stopPropagation();
					longPressed.current = false;
				}
			},
		}),
		[cancelTimer, setOpenSafe],
	);

	// Dismiss a touch-opened tooltip on the next tap anywhere.
	React.useEffect(() => {
		if (!open || !touchMode.current) {
			return;
		}
		const dismiss = () => {
			touchMode.current = false;
			setOpenSafe(false);
		};
		const id = setTimeout(() => {
			document.addEventListener("pointerdown", dismiss, { capture: true });
		}, 10);
		return () => {
			clearTimeout(id);
			document.removeEventListener("pointerdown", dismiss, { capture: true });
		};
	}, [open, setOpenSafe]);

	return (
		<TooltipTouchContext.Provider value={binding}>
			<TooltipPrimitive.Root
				data-slot="tooltip"
				open={open}
				onOpenChange={handleOpenChange}
				{...props}
			/>
		</TooltipTouchContext.Provider>
	);
}

function TooltipTrigger({
	className,
	onPointerDown,
	onPointerMove,
	onPointerUp,
	onPointerCancel,
	onPointerLeave,
	onContextMenu,
	onClickCapture,
	...props
}: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
	const touch = React.useContext(TooltipTouchContext);
	return (
		<TooltipPrimitive.Trigger
			data-slot="tooltip-trigger"
			className={cn("touch-manipulation select-none [-webkit-touch-callout:none]", className)}
			onPointerDown={compose(touch?.onPointerDown, onPointerDown)}
			onPointerMove={compose(touch?.onPointerMove, onPointerMove)}
			onPointerUp={compose(touch?.onPointerUp, onPointerUp)}
			onPointerCancel={compose(touch?.onPointerCancel, onPointerCancel)}
			onPointerLeave={compose(touch?.onPointerLeave, onPointerLeave)}
			onContextMenu={compose(touch?.onContextMenu, onContextMenu)}
			onClickCapture={compose(touch?.onClickCapture, onClickCapture)}
			{...props}
		/>
	);
}

function TooltipContent({
	className,
	sideOffset = 0,
	children,
	...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
	return (
		<TooltipPrimitive.Portal>
			<TooltipPrimitive.Content
				data-slot="tooltip-content"
				sideOffset={sideOffset}
				className={cn(
					"z-50 w-fit origin-(--radix-tooltip-content-transform-origin) animate-in rounded-md bg-foreground px-3 py-1.5 text-xs text-balance text-background fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
					className,
				)}
				{...props}
			>
				{children}
				<TooltipPrimitive.Arrow className="z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px] bg-foreground fill-foreground" />
			</TooltipPrimitive.Content>
		</TooltipPrimitive.Portal>
	);
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
