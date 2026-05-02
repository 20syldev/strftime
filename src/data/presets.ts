// Curated format presets, names come from the i18n messages under "presets.names"

export interface Preset {
	key: string;
	format: string;
}

export const PRESETS: Preset[] = [
	{ key: "iso8601", format: "%Y-%m-%dT%H:%M:%S%:z" },
	{ key: "isoDate", format: "%F" },
	{ key: "isoWeekDate", format: "%G-W%V-%u" },
	{ key: "rfc2822", format: "%a, %d %b %Y %H:%M:%S %z" },
	{ key: "log", format: "%Y-%m-%d %H:%M:%S" },
	{ key: "filename", format: "%Y%m%d-%H%M%S" },
	{ key: "fullText", format: "%A %e %B %Y" },
	{ key: "usDate", format: "%m/%d/%Y" },
	{ key: "euDate", format: "%d/%m/%Y" },
	{ key: "time24", format: "%H:%M" },
	{ key: "time12", format: "%I:%M %p" },
	{ key: "epoch", format: "%s" },
];
