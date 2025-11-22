/**
 * Centralizes all magic strings and constants used throughout the extension.
 *
 * IMPORTANT: Any hardcoded string that appears in multiple places should be here.
 * This prevents duplication and makes updates easier (single source of truth).
 */

/**
 * External URLs used in the extension
 */
export const URLS = {
	/** Globalping dashboard for getting API tokens */
	TOKEN_DASHBOARD: 'https://dash.globalping.io/',

	/** Extension issues tracker */
	ISSUES: 'https://github.com/jsdelivr/globalping-vscode/issues',

	/** Globalping API documentation - measurement types */
	MEASUREMENT_TYPES_DOCS: 'https://github.com/jsdelivr/globalping',

	/** Main Globalping website */
	GLOBALPING_WEBSITE: 'https://globalping.io/',

	/** Documentation for testing localhost */
	TESTING_LOCALHOST_DOCS: 'https://github.com/jsdelivr/globalping-probe?tab=readme-ov-file#security',
} as const;

/**
 * VS Code command identifiers
 * These must match exactly with package.json contributions
 */
export const COMMANDS = {
	RUN_NEW_TEST: 'globalping.runNewTest',
	RUN_LAST_TEST: 'globalping.runLastTest',
	SET_API_TOKEN: 'globalping.setApiToken',
	REMOVE_API_TOKEN: 'globalping.removeApiToken',
	OPEN_SETTINGS: 'globalping.openSettings',
	VIEW_HISTORY: 'globalping.viewHistory',
	CLEAR_HISTORY: 'globalping.clearHistory',
	OPEN_HISTORY_RESULT: 'globalping.openHistoryResult',
	RERUN_HISTORY_TEST: 'globalping.rerunHistoryTest',
	LOAD_SAVED_TEST: 'globalping.loadSavedTest',
	DELETE_SAVED_TEST: 'globalping.deleteSavedTest',
	SAVE_TEST: 'globalping.saveTest',
	OPEN_LAST_RESULT: 'globalping.openLastResult',
	SHOW_OUTPUT_CHANNEL: 'globalping.showOutputChannel',
	CONTEXT_TEST_PING: 'globalping.contextTest.ping',
	CONTEXT_TEST_HTTP: 'globalping.contextTest.http',
	CONTEXT_TEST_DNS: 'globalping.contextTest.dns',
	CONTEXT_TEST_TRACEROUTE: 'globalping.contextTest.traceroute',
	CONTEXT_TEST_MTR: 'globalping.contextTest.mtr',
} as const;

/**
 * User-facing messages for consistency across the extension
 */
export const MESSAGES = {
	AUTH: {
		/** Error when token is invalid */
		INVALID_TOKEN: 'Invalid API token. Please check your token and try again.',

		/** Prompt when authentication fails */
		FAILED: 'Authentication failed. Would you like to update your API token?',

		/** Confirmation when token is saved */
		TOKEN_SAVED: '✅ API token saved! To view or change it later, run "Globalping: Set API Token" from the Command Palette.',

		/** Confirmation when token is removed */
		TOKEN_REMOVED: '✅ Globalping API token removed',

		/** Confirmation prompt before removing token */
		CONFIRM_REMOVE: 'Remove Globalping API token? You will be limited to unauthenticated rate limits.',

		/** Prompt for entering token */
		ENTER_TOKEN: 'Enter your Globalping API token (stored securely in VS Code)',

		/** Placeholder text showing where to get token */
		get TOKEN_PLACEHOLDER() {
			return `Get your token from ${URLS.TOKEN_DASHBOARD}`;
		},

		/** Token validation error */
		TOKEN_EMPTY: 'Token cannot be empty',
	},

	RATE_LIMIT: {
		/** Error when rate limit is exceeded */
		EXCEEDED: 'Rate limit exceeded. Add an API token for unlimited access.',

		/** Warning when approaching rate limit (unauthenticated) */
		WARNING_UNAUTH: (remaining: number, limit: number) =>
			`⚠️ Globalping: Only ${remaining}/${limit} credits remaining. Add an API token for unlimited access.`,

		/** Warning when approaching rate limit (authenticated) */
		WARNING_AUTH: (remaining: number, limit: number) =>
			`⚠️ Globalping: Only ${remaining}/${limit} requests remaining.`,

		/** Display current rate limits info */
		INFO: (remaining: number, limit: number) =>
			`Rate Limits: ${remaining}/${limit} requests remaining`,
	},

	ERRORS: {
		/** Network connection error */
		NETWORK: 'Network error: Check your internet connection and try again.',

		/** Request timeout error */
		TIMEOUT: 'Test timed out. The target may be slow or unreachable.',

		/** Validation error with custom message */
		VALIDATION: (msg: string) => `Invalid input: ${msg}`,

		/** Token validation failed */
		TOKEN_VALIDATION_FAILED: (error: string) => `Failed to validate token: ${error}`,

		/** Generic test failure */
		TEST_FAILED: (msg: string) => `Test failed: ${msg}`,

		/** Unknown error fallback */
		UNKNOWN: 'An unknown error occurred. Please try again.',

		/** Server error */
		SERVER: (msg: string) => `Globalping API error: ${msg}. Please try again later.`,

		/** Initialization error */
		INIT_FAILED: (msg: string) => `Failed to initialize Globalping: ${msg}`,

		/** Failed to fetch rate limits */
		RATE_LIMITS_FETCH_FAILED: 'Token saved, but failed to fetch rate limits. Please try again later.',

		/** No test results available */
		NO_RESULTS: 'No test results available',

		/** No active editor */
		NO_ACTIVE_EDITOR: 'No active editor',

		/** No target selected */
		NO_SELECTION: 'Please select a target (URL, domain, or IP address)',

		/** Localhost cannot be tested */
		LOCALHOST_NOT_TESTABLE: 'Cannot test localhost from external probes. Did you mean to test a tunnel URL (e.g., ngrok)?',

		/** Private IP cannot be tested */
		PRIVATE_IP_NOT_TESTABLE: 'Cannot test private IP addresses from external probes',

		/** Invalid target format */
		INVALID_TARGET: (selection: string) => `Cannot parse "${selection}" as a valid target. Expected: domain, IP, or URL.`,

		/** Invalid target generic */
		INVALID_TARGET_GENERIC: 'Invalid target',

		/** No previous tests */
		NO_PREVIOUS_TESTS: 'No previous tests found',

		/** Failed to re-run test */
		RERUN_FAILED: (msg: string) => `Failed to re-run test: ${msg}`,

		/** Failed to run test */
		RUN_FAILED: (msg: string) => `Failed to run test: ${msg}`,

		/** Failed to save test */
		SAVE_FAILED: (msg: string) => `Failed to save test: ${msg}`,
	},

	ACTIONS: {
		/** Button labels */
		GET_TOKEN: 'Get Token',
		ADD_TOKEN: 'Add Token',
		UPDATE_TOKEN: 'Update Token',
		REMOVE: 'Remove',
		CANCEL: 'Cancel',
		OK: 'OK',
		RETRY: 'Retry',
		DISMISS: 'Dismiss',
		CHECK_LIMITS: 'Check Limits',
		LEARN_MORE: 'Learn More',
		REPORT_ISSUE: 'Report Issue',
		RUN_TEST: 'Run Test',
		SAVE: 'Save',
		YES: 'Yes',
		NO: 'No',
	},

	SUCCESS: {
		/** Test saved successfully */
		TEST_SAVED: (name: string) => `Saved "${name}" to favorites`,

		/** No test to save */
		NO_TEST_TO_SAVE: 'No recent test to save. Run a test first.',
	},

	PROMPTS: {
		/** Confirm re-run test */
		CONFIRM_RERUN: (testType: string, target: string) => `Re-run ${testType} test on ${target}?`,

		/** Save test name prompt */
		SAVE_TEST_NAME: 'Enter a name for this saved test',

		/** Save test placeholder */
		SAVE_TEST_PLACEHOLDER: (testType: string, target: string) => `${testType} - ${target}`,

		/** Save test title */
		SAVE_TEST_TITLE: 'Save Test',
	},

	VALIDATION: {
		/** Name is required */
		NAME_REQUIRED: 'Name is required',

		/** Name too long */
		NAME_TOO_LONG: 'Name must be 50 characters or less',
	},
} as const;

/**
 * Configuration keys
 */
export const CONFIG = {
	/** Configuration section name */
	SECTION: 'globalping',

	/** Configuration keys under the globalping section */
	KEYS: {
		DEFAULT_LOCATION: 'defaultLocation',
		DEFAULT_LIMIT: 'defaultLimit',
		IN_PROGRESS_UPDATES: 'inProgressUpdates',
		RAW_RESULTS: 'rawResults',
		DEFAULT_HTTP_PROTOCOL: 'defaultHttpProtocol',
	},

	/** Secrets storage keys */
	SECRETS: {
		AUTH_TOKEN: 'globalping.authToken',
	},
} as const;

/**
 * View identifiers
 */
export const VIEWS = {
	AUTHENTICATION: 'globalping.authentication',
	TEST_RUNNER: 'globalping.testRunner',
	HISTORY: 'globalping.history',
	SAVED_TESTS: 'globalping.savedTests',
} as const;

/**
 * Output channel names
 */
export const OUTPUT_CHANNELS = {
	RESULTS: 'Globalping Results',
	LOGS: 'Globalping',
} as const;
