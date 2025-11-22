/**
 * Target Parser
 * 
 * Intelligently parses and extracts targets from text selections.
 * Handles URLs, domains, IP addresses, and various input formats.
 */

import * as ipaddr from 'ipaddr.js';
import { ParseResult } from '../types/measurement';

export class TargetParser {
	// Regex patterns
	private static readonly URL_PATTERN = /^(https?:\/\/)([^\s:/?#]+)(?::(\d+))?([^?\s]*)(\?[^\s]*)?$/i;
	private static readonly DOMAIN_PATTERN = /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z]{2,}$/;
	private static readonly IPV4_PATTERN = /^(\d{1,3}\.){3}\d{1,3}$/;
	private static readonly IPV6_PATTERN = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/;
	private static readonly MARKDOWN_LINK_PATTERN = /\[([^\]]+)\]\(([^)]+)\)/;

	// Localhost patterns
	private static readonly LOCALHOST_PATTERNS = ['localhost', '127.0.0.1', '::1', '0.0.0.0'];
	
	// Public tunnel domains
	private static readonly TUNNEL_DOMAINS = [
		'ngrok.io',
		'ngrok.app',
		'loca.lt',
		'localtunnel.me',
		'tunnelto.dev'
	];

	/**
	 * Parse text selection and extract target
	 */
	public parse(text: string): ParseResult {
		const rawInput = text;
		
		// Clean input
		text = this.cleanInput(text);

		if (!text) {
			return {
				isValid: false,
				target: '',
				isLocalhost: false,
				isPrivateIp: false,
				suggestedTestType: 'ping',
				confidence: 'low',
				rawInput
			};
		}

		// Try URL first
		const urlResult = this.parseUrl(text);
		if (urlResult) {
			return { ...urlResult, rawInput };
		}

		// Try domain
		const domainResult = this.parseDomain(text);
		if (domainResult) {
			return { ...domainResult, rawInput };
		}

		// Try IP address
		const ipResult = this.parseIpAddress(text);
		if (ipResult) {
			return { ...ipResult, rawInput };
		}

		// Invalid
		return {
			isValid: false,
			target: text,
			isLocalhost: false,
			isPrivateIp: false,
			suggestedTestType: 'ping',
			confidence: 'low',
			rawInput
		};
	}

	/**
	 * Clean input text
	 */
	private cleanInput(text: string): string {
		// Trim whitespace
		text = text.trim();

		// Extract from Markdown link
		const markdownMatch = text.match(TargetParser.MARKDOWN_LINK_PATTERN);
		if (markdownMatch) {
			text = markdownMatch[2]; // Use URL from Markdown link
		}

		// Remove surrounding quotes
		text = text.replace(/^["'](.*)["']$/, '$1');

		// Remove surrounding parentheses/brackets
		text = text.replace(/^[({[](.*)[\]})]$/, '$1');

		// Take first line if multi-line
		const lines = text.split('\n');
		text = lines[0].trim();

		// Limit length
		if (text.length > 1000) {
			return '';
		}

		return text;
	}

	/**
	 * Extract hostname from a target (URL or plain hostname/IP)
	 * Used for non-HTTP tests that need just the hostname
	 */
	public extractHostname(target: string): string {
		const match = target.match(TargetParser.URL_PATTERN);
		if (match) {
			// It's a URL - extract hostname (match[2])
			return match[2].toLowerCase();
		}
		// Not a URL - return as-is
		return target;
	}

	/**
	 * Parse URL
	 */
	private parseUrl(text: string): Omit<ParseResult, 'rawInput'> | null {
		const match = text.match(TargetParser.URL_PATTERN);
		if (!match) {
			return null;
		}

		const protocol = match[1].toLowerCase();
		const hostname = match[2].toLowerCase();

		// Check for invalid protocols
		if (!['http://', 'https://'].includes(protocol)) {
			return null;
		}

		const isLocal = this.isLocalhost(hostname);
		const isPrivate = !isLocal && this.isPrivateIp(hostname);

		// Check if it's a known tunnel domain
		const isTunnel = TargetParser.TUNNEL_DOMAINS.some(domain =>
			hostname.endsWith(domain)
		);

		return {
			isValid: true,
			target: text, // Keep full URL for HTTP tests
			isLocalhost: isLocal,
			isPrivateIp: isPrivate,
			suggestedTestType: 'http',
			confidence: isTunnel ? 'high' : isLocal || isPrivate ? 'medium' : 'high'
		};
	}

	/**
	 * Parse domain name
	 */
	private parseDomain(text: string): Omit<ParseResult, 'rawInput'> | null {
		if (!TargetParser.DOMAIN_PATTERN.test(text)) {
			return null;
		}

		const lower = text.toLowerCase();
		const isLocalDomain = lower === 'localhost' || lower.endsWith('.localhost') || lower.endsWith('.local');

		return {
			isValid: true,
			target: text,
			isLocalhost: isLocalDomain,
			isPrivateIp: false,
			suggestedTestType: 'ping', // Can also be used for DNS
			confidence: isLocalDomain ? 'medium' : 'high'
		};
	}

	/**
	 * Parse IP address (v4 or v6)
	 */
	private parseIpAddress(text: string): Omit<ParseResult, 'rawInput'> | null {
		try {
			const addr = ipaddr.parse(text);
			
			const range = addr.range();
			const isLocal = this.isLocalhost(text);
			const isPrivate = !isLocal && (range === 'private' || range === 'loopback' || range === 'linkLocal');

			return {
				isValid: true,
				target: text,
				isLocalhost: isLocal,
				isPrivateIp: isPrivate,
				suggestedTestType: 'ping',
				confidence: isPrivate || isLocal ? 'medium' : 'high'
			};
		} catch {
			// Not a valid IP
			return null;
		}
	}

	/**
	 * Check if hostname/IP is localhost
	 */
	private isLocalhost(host: string): boolean {
		return TargetParser.LOCALHOST_PATTERNS.includes(host.toLowerCase());
	}

	/**
	 * Check if IP is in private range
	 */
	private isPrivateIp(host: string): boolean {
		try {
			const addr = ipaddr.parse(host);
			
			if (addr.kind() === 'ipv4') {
				const range = (addr as ipaddr.IPv4).range();
				return range === 'private' || range === 'loopback' || range === 'linkLocal';
			}
			
			if (addr.kind() === 'ipv6') {
				const range = (addr as ipaddr.IPv6).range();
				return range === 'uniqueLocal' || range === 'loopback' || range === 'linkLocal';
			}
		} catch {
			// Not an IP address
		}

		return false;
	}
}

