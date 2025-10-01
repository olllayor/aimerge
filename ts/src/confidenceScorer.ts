import { ConfidenceScore, ConflictBlock, ConflictClassification } from './types.js';

/**
 * Calculate confidence score for AI resolution
 * Considers multiple factors to determine how reliable the resolution is
 */
export function calculateConfidence(
	resolution: string,
	conflict: ConflictBlock,
	classification: ConflictClassification,
): ConfidenceScore {
	const reasons: string[] = [];
	let score = 0.5; // Start with neutral score

	// Factor 1: Conflict classification
	const classificationScore = getClassificationScore(classification);
	score += classificationScore.adjustment;
	if (classificationScore.reason) {
		reasons.push(classificationScore.reason);
	}

	// Factor 2: Resolution length appropriateness
	const lengthScore = assessResolutionLength(resolution, conflict);
	score += lengthScore.adjustment;
	if (lengthScore.reason) {
		reasons.push(lengthScore.reason);
	}

	// Factor 3: Code structure preservation
	const structureScore = assessStructurePreservation(resolution, conflict);
	score += structureScore.adjustment;
	if (structureScore.reason) {
		reasons.push(structureScore.reason);
	}

	// Factor 4: Syntax validity
	const syntaxScore = assessSyntaxValidity(resolution, conflict.filePath);
	score += syntaxScore.adjustment;
	if (syntaxScore.reason) {
		reasons.push(syntaxScore.reason);
	}

	// Factor 5: Content preservation
	const preservationScore = assessContentPreservation(resolution, conflict);
	score += preservationScore.adjustment;
	if (preservationScore.reason) {
		reasons.push(preservationScore.reason);
	}

	// Factor 6: Check for AI confusion markers
	const confusionScore = checkForConfusionMarkers(resolution);
	score += confusionScore.adjustment;
	if (confusionScore.reason) {
		reasons.push(confusionScore.reason);
	}

	// Clamp score to [0, 1]
	score = Math.max(0, Math.min(1, score));

	// Determine level
	const level = getConfidenceLevel(score);

	// Require approval for low confidence or dangerous conflicts
	const requiresApproval = level === 'low' || classification === 'logic-collision';

	return {
		score,
		level,
		reasons,
		requiresApproval,
	};
}

/**
 * Get confidence level from score
 */
function getConfidenceLevel(score: number): ConfidenceScore['level'] {
	if (score >= 0.75) return 'high';
	if (score >= 0.5) return 'medium';
	return 'low';
}

/**
 * Score based on conflict classification
 */
function getClassificationScore(classification: ConflictClassification): { adjustment: number; reason?: string } {
	switch (classification) {
		case 'trivial':
			return { adjustment: 0.3, reason: 'Trivial conflict (high confidence)' };
		case 'semantic':
			return { adjustment: 0.1, reason: 'Semantic conflict (moderate confidence)' };
		case 'logic-collision':
			return { adjustment: -0.2, reason: 'Logic collision detected (requires careful review)' };
		case 'unknown':
			return { adjustment: -0.1, reason: 'Unknown conflict type' };
	}
}

/**
 * Assess if resolution length is appropriate
 */
function assessResolutionLength(resolution: string, conflict: ConflictBlock): { adjustment: number; reason?: string } {
	const currentLength = conflict.current.trim().length;
	const incomingLength = conflict.incoming.trim().length;
	const resolutionLength = resolution.trim().length;

	const avgLength = (currentLength + incomingLength) / 2;

	// Resolution should be roughly in the same ballpark
	if (resolutionLength === 0) {
		return { adjustment: -0.3, reason: 'Empty resolution' };
	}

	if (resolutionLength > avgLength * 3) {
		return { adjustment: -0.1, reason: 'Resolution significantly longer than expected' };
	}

	if (resolutionLength < avgLength * 0.3) {
		return { adjustment: -0.1, reason: 'Resolution significantly shorter than expected' };
	}

	return { adjustment: 0.1, reason: 'Resolution length appropriate' };
}

/**
 * Check if code structure is preserved
 */
function assessStructurePreservation(
	resolution: string,
	conflict: ConflictBlock,
): { adjustment: number; reason?: string } {
	// Check for basic structure elements
	const currentBraces = countBraces(conflict.current);
	const incomingBraces = countBraces(conflict.incoming);
	const resolutionBraces = countBraces(resolution);

	// Resolution should have reasonable brace count
	const maxBraces = Math.max(currentBraces, incomingBraces);
	const minBraces = Math.min(currentBraces, incomingBraces);

	if (resolutionBraces < minBraces || resolutionBraces > maxBraces * 2) {
		return { adjustment: -0.15, reason: 'Potential structure mismatch' };
	}

	// Check indentation consistency
	if (!hasConsistentIndentation(resolution)) {
		return { adjustment: -0.1, reason: 'Inconsistent indentation' };
	}

	return { adjustment: 0.05, reason: 'Structure preserved' };
}

function countBraces(code: string): number {
	const open = (code.match(/[{[(]/g) || []).length;
	const close = (code.match(/[}\])]/g) || []).length;
	return Math.abs(open - close);
}

function hasConsistentIndentation(code: string): boolean {
	const lines = code.split('\n').filter((l) => l.trim());
	if (lines.length === 0) return true;

	const indents = lines.map((l) => l.search(/\S/)).filter((i) => i >= 0);
	if (indents.length === 0) return true;

	// Check if indentation follows a pattern (multiples of 2 or 4)
	const uniqueIndents = [...new Set(indents)];
	const commonDivisor = Math.min(...(uniqueIndents.filter((i) => i > 0) || [2]));

	return uniqueIndents.every((i) => i % commonDivisor === 0 || i === 0);
}

/**
 * Assess syntax validity
 */
function assessSyntaxValidity(resolution: string, filePath?: string): { adjustment: number; reason?: string } {
	// Check for obvious syntax errors

	// Unclosed strings
	if (hasUnclosedStrings(resolution)) {
		return { adjustment: -0.3, reason: 'Unclosed string detected' };
	}

	// Unbalanced brackets
	if (!hasBalancedBrackets(resolution)) {
		return { adjustment: -0.2, reason: 'Unbalanced brackets' };
	}

	// Invalid tokens
	if (hasInvalidTokens(resolution)) {
		return { adjustment: -0.2, reason: 'Invalid syntax tokens detected' };
	}

	return { adjustment: 0.1, reason: 'Basic syntax checks passed' };
}

function hasUnclosedStrings(code: string): boolean {
	// Simple check for unclosed strings
	const singleQuotes = (code.match(/'/g) || []).length;
	const doubleQuotes = (code.match(/"/g) || []).length;
	const backticks = (code.match(/`/g) || []).length;

	return singleQuotes % 2 !== 0 || doubleQuotes % 2 !== 0 || backticks % 2 !== 0;
}

function hasBalancedBrackets(code: string): boolean {
	const stack: string[] = [];
	const pairs: Record<string, string> = { '(': ')', '[': ']', '{': '}' };

	for (const char of code) {
		if (char in pairs) {
			stack.push(pairs[char]);
		} else if (Object.values(pairs).includes(char)) {
			if (stack.pop() !== char) return false;
		}
	}

	return stack.length === 0;
}

function hasInvalidTokens(code: string): boolean {
	// Check for suspicious patterns that might indicate AI confusion
	const invalidPatterns = [
		/\.\.\./, // Ellipsis (might be from "... rest of code")
		/\[truncated\]/i,
		/\(omitted\)/i,
		/<\/?[a-z]+>/i, // HTML-like tags
	];

	return invalidPatterns.some((pattern) => pattern.test(code));
}

/**
 * Assess content preservation from both sides
 */
function assessContentPreservation(
	resolution: string,
	conflict: ConflictBlock,
): { adjustment: number; reason?: string } {
	const currentTokens = tokenize(conflict.current);
	const incomingTokens = tokenize(conflict.incoming);
	const resolutionTokens = tokenize(resolution);

	// Count how many tokens from each side are preserved
	const currentPreserved = currentTokens.filter((t) => resolutionTokens.includes(t)).length;
	const incomingPreserved = incomingTokens.filter((t) => resolutionTokens.includes(t)).length;

	const currentPreservationRate = currentTokens.length > 0 ? currentPreserved / currentTokens.length : 0;
	const incomingPreservationRate = incomingTokens.length > 0 ? incomingPreserved / incomingTokens.length : 0;

	// Good resolution should preserve significant content from both sides
	const avgPreservation = (currentPreservationRate + incomingPreservationRate) / 2;

	if (avgPreservation < 0.3) {
		return { adjustment: -0.2, reason: 'Low content preservation from original branches' };
	}

	if (avgPreservation > 0.7) {
		return { adjustment: 0.15, reason: 'Good content preservation from both branches' };
	}

	return { adjustment: 0.05, reason: 'Moderate content preservation' };
}

function tokenize(code: string): string[] {
	// Simple tokenization: split by non-word characters and filter
	return code
		.split(/[^\w]+/)
		.filter((t) => t.length > 1)
		.map((t) => t.toLowerCase());
}

/**
 * Check for AI confusion markers
 */
function checkForConfusionMarkers(resolution: string): { adjustment: number; reason?: string } {
	const confusionMarkers = [
		'I cannot',
		'I apologize',
		'As an AI',
		"I don't have",
		"I'm not sure",
		'Based on the context',
		'It seems',
		'Alternatively',
		'One possible solution',
		'Here is',
		"Here's",
		'```', // Code blocks that should have been stripped
	];

	const lowerResolution = resolution.toLowerCase();

	for (const marker of confusionMarkers) {
		if (lowerResolution.includes(marker.toLowerCase())) {
			return { adjustment: -0.4, reason: 'AI explanation text detected in resolution' };
		}
	}

	// Check for conflict markers that should have been removed
	if (/^[<=>]{7}/.test(resolution)) {
		return { adjustment: -0.5, reason: 'Conflict markers present in resolution' };
	}

	return { adjustment: 0, reason: undefined };
}

/**
 * Get confidence threshold for different operations
 */
export function getConfidenceThreshold(operation: 'auto-accept' | 'require-review'): number {
	switch (operation) {
		case 'auto-accept':
			return 0.85; // Very high confidence needed for auto-accept
		case 'require-review':
			return 0.5; // Below this, always require review
	}
}

/**
 * Format confidence for display
 */
export function formatConfidence(confidence: ConfidenceScore): string {
	const percentage = Math.round(confidence.score * 100);
	const emoji = confidence.level === 'high' ? '✅' : confidence.level === 'medium' ? '⚠️' : '❌';

	let result = `${emoji} Confidence: ${percentage}% (${confidence.level})`;

	if (confidence.reasons.length > 0) {
		result += '\n  Reasons:';
		confidence.reasons.forEach((reason) => {
			result += `\n  • ${reason}`;
		});
	}

	if (confidence.requiresApproval) {
		result += '\n  ⚠️  Requires manual approval';
	}

	return result;
}
