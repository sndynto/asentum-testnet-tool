import { CronJob } from 'cron';
import chalk from 'chalk';
import dotenv from 'dotenv';
import { runBot } from './bot.js';

dotenv.config();

const cronExpression = process.env.CRON_SCHEDULE || '0 0 1 * * *';

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

console.log(chalk.bold.cyan('========================================================'));
console.log(chalk.bold.yellow(`ASENTUM DAILY SCHEDULER AKTIF`));
console.log(chalk.white(`Jadwal Cron: ${chalk.bold.green(cronExpression)}`));
console.log(chalk.gray('Menjalankan putaran pertama sekarang, lalu berulang setiap hari.'));
console.log(chalk.bold.cyan('========================================================\n'));

async function executeInitialRun() {
    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            await runBot();
            console.log(chalk.gray(`\nPutaran pertama selesai. Menunggu jadwal berikutnya sesuai pola: ${cronExpression} ...\n`));
            return;
        } catch (err) {
            console.error(chalk.red(`[WARN] Eksekusi awal percobaan ${attempt}/${maxRetries} gagal: ${err.message}`));
            if (attempt < maxRetries) {
                console.log(chalk.yellow(`Mencoba kembali eksekusi awal dalam 20 detik...`));
                await sleep(20000);
            } else {
                console.error(chalk.red(`[NOTICE] Eksekusi awal tidak dapat diselesaikan karena gangguan jaringan/RPC. Cron scheduler tetap aktif untuk jadwal berikutnya.`));
            }
        }
    }
}

// Run immediately on start
executeInitialRun();

// Setup recurring cron job
const job = new CronJob(
    cronExpression,
    async function () {
        console.log(chalk.magenta(`\n[CRON TRIGGER] Memulai eksekusi harian: ${new Date().toLocaleString()}`));
        try {
            await runBot();
        } catch (err) {
            console.error(chalk.red(`Error saat menjalankan cron job: ${err.message}`));
        }
    },
    null,
    true
);
