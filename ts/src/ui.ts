import chalk from 'chalk';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { ConflictBlock } from './types.js';

export function banner() {
	console.log(chalk.magentaBright.bold('AIMerge'), chalk.gray('– AI merge conflict resolver'));
}

export function listConflictedFiles(files: string[]): void {
	if (!files.length) {
		console.log(chalk.green('✅ No merge conflicts detected'));
		return;
	}

	console.log(chalk.blueBright(`🔍 Found ${files.length} conflicted file(s):`));
	files.forEach((file) => console.log(`  • ${chalk.cyan(file)}`));
}

export function showConflictSummary(filePath: string, total: number): void {
	console.log();
	console.log(chalk.bold.magenta(`📄 Processing ${filePath} (${total} conflicts)`));
}

export function showConflict(conflict: ConflictBlock, index: number, total: number): void {
	console.log();
	console.log(chalk.yellow(`🚧 Conflict ${index}/${total}`));
	console.log(chalk.cyan('Current changes:'));
	console.log(truncate(conflict.current));
	console.log();
	console.log(chalk.cyan('Incoming changes:'));
	console.log(truncate(conflict.incoming));
}

export async function askForDecision(defaultChoice: string): Promise<string> {
	const rl = readline.createInterface({ input, output });
	const answer = await rl.question(`${chalk.bold('Accept?')} [y]es, [n]o, [e]dit, [s]kip (${defaultChoice}) `);
	rl.close();
	return (answer || defaultChoice).trim().toLowerCase();
}

export function showSummary(resolved: number, skipped: number, total: number, autoResolved?: number): void {
	if (resolved > 0) {
		console.log(chalk.green(`  ➤ Resolved ${resolved}/${total} conflicts`));
	}
	if (autoResolved && autoResolved > 0) {
		console.log(chalk.cyan(`  ➤ Auto-resolved ${autoResolved} trivial conflicts`));
	}
	if (skipped > 0) {
		console.log(chalk.yellow(`  ➤ ${skipped} conflicts require manual attention`));
	}
}

export function showError(error: unknown): void {
	const message = error instanceof Error ? error.message : String(error);
	console.error(chalk.red(`❌ Error: ${message}`));
}

function truncate(text: string, maxLength = 400): string {
	if (text.length <= maxLength) return text;
	return `${text.slice(0, maxLength)}${chalk.gray('…')}`;
}
