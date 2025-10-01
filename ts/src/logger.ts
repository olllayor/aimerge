import chalk from 'chalk';

export enum LogLevel {
	DEBUG = 0,
	INFO = 1,
	WARN = 2,
	ERROR = 3,
}

class Logger {
	private level: LogLevel = LogLevel.INFO;

	constructor() {
		const envLevel = process.env.AIMERGE_LOG_LEVEL?.toUpperCase();
		if (envLevel && envLevel in LogLevel) {
			this.level = LogLevel[envLevel as keyof typeof LogLevel] as LogLevel;
		}
	}

	setLevel(level: LogLevel): void {
		this.level = level;
	}

	debug(message: string, ...args: unknown[]): void {
		if (this.level <= LogLevel.DEBUG) {
			console.log(chalk.gray(`[DEBUG] ${message}`), ...args);
		}
	}

	info(message: string, ...args: unknown[]): void {
		if (this.level <= LogLevel.INFO) {
			console.log(chalk.blue(`[INFO] ${message}`), ...args);
		}
	}

	warn(message: string, ...args: unknown[]): void {
		if (this.level <= LogLevel.WARN) {
			console.log(chalk.yellow(`[WARN] ${message}`), ...args);
		}
	}

	error(message: string, ...args: unknown[]): void {
		if (this.level <= LogLevel.ERROR) {
			console.error(chalk.red(`[ERROR] ${message}`), ...args);
		}
	}
}

export const logger = new Logger();
