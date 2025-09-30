import { copyFileSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

export function backupFile(filePath: string): string {
	const tempDir = mkdtempSync(join(tmpdir(), 'aimerge-'));
	const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '');
	const backupPath = join(tempDir, `${sanitizeFileName(filePath)}.${timestamp}.bak`);
	copyFileSync(filePath, backupPath);
	return backupPath;
}

export function restoreBackup(backupPath: string, targetPath: string): void {
	if (existsSync(backupPath)) {
		copyFileSync(backupPath, targetPath);
		safeRemove(backupPath);
	}
}

export function overwriteFile(filePath: string, content: string): void {
	writeFileSync(filePath, content, 'utf8');
}

export function readFile(filePath: string): string {
	return readFileSync(filePath, 'utf8');
}

export function safeRemove(path: string): void {
	if (existsSync(path)) {
		rmSync(path, { force: true, recursive: true });
	}
}

export async function openInEditor(initialContent: string): Promise<string | undefined> {
	const editor = process.env.EDITOR || process.env.VISUAL;
	if (!editor) {
		return undefined;
	}

	const tempDir = mkdtempSync(join(tmpdir(), 'aimerge-edit-'));
	const tempFile = join(tempDir, 'resolution.tmp');
	writeFileSync(tempFile, initialContent, 'utf8');

	const { spawn } = await import('node:child_process');
	await new Promise<void>((resolve, reject) => {
		const child = spawn(editor, [tempFile], {
			stdio: 'inherit',
			shell: true,
		});

		child.on('error', reject);
		child.on('exit', (code: number | null) => {
			if (code === 0) {
				resolve();
			} else {
				reject(new Error(`${editor} exited with code ${code}`));
			}
		});
	});

	const edited = readFile(tempFile);
	safeRemove(tempFile);
	safeRemove(tempDir);
	return edited;
}

function sanitizeFileName(filePath: string): string {
	return filePath.replace(/[\\/:]/g, '-');
}
