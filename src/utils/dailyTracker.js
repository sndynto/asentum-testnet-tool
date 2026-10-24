import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const HISTORY_FILE = path.resolve(__dirname, '../../daily_history.json');

/**
 * Returns today's UTC date key: YYYY-MM-DD
 */
export function getTodayKey() {
    return new Date().toISOString().slice(0, 10);
}

/**
 * Loads daily task history from JSON file
 */
function loadHistory() {
    try {
        if (fs.existsSync(HISTORY_FILE)) {
            return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8') || '{}');
        }
    } catch (e) {
        // ignore
    }
    return {};
}

/**
 * Saves daily task history to JSON file
 */
function saveHistory(data) {
    try {
        fs.writeFileSync(HISTORY_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
        // ignore
    }
}

/**
 * Checks if a task has already succeeded today for a given wallet
 */
export function isTaskCompletedToday(walletAddress, taskName) {
    if (process.env.FORCE_RUN === 'true') {
        return false;
    }

    const history = loadHistory();
    const today = getTodayKey();
    const addr = String(walletAddress).toLowerCase();

    return !!(history[today]?.[addr]?.[taskName]?.success);
}

/**
 * Records that a task has succeeded today for a given wallet
 */
export function markTaskCompletedToday(walletAddress, taskName, details = {}) {
    const history = loadHistory();
    const today = getTodayKey();
    const addr = String(walletAddress).toLowerCase();

    if (!history[today]) {
        history[today] = {};
    }
    if (!history[today][addr]) {
        history[today][addr] = {};
    }

    history[today][addr][taskName] = {
        success: true,
        completedAt: new Date().toISOString(),
        ...details
    };

    saveHistory(history);
}

/**
 * Wrapper to run a task or skip it if already done today
 */
export async function runOrSkipTask(walletAddress, taskName, taskFn) {
    const today = getTodayKey();

    if (isTaskCompletedToday(walletAddress, taskName)) {
        console.log(chalk.gray(`[Skip] [Task: ${taskName}] Sudah selesai dijalankan hari ini (${today}). Melewati...`));
        return { success: true, skipped: true, reason: 'Already completed today' };
    }

    const result = await taskFn();

    if (result && result.success) {
        markTaskCompletedToday(walletAddress, taskName, {
            txHash: result.txHash || null,
            blockNumber: result.blockNumber || null
        });
    }

    return result;
}
