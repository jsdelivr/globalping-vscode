/**
 * Custom error classes for Globalping API
 * 
 * Provides structured error handling with specific error types
 * for different failure scenarios.
 */

export class GlobalpingError extends Error {
	constructor(message: string, public code?: string) {
		super(message);
		this.name = 'GlobalpingError';
		Object.setPrototypeOf(this, GlobalpingError.prototype);
	}
}

export class RateLimitError extends GlobalpingError {
	constructor(
		message: string,
		public retryAfter?: number,
		public limit?: number,
		public remaining?: number,
		public reset?: Date
	) {
		super(message, 'RATE_LIMIT');
		this.name = 'RateLimitError';
		Object.setPrototypeOf(this, RateLimitError.prototype);
	}
}

export class AuthenticationError extends GlobalpingError {
	constructor(message: string = 'Authentication required. Please add your API token in settings.') {
		super(message, 'AUTH_ERROR');
		this.name = 'AuthenticationError';
		Object.setPrototypeOf(this, AuthenticationError.prototype);
	}
}

export class ValidationError extends GlobalpingError {
	constructor(message: string, public field?: string) {
		super(message, 'VALIDATION_ERROR');
		this.name = 'ValidationError';
		Object.setPrototypeOf(this, ValidationError.prototype);
	}
}

export class NetworkError extends GlobalpingError {
	constructor(message: string = 'Cannot reach Globalping API. Check your internet connection.') {
		super(message, 'NETWORK_ERROR');
		this.name = 'NetworkError';
		Object.setPrototypeOf(this, NetworkError.prototype);
	}
}

export class TimeoutError extends GlobalpingError {
	constructor(message: string = 'Request timeout') {
		super(message, 'TIMEOUT_ERROR');
		this.name = 'TimeoutError';
		Object.setPrototypeOf(this, TimeoutError.prototype);
	}
}

export class ServerError extends GlobalpingError {
	constructor(message: string = 'Globalping API server error', public statusCode?: number) {
		super(message, 'SERVER_ERROR');
		this.name = 'ServerError';
		Object.setPrototypeOf(this, ServerError.prototype);
	}
}

