export function unwrapResultObject<T = any>(value: T): T {
	let current: any = value;
	const seen = new Set<any>();

	while (
		current &&
		typeof current === 'object' &&
		'result' in current &&
		current.result &&
		!seen.has(current.result)
	) {
		seen.add(current);
		current = current.result;
	}

	return current;
}

/**
 * Calculate visual width of a string, accounting for emojis and multi-byte characters
 * Emojis typically take 2 visual spaces in monospace terminals
 */
export function getVisualWidth(str: string): number {
	let width = 0;
	for (const char of str) {
		const code = char.codePointAt(0) || 0;
		// Emojis and other wide characters
		if (code > 0x1F300 || (code >= 0x2600 && code <= 0x26FF) || (code >= 0x2700 && code <= 0x27BF)) {
			width += 2; // Emoji takes 2 visual spaces
		} else {
			width += 1;
		}
	}
	return width;
}

/**
 * Truncate a string to a maximum visual width, adding ellipsis if needed
 * Preserves visual alignment by accounting for emoji widths
 */
export function truncateString(str: string, maxWidth: number): string {
	const visualWidth = getVisualWidth(str);

	if (visualWidth <= maxWidth) {
		return str;
	}

	// Need to truncate - build string char by char until we hit the limit
	let truncated = '';
	let currentWidth = 0;
	const ellipsis = '...';
	const ellipsisWidth = 3;
	const targetWidth = maxWidth - ellipsisWidth;

	for (const char of str) {
		const code = char.codePointAt(0) || 0;
		const charWidth = (code > 0x1F300 || (code >= 0x2600 && code <= 0x26FF) || (code >= 0x2700 && code <= 0x27BF)) ? 2 : 1;

		if (currentWidth + charWidth > targetWidth) {
			break;
		}

		truncated += char;
		currentWidth += charWidth;
	}

	return truncated + ellipsis;
}

/**
 * Pad a string to the right to reach target visual width
 * Automatically truncates if string exceeds target width
 */
export function padRight(str: string, targetWidth: number): string {
	// First truncate if needed
	const truncated = truncateString(str, targetWidth);
	const visualWidth = getVisualWidth(truncated);
	const padding = Math.max(0, targetWidth - visualWidth);
	return truncated + ' '.repeat(padding);
}

/**
 * Pad a string to the left to reach target visual width
 */
export function padLeft(str: string, targetWidth: number): string {
	const truncated = truncateString(str, targetWidth);
	const visualWidth = getVisualWidth(truncated);
	const padding = Math.max(0, targetWidth - visualWidth);
	return ' '.repeat(padding) + truncated;
}

/**
 * Format probe location for NORMAL formatters
 * Pattern: "City, Country - Network"
 * Example: "Falkenstein, DE - Hetzner Online"
 */
export function formatLocation(probe: any): string {
	if (!probe) {
		return 'Unknown';
	}

	const locationParts: string[] = [];

	// Build "City, Country" part
	if (probe.city) {
		locationParts.push(probe.city);
	}
	if (probe.country) {
		locationParts.push(probe.country);
	}

	// If no city/country, use continent as fallback
	if (locationParts.length === 0 && probe.continent) {
		locationParts.push(probe.continent);
	}

	const location = locationParts.length > 0 ? locationParts.join(', ') : 'Unknown';

	// Add ISP/Network if available
	if (probe.network) {
		return `${location} - ${probe.network}`;
	}

	return location;
}

/**
 * Format probe location for RAW formatters (matches Globalping CLI format)
 * Pattern: "> City, Country, Continent, Network (ASN), tags"
 * Example: "> Falkenstein, DE, EU, Hetzner Online (AS24940), u-zGato"
 */
export function formatRawLocation(probe: any): string {
	if (!probe) {
		return '> Unknown Location';
	}

	const parts: string[] = [];

	// City (optional but preferred)
	if (probe.city) {
		parts.push(probe.city);
	}

	// Country (required)
	if (probe.country) {
		parts.push(probe.country);
	}

	// Continent (required)
	if (probe.continent) {
		parts.push(probe.continent);
	}

	// Network with ASN (required)
	if (probe.network && probe.asn) {
		parts.push(`${probe.network} (AS${probe.asn})`);
	} else if (probe.network) {
		parts.push(probe.network);
	} else if (probe.asn) {
		parts.push(`AS${probe.asn}`);
	}

	// Tags (optional)
	if (probe.tags && Array.isArray(probe.tags) && probe.tags.length > 0) {
		// Filter out common system tags that aren't user-relevant
		const userTags = probe.tags.filter((tag: string) =>
			!tag.startsWith('system-') &&
			!tag.startsWith('datacenter-')
		);
		if (userTags.length > 0) {
			parts.push(...userTags);
		}
	}

	// If no parts were collected, the probe object is effectively empty
	if (parts.length === 0) {
		return '> Unknown Location';
	}

	return '> ' + parts.join(', ');
}

