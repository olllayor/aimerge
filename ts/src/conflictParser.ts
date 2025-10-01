import { readFileSync } from 'node:fs';
import { ConflictBlock } from './types.js';

export function parseConflicts(filePath: string): ConflictBlock[] {
	const content = readFileSync(filePath, 'utf8');
	const conflicts: ConflictBlock[] = [];

	// Create a new regex instance each time to avoid state issues
	const CONFLICT_REGEX = /<<<<<<<[^\n]*\n([\s\S]*?)\n=======\n([\s\S]*?)\n>>>>>>>[^\n]*\n/g;

	let match: RegExpExecArray | null;
	while ((match = CONFLICT_REGEX.exec(content)) !== null) {
		const [fullMatch, current, incoming] = match;
		conflicts.push({
			current: current.trim(),
			incoming: incoming.trim(),
			context: buildContext(content, match.index, fullMatch.length),
			fullMatch,
			filePath, // Include file path for better context
		});
	}

	return conflicts;
}

function buildContext(content: string, startIndex: number, matchLength: number, radius = 300): string {
	const beforeStart = Math.max(0, startIndex - radius);
	const before = content.slice(beforeStart, startIndex);
	const beforeLines = before.split(/\r?\n/).slice(-3);

	const afterStart = startIndex + matchLength;
	const afterEnd = Math.min(content.length, afterStart + radius);
	const after = content.slice(afterStart, afterEnd);
	const afterLines = after.split(/\r?\n/).slice(0, 3);

	return [...beforeLines, '...CONFLICT HERE...', ...afterLines].join('\n');
}
