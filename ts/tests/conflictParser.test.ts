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

	it('separates context from conflict content', () => {
		const filePath = join(fixturesDir, 'script.js');
		const conflicts = parseConflicts(filePath);

		expect(conflicts).toHaveLength(1);
		const [conflict] = conflicts;

		// Context should contain surrounding lines but not be in current/incoming
		expect(conflict.context).toContain('Initial script');
		expect(conflict.context).toContain('Script finished');
		expect(conflict.context).toContain('...CONFLICT HERE...');

		// Current and incoming should NOT contain surrounding context
		expect(conflict.current).toContain('Main script running');
		expect(conflict.current).not.toContain('Initial script');
		expect(conflict.current).not.toContain('Script finished');

		expect(conflict.incoming).toContain('Feature script running');
		expect(conflict.incoming).not.toContain('Initial script');
		expect(conflict.incoming).not.toContain('Script finished');
	});
});
