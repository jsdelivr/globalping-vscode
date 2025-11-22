/**
 * Error Handler Utility
 *
 * Provides centralized, user-friendly error handling with specific error types.
 * Converts technical errors into actionable user messages with recovery options.
 */

import * as vscode from 'vscode';
import {
	GlobalpingError,
	ValidationError,
	NetworkError,
	TimeoutError,
	AuthenticationError,
	RateLimitError,
	ServerError
} from './errors';
import { MESSAGES } from '../constants';
import * as ui from '../utils/ui';

export class ErrorHandler {
	/**
	 * Handle test execution errors with user-friendly messages
	 */
	public static async handleTestError(error: unknown): Promise<void> {
		if (error instanceof ValidationError) {
			await ui.showValidationError(error.message);
		} else if (error instanceof NetworkError) {
			await ui.showNetworkError();
		} else if (error instanceof TimeoutError) {
			await ui.showTimeoutError();
			// Return action for caller to handle retry
			return;
		} else if (error instanceof AuthenticationError) {
			await ui.showAuthenticationError();
		} else if (error instanceof RateLimitError) {
			await ui.showRateLimitError();
		} else if (error instanceof ServerError) {
			await ui.showServerError(error.message);
		} else if (error instanceof Error) {
			await ui.showGenericError(error.message);
		} else {
			await vscode.window.showErrorMessage(
				MESSAGES.ERRORS.UNKNOWN,
				MESSAGES.ACTIONS.OK
			);
		}
	}

	/**
	 * Handle initialization errors
	 */
	public static async handleInitializationError(error: unknown): Promise<void> {
		const message = error instanceof Error ? error.message : 'Unknown error';
		await ui.showInitializationError(message);
	}

	/**
	 * Handle rate limit warnings (proactive)
	 */
	public static async handleRateLimitWarning(
		remaining: number,
		limit: number,
		isAuthenticated: boolean
	): Promise<void> {
		await ui.showRateLimitWarning(remaining, limit, isAuthenticated);
	}

	/**
	 * Format error for telemetry (removes sensitive data)
	 */
	public static formatErrorForTelemetry(error: unknown): any {
		if (error instanceof GlobalpingError) {
			return {
				name: error.name,
				code: error.code,
				// Don't include full message (may contain user data)
				hasMessage: !!error.message
			};
		}

		if (error instanceof Error) {
			return {
				name: error.name,
				hasMessage: !!error.message,
				stack: error.stack?.split('\n').slice(0, 3).join('\n') // First 3 lines only
			};
		}

		return {
			type: typeof error,
			value: String(error).substring(0, 100) // Truncate
		};
	}

	/**
	 * Get user-friendly error title for notifications
	 */
	public static getErrorTitle(error: unknown): string {
		if (error instanceof ValidationError) {
			return 'Invalid Input';
		}
		if (error instanceof NetworkError) {
			return 'Network Error';
		}
		if (error instanceof TimeoutError) {
			return 'Request Timeout';
		}
		if (error instanceof AuthenticationError) {
			return 'Authentication Failed';
		}
		if (error instanceof RateLimitError) {
			return 'Rate Limit Exceeded';
		}
		if (error instanceof ServerError) {
			return 'Server Error';
		}
		if (error instanceof GlobalpingError) {
			return 'Globalping Error';
		}
		if (error instanceof Error) {
			return 'Error';
		}
		return 'Unknown Error';
	}

	/**
	 * Check if error is retryable
	 */
	public static isRetryable(error: unknown): boolean {
		return (
			error instanceof NetworkError ||
			error instanceof TimeoutError ||
			error instanceof ServerError
		);
	}

	/**
	 * Check if error requires user action
	 */
	public static requiresUserAction(error: unknown): boolean {
		return (
			error instanceof ValidationError ||
			error instanceof AuthenticationError
		);
	}
}
