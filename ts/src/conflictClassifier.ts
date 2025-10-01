import { ConflictBlock, ConflictClassification } from './types.js';

/**
 * Classifies conflicts into categories for appropriate handling:
 * - trivial: Safe to auto-resolve (whitespace, comments, imports)
 * - semantic: Different logic but potentially compatible
 * - logic-collision: Direct contradictions requiring careful review
 */
export function classifyConflict(conflict: ConflictBlock): ConflictClassification {
	const current = conflict.current.trim();
	const incoming = conflict.incoming.trim();

	// Trivial: Only whitespace differences
	if (normalizeWhitespace(current) === normalizeWhitespace(incoming)) {
		return 'trivial';
	}

	// Trivial: Only comment differences
	if (isOnlyCommentChange(current, incoming)) {
		return 'trivial';
	}

	// Trivial: Import statement ordering
	if (isImportReordering(current, incoming)) {
		return 'trivial';
	}

	// Trivial: Both sides added the same thing
	if (current === incoming) {
		return 'trivial';
	}

	// Logic collision: Direct contradictions
	if (isLogicCollision(current, incoming)) {
		return 'logic-collision';
	}

	// Logic collision: Return value conflicts
	if (isReturnValueConflict(current, incoming)) {
		return 'logic-collision';
	}

	// Logic collision: Control flow conflicts
	if (isControlFlowConflict(current, incoming)) {
		return 'logic-collision';
	}

	// Semantic: Different implementations but potentially compatible
	return 'semantic';
}

/**
 * Check if conflict should be auto-resolved
 */
export function shouldAutoResolve(classification: ConflictClassification): boolean {
	return classification === 'trivial';
}

/**
 * Check if conflict is dangerous and needs explicit approval
 */
export function isDangerous(classification: ConflictClassification): boolean {
	return classification === 'logic-collision';
}

/**
 * Get human-readable description of classification
 */
export function getClassificationDescription(classification: ConflictClassification): string {
	switch (classification) {
		case 'trivial':
			return 'Safe to auto-resolve (whitespace, comments, or identical changes)';
		case 'semantic':
			return 'Different implementations that may be compatible';
		case 'logic-collision':
			return '⚠️  DANGEROUS: Direct logical contradiction detected';
		case 'unknown':
			return 'Unable to classify - manual review recommended';
	}
}

// Helper functions

function normalizeWhitespace(code: string): string {
	return code
		.replace(/\s+/g, ' ')
		.replace(/\s*([{}()[\];,])\s*/g, '$1')
		.trim();
}

function isOnlyCommentChange(current: string, incoming: string): boolean {
	const currentWithoutComments = removeComments(current);
	const incomingWithoutComments = removeComments(incoming);

	return normalizeWhitespace(currentWithoutComments) === normalizeWhitespace(incomingWithoutComments);
}

function removeComments(code: string): string {
	// Remove single-line comments
	let result = code.replace(/\/\/.*$/gm, '');
	// Remove multi-line comments
	result = result.replace(/\/\*[\s\S]*?\*\//g, '');
	// Remove Python comments
	result = result.replace(/#.*$/gm, '');
	return result;
}

function isImportReordering(current: string, incoming: string): boolean {
	const currentImports = extractImports(current);
	const incomingImports = extractImports(incoming);

	if (currentImports.length === 0 || incomingImports.length === 0) {
		return false;
	}

	// Check if same imports, just different order
	const currentSorted = [...currentImports].sort();
	const incomingSorted = [...incomingImports].sort();

	return JSON.stringify(currentSorted) === JSON.stringify(incomingSorted);
}

function extractImports(code: string): string[] {
	const imports: string[] = [];

	// JavaScript/TypeScript imports
	const jsImportRegex = /^import\s+.*?from\s+['"]([^'"]+)['"]/gm;
	let match;
	while ((match = jsImportRegex.exec(code)) !== null) {
		imports.push(match[0].trim());
	}

	// Python imports
	const pyImportRegex = /^(?:from|import)\s+.*$/gm;
	while ((match = pyImportRegex.exec(code)) !== null) {
		imports.push(match[0].trim());
	}

	return imports;
}

function isLogicCollision(current: string, incoming: string): boolean {
	// Check for conflicting assignments to the same variable
	const currentAssignments = extractAssignments(current);
	const incomingAssignments = extractAssignments(incoming);

	for (const [varName, currentValue] of currentAssignments) {
		const incomingValue = incomingAssignments.get(varName);
		if (incomingValue && incomingValue !== currentValue) {
			return true;
		}
	}

	// Check for conflicting function definitions
	if (hasDifferentFunctionDefinitions(current, incoming)) {
		return true;
	}

	return false;
}

function extractAssignments(code: string): Map<string, string> {
	const assignments = new Map<string, string>();

	// Match variable assignments: var = value, const x = y, let z = w
	const assignmentRegex = /(?:const|let|var)?\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*([^;,\n]+)/g;
	let match;

	while ((match = assignmentRegex.exec(code)) !== null) {
		const varName = match[1].trim();
		const value = match[2].trim();
		assignments.set(varName, value);
	}

	return assignments;
}

function hasDifferentFunctionDefinitions(current: string, incoming: string): boolean {
	const currentFuncs = extractFunctionNames(current);
	const incomingFuncs = extractFunctionNames(incoming);

	// Check if both define the same function
	const commonFuncs = currentFuncs.filter((f) => incomingFuncs.includes(f));

	return commonFuncs.length > 0;
}

function extractFunctionNames(code: string): string[] {
	const functions: string[] = [];

	// JavaScript/TypeScript function declarations
	const jsFuncRegex = /(?:function|const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?:=\s*)?(?:\([^)]*\)|async)/g;
	let match;

	while ((match = jsFuncRegex.exec(code)) !== null) {
		functions.push(match[1]);
	}

	// Python function definitions
	const pyFuncRegex = /def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g;
	while ((match = pyFuncRegex.exec(code)) !== null) {
		functions.push(match[1]);
	}

	return functions;
}

function isReturnValueConflict(current: string, incoming: string): boolean {
	const currentReturns = extractReturnStatements(current);
	const incomingReturns = extractReturnStatements(incoming);

	// If both have return statements with different values, it's a collision
	if (currentReturns.length > 0 && incomingReturns.length > 0) {
		// Check if they return different literal values
		const currentValues = new Set(currentReturns);
		const incomingValues = new Set(incomingReturns);

		// If sets are different and contain literals, it's a collision
		const hasConflict = ![...currentValues].every((v) => incomingValues.has(v));
		return hasConflict && (hasLiteral(currentReturns) || hasLiteral(incomingReturns));
	}

	return false;
}

function extractReturnStatements(code: string): string[] {
	const returns: string[] = [];
	const returnRegex = /return\s+([^;}\n]+)/g;
	let match;

	while ((match = returnRegex.exec(code)) !== null) {
		returns.push(match[1].trim());
	}

	return returns;
}

function hasLiteral(values: string[]): boolean {
	return values.some((v) => {
		// Check for string, number, boolean, null literals
		return /^(['"`].*['"`]|true|false|null|undefined|\d+)$/.test(v.trim());
	});
}

function isControlFlowConflict(current: string, incoming: string): boolean {
	// Check for conflicting conditional logic
	const currentHasIf = /if\s*\([^)]+\)/.test(current);
	const incomingHasIf = /if\s*\([^)]+\)/.test(incoming);

	// If both have different if conditions, it's potentially dangerous
	if (currentHasIf && incomingHasIf) {
		const currentCondition = extractConditions(current);
		const incomingCondition = extractConditions(incoming);

		// If conditions are different, it's a collision
		if (currentCondition !== incomingCondition) {
			return true;
		}
	}

	return false;
}

function extractConditions(code: string): string {
	const match = /if\s*\(([^)]+)\)/.exec(code);
	return match ? match[1].trim() : '';
}

/**
 * Auto-resolve trivial conflicts
 */
export function autoResolveTrivial(conflict: ConflictBlock): string | null {
	const classification = conflict.classification || classifyConflict(conflict);

	if (classification !== 'trivial') {
		return null;
	}

	const current = conflict.current.trim();
	const incoming = conflict.incoming.trim();

	// If identical, return either one
	if (current === incoming) {
		return current;
	}

	// If only whitespace differs, prefer the incoming (or could use a formatter)
	if (normalizeWhitespace(current) === normalizeWhitespace(incoming)) {
		return incoming; // Prefer incoming as newer
	}

	// If only comments differ, keep both versions merged
	if (isOnlyCommentChange(current, incoming)) {
		// Merge comments from both
		return mergeComments(current, incoming);
	}

	// If import reordering, sort alphabetically
	if (isImportReordering(current, incoming)) {
		const allImports = [...extractImports(current), ...extractImports(incoming)];
		const uniqueImports = [...new Set(allImports)].sort();
		return uniqueImports.join('\n');
	}

	return null;
}

function mergeComments(current: string, incoming: string): string {
	// Simple approach: keep the code and merge unique comments
	const currentCode = removeComments(current);
	const currentComments = extractCommentsOnly(current);
	const incomingComments = extractCommentsOnly(incoming);

	const allComments = [...new Set([...currentComments, ...incomingComments])];

	return currentCode + (allComments.length > 0 ? '\n' + allComments.join('\n') : '');
}

function extractCommentsOnly(code: string): string[] {
	const comments: string[] = [];

	// Single-line comments
	let match;
	const singleLineRegex = /\/\/.*$|#.*$/gm;
	while ((match = singleLineRegex.exec(code)) !== null) {
		comments.push(match[0].trim());
	}

	// Multi-line comments
	const multiLineRegex = /\/\*[\s\S]*?\*\//g;
	while ((match = multiLineRegex.exec(code)) !== null) {
		comments.push(match[0].trim());
	}

	return comments;
}
