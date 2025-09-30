import { execSync, spawnSync } from 'node:child_process';

export function assertGitRepository(): void {
	try {
		execSync('git rev-parse --is-inside-work-tree', { stdio: 'ignore' });
	} catch (error) {
		throw new Error('Not a Git repository or git is not available in PATH.');
	}
}

export function findConflictedFiles(): string[] {
	try {
		const output = execSync('git diff --name-only --diff-filter=U', {
			encoding: 'utf8',
		});
		return output
			.split(/\r?\n/)
			.map((line: string) => line.trim())
			.filter(Boolean);
	} catch (error) {
		if (error instanceof Error && 'stderr' in error) {
			const stderr = (error as { stderr?: { toString?: () => string } }).stderr?.toString?.() ?? '';
			if (stderr.toLowerCase().includes('not a git repository')) {
				throw new Error('Not a Git repository');
			}
		}
		return [];
	}
}

export function stageFile(filePath: string): void {
	const result = spawnSync('git', ['add', filePath]);
	if (result.status !== 0) {
		const stderr = result.stderr?.toString().trim();
		throw new Error(stderr || `Failed to stage ${filePath}`);
	}
}
