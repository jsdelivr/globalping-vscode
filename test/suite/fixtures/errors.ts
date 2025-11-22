/**
 * Error Response Fixtures
 * 
 * Predefined error responses for testing error handling scenarios.
 */

/**
 * Rate limit error response (429)
 */
export const rateLimitError = {
	response: {
		status: 429,
		data: {
			error: {
				message: 'Rate limit exceeded. Please try again later.',
				type: 'rate_limit_error'
			}
		},
		headers: {
			'retry-after': '60',
			'x-ratelimit-limit': '100',
			'x-ratelimit-remaining': '0',
			'x-ratelimit-reset': String(Date.now() / 1000 + 3600)
		}
	},
	message: 'Rate limit exceeded'
};

/**
 * Authentication error response (401)
 */
export const authenticationError = {
	response: {
		status: 401,
		data: {
			error: {
				message: 'Invalid API token',
				type: 'authentication_error'
			}
		}
	},
	message: 'Authentication failed'
};

/**
 * Validation error response (400)
 */
export const validationError = {
	response: {
		status: 400,
		data: {
			error: {
				message: 'Invalid target: not a valid domain or IP address',
				type: 'validation_error'
			}
		}
	},
	message: 'Validation failed'
};

/**
 * Server error response (500)
 */
export const serverError = {
	response: {
		status: 500,
		data: {
			error: {
				message: 'Internal server error',
				type: 'server_error'
			}
		}
	},
	message: 'Server error'
};

/**
 * Network error (no response)
 */
export const networkError = {
	code: 'ECONNREFUSED',
	message: 'Network error: Connection refused'
};

/**
 * Timeout error
 */
export const timeoutError = {
	code: 'ETIMEDOUT',
	message: 'Request timeout'
};

/**
 * Not found error (404)
 */
export const notFoundError = {
	response: {
		status: 404,
		data: {
			error: {
				message: 'Measurement not found',
				type: 'not_found_error'
			}
		}
	},
	message: 'Not found'
};

/**
 * Forbidden error (403)
 */
export const forbiddenError = {
	response: {
		status: 403,
		data: {
			error: {
				message: 'Access forbidden',
				type: 'forbidden_error'
			}
		}
	},
	message: 'Forbidden'
};

