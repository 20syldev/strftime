"use client";

import { useSyncExternalStore } from "react";

export interface SavedFormat {
	id: string;
	name: string;
	format: string;
	createdAt: number;
}

const KEY = "savedFormats";

// Stable reference for the server snapshot and every empty result, so
// useSyncExternalStore never sees a fresh array and loops forever.
const EMPTY: SavedFormat[] = [];

// Module-level store: one source of truth shared by every hook instance, with
// a cached snapshot so getSnapshot stays referentially stable between renders.
let cache: SavedFormat[] | null = null;
const listeners = new Set<() => void>();

function isSavedFormat(value: unknown): value is SavedFormat {
	return (
		typeof value === "object" &&
		value !== null &&
		typeof (value as SavedFormat).id === "string" &&
		typeof (value as SavedFormat).name === "string" &&
		typeof (value as SavedFormat).format === "string" &&
		typeof (value as SavedFormat).createdAt === "number"
	);
}

function read(): SavedFormat[] {
	try {
		const raw = window.localStorage.getItem(KEY);
		if (!raw) {
			return EMPTY;
		}
		const parsed: unknown = JSON.parse(raw);
		if (!Array.isArray(parsed)) {
			return EMPTY;
		}
		const items = parsed.filter(isSavedFormat);
		return items.length > 0 ? items : EMPTY;
	} catch {
		// Malformed JSON or unavailable storage: fall back to an empty library
		return EMPTY;
	}
}

function getSnapshot(): SavedFormat[] {
	if (cache === null) {
		cache = read();
	}
	return cache;
}

function getServerSnapshot(): SavedFormat[] {
	return EMPTY;
}

function emit(): void {
	for (const listener of listeners) {
		listener();
	}
}

function write(next: SavedFormat[]): void {
	cache = next;
	try {
		window.localStorage.setItem(KEY, JSON.stringify(next));
	} catch {
		// Persisting is best-effort (quota exceeded or private mode)
	}
	emit();
}

function handleStorage(event: StorageEvent): void {
	// Another tab edited the library; refresh from disk and re-render
	if (event.key === KEY || event.key === null) {
		cache = read();
		emit();
	}
}

function subscribe(onChange: () => void): () => void {
	if (listeners.size === 0) {
		window.addEventListener("storage", handleStorage);
	}
	listeners.add(onChange);
	return () => {
		listeners.delete(onChange);
		if (listeners.size === 0) {
			window.removeEventListener("storage", handleStorage);
		}
	};
}

function save(name: string, format: string): void {
	const item: SavedFormat = { id: crypto.randomUUID(), name, format, createdAt: Date.now() };
	write([...getSnapshot(), item]);
}

function remove(id: string): void {
	write(getSnapshot().filter((item) => item.id !== id));
}

function rename(id: string, name: string): void {
	write(getSnapshot().map((item) => (item.id === id ? { ...item, name } : item)));
}

function restore(item: SavedFormat): void {
	// Re-insert a just-deleted entry verbatim for the undo affordance
	if (getSnapshot().some((existing) => existing.id === item.id)) {
		return;
	}
	write([...getSnapshot(), item]);
}

function clear(): void {
	write(EMPTY);
}

function exportJson(): string {
	return JSON.stringify(getSnapshot(), null, 2);
}

function importJson(text: string): number {
	const parsed: unknown = JSON.parse(text);
	if (!Array.isArray(parsed)) {
		throw new Error("Expected an array of saved formats");
	}
	// Re-id every imported entry so re-importing never collides with existing ones
	const imported = parsed
		.filter(isSavedFormat)
		.map((item) => ({ ...item, id: crypto.randomUUID() }));
	if (imported.length === 0) {
		throw new Error("No valid saved formats found");
	}
	write([...getSnapshot(), ...imported]);
	return imported.length;
}

/**
 * Personal library of named strftime formats, persisted in localStorage and
 * kept in sync across tabs. Stays empty until mounted, so the gated studio
 * never mismatches on hydration.
 */
export function useSavedFormats() {
	const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
	return { items, save, remove, rename, restore, clear, exportJson, importJson };
}
