/**
 * UI helper utilities for consistent user interactions
 *
 * Provides reusable functions for common UI operations like:
 * - Opening external URLs
 * - Showing standardized error/warning messages
 * - Prompting for user actions
 *
 * Benefits:
 * - Consistent UX across the extension
 * - DRY (Don't Repeat Yourself)
 * - Single source of truth for user messaging
 */

import * as vscode from 'vscode';
import { URLS, COMMANDS, MESSAGES } from '../constants';

/**
 * Opens the Globalping token dashboard in browser
 */
export function openTokenDashboard(): void {
	vscode.env.openExternal(vscode.Uri.parse(URLS.TOKEN_DASHBOARD));
}

/**
 * Opens the issues page in browser
 */
export function openIssuesPage(): void {
	vscode.env.openExternal(vscode.Uri.parse(URLS.ISSUES));
}

/**
 * Opens measurement types documentation
 */
export function openMeasurementTypesDocs(): void {
	vscode.env.openExternal(vscode.Uri.parse(URLS.MEASUREMENT_TYPES_DOCS));
}

/**
 * Shows authentication error with standardized actions
 * @returns Promise that resolves when user makes a choice
 */
export async function showAuthenticationError(): Promise<void> {
	const action = await vscode.window.showErrorMessage(
		MESSAGES.AUTH.FAILED,
		MESSAGES.ACTIONS.UPDATE_TOKEN,
		MESSAGES.ACTIONS.GET_TOKEN,
		MESSAGES.ACTIONS.CANCEL
	);

	if (action === MESSAGES.ACTIONS.UPDATE_TOKEN) {
		vscode.commands.executeCommand(COMMANDS.SET_API_TOKEN);
	} else if (action === MESSAGES.ACTIONS.GET_TOKEN) {
		openTokenDashboard();
	}
}

/**
 * Shows rate limit error with standardized actions
 * @returns Promise that resolves when user makes a choice
 */
export async function showRateLimitError(): Promise<void> {
	const action = await vscode.window.showWarningMessage(
		MESSAGES.RATE_LIMIT.EXCEEDED,
		MESSAGES.ACTIONS.GET_TOKEN,
		MESSAGES.ACTIONS.ADD_TOKEN,
		MESSAGES.ACTIONS.OK
	);

	if (action === MESSAGES.ACTIONS.GET_TOKEN) {
		openTokenDashboard();
	} else if (action === MESSAGES.ACTIONS.ADD_TOKEN) {
		vscode.commands.executeCommand(COMMANDS.SET_API_TOKEN);
	}
}

/**
 * Shows rate limit warning when approaching limits
 * @param remaining Number of requests remaining
 * @param limit Total request limit
 * @param isAuthenticated Whether user has API token
 */
export async function showRateLimitWarning(
	remaining: number,
	limit: number,
	isAuthenticated: boolean
): Promise<void> {
	const percentRemaining = (remaining / limit) * 100;

	if (!isAuthenticated && percentRemaining < 20) {
		const action = await vscode.window.showWarningMessage(
			MESSAGES.RATE_LIMIT.WARNING_UNAUTH(remaining, limit),
			MESSAGES.ACTIONS.GET_TOKEN,
			MESSAGES.ACTIONS.ADD_TOKEN,
			MESSAGES.ACTIONS.DISMISS
		);

		if (action === MESSAGES.ACTIONS.GET_TOKEN) {
			openTokenDashboard();
		} else if (action === MESSAGES.ACTIONS.ADD_TOKEN) {
			vscode.commands.executeCommand(COMMANDS.SET_API_TOKEN);
		}
	} else if (isAuthenticated && percentRemaining < 10) {
		await vscode.window.showWarningMessage(
			MESSAGES.RATE_LIMIT.WARNING_AUTH(remaining, limit),
			MESSAGES.ACTIONS.OK
		);
	}
}

/**
 * Shows network error message
 */
export async function showNetworkError(): Promise<void> {
	await vscode.window.showErrorMessage(
		MESSAGES.ERRORS.NETWORK,
		MESSAGES.ACTIONS.OK
	);
}

/**
 * Shows timeout error with retry option
 * @returns 'Retry' if user wants to retry, undefined otherwise
 */
export async function showTimeoutError(): Promise<string | undefined> {
	return await vscode.window.showWarningMessage(
		MESSAGES.ERRORS.TIMEOUT,
		MESSAGES.ACTIONS.RETRY,
		MESSAGES.ACTIONS.OK
	);
}

/**
 * Shows validation error with learn more option
 * @param message Validation error message
 */
export async function showValidationError(message: string): Promise<void> {
	const action = await vscode.window.showErrorMessage(
		MESSAGES.ERRORS.VALIDATION(message),
		MESSAGES.ACTIONS.LEARN_MORE,
		MESSAGES.ACTIONS.OK
	);

	if (action === MESSAGES.ACTIONS.LEARN_MORE) {
		openMeasurementTypesDocs();
	}
}

/**
 * Shows server error message
 * @param message Server error details
 */
export async function showServerError(message: string): Promise<void> {
	await vscode.window.showErrorMessage(
		MESSAGES.ERRORS.SERVER(message),
		MESSAGES.ACTIONS.OK
	);
}

/**
 * Shows initialization error with retry and report options
 * @param message Error details
 */
export async function showInitializationError(message: string): Promise<void> {
	const action = await vscode.window.showErrorMessage(
		MESSAGES.ERRORS.INIT_FAILED(message),
		MESSAGES.ACTIONS.RETRY,
		MESSAGES.ACTIONS.REPORT_ISSUE,
		MESSAGES.ACTIONS.OK
	);

	if (action === MESSAGES.ACTIONS.REPORT_ISSUE) {
		openIssuesPage();
	}
}

/**
 * Shows generic error message
 * @param message Error details
 */
export async function showGenericError(message: string): Promise<void> {
	await vscode.window.showErrorMessage(
		MESSAGES.ERRORS.TEST_FAILED(message),
		MESSAGES.ACTIONS.OK
	);
}
