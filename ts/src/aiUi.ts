import boxen from 'boxen';
import chalk from 'chalk';
import ora from 'ora';

const TYPING_DELAY_MS = process.env.CI ? 0 : 12;

export async function withThinkingSpinner<T>(label: string, action: () => Promise<T>): Promise<T> {
	const spinner = ora({ text: label, spinner: 'dots', color: 'cyan' }).start();
	try {
		const result = await action();
		spinner.succeed('AI response ready');
		return result;
	} catch (error) {
		spinner.fail('AI request failed');
		throw error;
	}
}

export async function renderAiMessage(content: string): Promise<void> {
	if (!content.trim()) {
		console.log(chalk.red('<no response>'));
		return;
	}

	const lines = content.split(/\r?\n/);
	if (TYPING_DELAY_MS === 0) {
		printBox(lines.join('\n'));
		return;
	}

	const buffer: string[] = [];
	for (const line of lines) {
		buffer.push(line);
		printBox(buffer.join('\n'), true);
		await delay(Math.min(200, line.length * TYPING_DELAY_MS));
	}
}

function printBox(text: string, replace = false): void {
	const boxed = boxen(text, {
		padding: { left: 1, right: 1, top: 0, bottom: 0 },
		margin: { left: 0, right: 0, top: replace ? 0 : 1, bottom: 0 },
		borderColor: 'green',
		title: '🤖 AIMerge',
		titleAlignment: 'left',
	});
	if (replace) {
		process.stdout.write('\u001b[2K\u001b[1G');
	}
	console.log(boxed);
}

function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
