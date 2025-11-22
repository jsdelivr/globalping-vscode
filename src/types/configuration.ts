/**
 * Extension configuration types
 * 
 * Types for extension settings, rate limiting, and probe filtering.
 */

/**
 * Extension configuration from VS Code settings
 */
export interface GlobalpingConfig {
	defaultLocation: string;
	defaultLimit: number;
	inProgressUpdates: boolean;
	rawResults: boolean;
	defaultHttpProtocol: 'HTTP' | 'HTTPS';
}

/**
 * Rate limit information from API responses
 */
export interface RateLimitInfo {
	limit: number;
	remaining: number;
	reset: Date;
	isAuthenticated?: boolean;
	credits?: number;  // Available credits (authenticated users only)
}

/**
 * Filters for querying probes
 */
export interface ProbeFilters {
	continent?: string;
	country?: string;
	city?: string;
	tags?: string[];
	status?: 'online' | 'offline';
}

