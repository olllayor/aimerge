import { join } from 'node:path';
import { parseConflicts } from '../src/conflictParser.js';

const fixturesDir = join(process.cwd(), 'tests', 'fixtures');

describe('parseConflicts', () => {
	it('extracts conflict blocks with current and incoming sections', () => {
		const filePath = join(fixturesDir, 'conflicted_file.py');
		const conflicts = parseConflicts(filePath);

		expect(conflicts).toHaveLength(1);
		const [conflict] = conflicts;
		expect(conflict.current).not.toContain('<<<<<<<');
		expect(conflict.current).toContain('print("Feature A added")');
		expect(conflict.incoming).toContain('print("Feature B added")');
		expect(conflict.context).toContain('...CONFLICT HERE...');
		expect(conflict.fullMatch).toMatch(/<<<<<<< HEAD/);
	});
});
