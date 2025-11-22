/**
 * Telemetry/Logging Service
 * 
 * Provides structured logging with PII redaction for security.
 * Uses VS Code's LogOutputChannel for integration with VS Code's output panel.
 */

import * as vscode from 'vscode';

export enum LogLevel {
	DEBUG = 0,
	INFO = 1,
	WARN = 2,
	ERROR = 3
}

export class TelemetryService {
	private outputChannel: vscode.LogOutputChannel;
	private minLevel: LogLevel = LogLevel.INFO;

	constructor() {
		this.outputChannel = vscode.window.createOutputChannel('Globalping', { log: true });
	}

	/**
	 * Set the minimum log level
	 */
	public setLevel(level: LogLevel): void {
		this.minLevel = level;
	}

	/**
	 * Log a debug message
	 */
	public debug(message: string, data?: any): void {
		this.log(LogLevel.DEBUG, message, data);
	}

	/**
	 * Log an info message
	 */
	public info(message: string, data?: any): void {
		this.log(LogLevel.INFO, message, data);
	}

	/**
	 * Log a warning message
	 */
	public warn(message: string, data?: any): void {
		this.log(LogLevel.WARN, message, data);
	}

	/**
	 * Log an error message
	 */
	public error(message: string, error?: Error | any): void {
		this.log(LogLevel.ERROR, message, error);
	}

	/**
	 * Internal logging method with level filtering and sanitization
	 */
	private log(level: LogLevel, message: string, data?: any): void {
		if (level < this.minLevel) {
			return;
		}

		const sanitizedMessage = this.sanitize(message);
		const sanitizedData = data ? this.sanitize(JSON.stringify(data)) : '';

		const logMessage = `[${LogLevel[level]}] ${sanitizedMessage}${sanitizedData ? ` ${sanitizedData}` : ''}`;

		switch (level) {
			case LogLevel.DEBUG:
				this.outputChannel.debug(logMessage);
				break;
			case LogLevel.INFO:
				this.outputChannel.info(logMessage);
				break;
			case LogLevel.WARN:
				this.outputChannel.warn(logMessage);
				break;
			case LogLevel.ERROR:
				this.outputChannel.error(logMessage);
				break;
		}
	}

	/**
	 * Sanitize sensitive data from logs
	 * Redacts auth tokens, API keys, and other sensitive information
	 */
	private sanitize(text: string): string {
		// Redact auth tokens (Bearer xxx...)
		text = text.replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/g, 'Bearer [REDACTED]');
		
		// Redact API keys
		text = text.replace(/api[_-]?key[=:]\s*[A-Za-z0-9\-._~+/]+=*/gi, 'api_key=[REDACTED]');
		
		// Redact tokens in headers
		text = text.replace(/"(authorization|token|api-key)":\s*"[^"]*"/gi, '"$1":"[REDACTED]"');
		
		return text;
	}

	/**
	 * Show the output channel
	 */
	public show(): void {
		this.outputChannel.show();
	}

	/**
	 * Dispose of the output channel
	 */
	public dispose(): void {
		this.outputChannel.dispose();
	}
}

