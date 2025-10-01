export interface RetryOptions {
	maxAttempts?: number;
	delayMs?: number;
	backoffMultiplier?: number;
	onRetry?: (error: Error, attempt: number) => void;
}

export async function withRetry<T>(
	fn: () => Promise<T>,
	options: RetryOptions = {}
): Promise<T> {
	const {
		maxAttempts = 3,
		delayMs = 1000,
		backoffMultiplier = 2,
		onRetry
	} = options;

	let lastError: Error;
	
	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		try {
			return await fn();
		} catch (error) {
			lastError = error as Error;
			
			if (attempt === maxAttempts) {
				break;
			}

			const errorMessage = lastError.message.toLowerCase();
			const isRetryable = 
				errorMessage.includes('timeout') ||
				errorMessage.includes('network') ||
				errorMessage.includes('econnreset') ||
				errorMessage.includes('enotfound') ||
				errorMessage.includes('503') ||
				errorMessage.includes('502') ||
				errorMessage.includes('429');

			if (!isRetryable) {
				throw lastError;
			}

			const delay = delayMs * Math.pow(backoffMultiplier, attempt - 1);
			onRetry?.(lastError, attempt);
			
			await new Promise(resolve => setTimeout(resolve, delay));
		}
	}

	throw lastError!;
}
