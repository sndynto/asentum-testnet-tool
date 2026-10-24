import chalk from 'chalk';
import { formatAse } from '@asentum/sdk';
import { loadAllWallets } from './wallet.js';
import { executeTransfer } from './tasks/transfer.js';
import { executeAurasSwap } from './tasks/aurasSwap.js';
import { executeAseDexSwap } from './tasks/asedexSwap.js';
import { executeAseDexLiquidity } from './tasks/asedexLiquidity.js';
import { executeAurasLiquidity } from './tasks/aurasLiquidity.js';
import { executeSocialPost, executeSetProfile, getSocialStats } from './tasks/social.js';
import { executeDeployContract } from './tasks/deployContract.js';
import { checkValidatorStatus } from './tasks/validatorCheck.js';
import { executeAsepadBuy } from './tasks/asepad.js';
import { executeAseBet } from './tasks/asebet.js';
import { executeTreasureDig } from './tasks/treasureHunt.js';
import { runOrSkipTask } from './utils/dailyTracker.js';
import { getRandomDelay } from './utils/randomizer.js';

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTasksForWallet(client, wallet, index, total, nextWalletAddress = null) {
    console.log(chalk.bold.cyan(`\n========================================================`));
    console.log(chalk.bold.yellow(`     AKUN [${index}/${total}] - MEMULAI EKSEKUSI TUGAS`));
    console.log(chalk.bold.cyan(`========================================================`));

    // Display Account Info
    const balanceWei = await wallet.getBalance();
    const balanceAse = formatAse(balanceWei);
    const socialStats = await getSocialStats(client, wallet);

    console.log(chalk.white(`• Address (ase1)      : ${chalk.bold.yellow(wallet.address)}`));
    console.log(chalk.white(`• Address (0x)        : ${chalk.gray(wallet.addressHex)}`));
    console.log(chalk.white(`• Saldo ASE           : ${chalk.bold.green(balanceAse)} ASE`));
    console.log(chalk.white(`• ASocial Posts (Mine): ${socialStats.userPostCount || '0'} posts`));
    console.log(chalk.gray('--------------------------------------------------------'));

    if (parseFloat(balanceAse) <= 0.001) {
        console.log(chalk.yellow('[WARN] Saldo ASE sangat rendah atau 0. Klaim faucet terlebih dahulu.'));
        console.log(chalk.gray('Melanjutkan tugas yang memungkinkan...\n'));
    }

    const results = {};

    // 1. Social Profile & Post (social.asentum.com)
    if (process.env.ENABLE_SOCIAL_POST !== 'false') {
        results['ASocial Profile'] = await runOrSkipTask(wallet.address, 'ASocial Profile', () => executeSetProfile(client, wallet));
        if (!results['ASocial Profile'].skipped) await sleep(getRandomDelay(2500, 4500));

        results['ASocial Post'] = await runOrSkipTask(wallet.address, 'ASocial Post', () => executeSocialPost(client, wallet));
        if (!results['ASocial Post'].skipped) await sleep(getRandomDelay(3500, 6000));
    }

    // 2. Transfer ASE (Daisy-chain to next wallet if multi-account)
    if (process.env.ENABLE_SEND_ASE !== 'false') {
        results['Send ASE'] = await runOrSkipTask(wallet.address, 'Send ASE', () => executeTransfer(client, wallet, nextWalletAddress));
        if (!results['Send ASE'].skipped) await sleep(getRandomDelay(3500, 6000));
    }

    // 3. Swap on Auras DEX
    if (process.env.ENABLE_AURAS_SWAP !== 'false') {
        results['Auras Swap'] = await runOrSkipTask(wallet.address, 'Auras Swap', () => executeAurasSwap(client, wallet));
        if (!results['Auras Swap'].skipped) await sleep(getRandomDelay(4000, 7000));
    }

    // 4. Swap on AseDex (Quest: "Make a swap on AseDex")
    results['AseDex Swap'] = await runOrSkipTask(wallet.address, 'AseDex Swap', () => executeAseDexSwap(client, wallet));
    if (!results['AseDex Swap'].skipped) await sleep(getRandomDelay(4000, 7000));

    // 5. Add Liquidity on AseDex
    if (process.env.ENABLE_ASEDEX_LIQUIDITY !== 'false') {
        results['AseDex Liquidity'] = await runOrSkipTask(wallet.address, 'AseDex Liquidity', () => executeAseDexLiquidity(client, wallet));
        if (!results['AseDex Liquidity'].skipped) await sleep(getRandomDelay(4000, 7000));
    }

    // 6. Add Liquidity on Auras DEX
    if (process.env.ENABLE_AURAS_LIQUIDITY !== 'false') {
        results['Auras Liquidity'] = await runOrSkipTask(wallet.address, 'Auras Liquidity', () => executeAurasLiquidity(client, wallet));
        if (!results['Auras Liquidity'].skipped) await sleep(getRandomDelay(4000, 7000));
    }

    // 6. Deploy Smart Contract (Solana Memecoin clean ticker, no numbers)
    if (process.env.ENABLE_CONTRACT_DEPLOY !== 'false') {
        results['Deploy Contract'] = await runOrSkipTask(wallet.address, 'Deploy Contract', () => executeDeployContract(client, wallet));
        if (!results['Deploy Contract'].skipped) await sleep(getRandomDelay(4000, 7000));
    }

    // 7. AsePad Buy (Quest: "Buy or sell a token on AsePad")
    if (process.env.ENABLE_ASEPAD_BUY !== 'false') {
        results['AsePad (Buy/Sell)'] = await runOrSkipTask(wallet.address, 'AsePad (Buy/Sell)', () => executeAsepadBuy(client, wallet));
        if (!results['AsePad (Buy/Sell)'].skipped) await sleep(getRandomDelay(4000, 7000));
    }

    // 8. AseBet (Quest: "Place 2 bets on AseBet")
    if (process.env.ENABLE_ASEBET !== 'false') {
        results['AseBet (2 Bets)'] = await runOrSkipTask(wallet.address, 'AseBet (2 Bets)', () => executeAseBet(client, wallet, 2));
        if (!results['AseBet (2 Bets)'].skipped) await sleep(getRandomDelay(4000, 7000));
    }

    // 9. ASE Vegas Treasure (Quest: "Dig a cell in the ASE Vegas Treasure hunt")
    if (process.env.ENABLE_TREASURE_HUNT !== 'false') {
        results['Treasure Hunt (Dig)'] = await runOrSkipTask(wallet.address, 'Treasure Hunt (Dig)', () => executeTreasureDig(client, wallet));
        if (!results['Treasure Hunt (Dig)'].skipped) await sleep(getRandomDelay(3000, 6000));
    }

    // 10. Validator Status (Quest: "Sign a block as a validator")
    results['Validator Sign Block'] = await checkValidatorStatus(client, wallet);

    return results;
}

export async function runBot() {
    console.log(chalk.bold.magenta('\n========================================================'));
    console.log(chalk.bold.cyan('               ASENTUM TESTNET RUNNER                   '));
    console.log(chalk.bold.magenta('========================================================\n'));

    let client, walletsList;
    try {
        const loaded = await loadAllWallets();
        client = loaded.client;
        walletsList = loaded.walletsList;
    } catch (err) {
        console.log(chalk.red(`[Error] ${err.message}`));
        console.log(chalk.yellow(`\nSilakan masukkan private key / mnemonic di wallets.txt atau di .env`));
        return;
    }

    const heads = await client.getHeads().catch(() => ({ tip: 'N/A' }));
    console.log(chalk.green(`[OK] Terhubung ke Asentum Testnet (Tip Block: #${heads.tip})`));
    console.log(chalk.bold.white(`• Total Akun Terdaftar  : ${chalk.bold.green(walletsList.length)} akun`));
    console.log(chalk.bold.white(`• Kebijakan Nominal     : ${chalk.bold.magenta('Random < 0.13 ASE per transaksi')}`));
    console.log(chalk.bold.white(`• Kontrak & Token Meme  : ${chalk.bold.magenta('Solana Memecoin Clean Tickers')}\n`));

    const allResults = [];
    const baseDelaySec = parseInt(process.env.DELAY_BETWEEN_WALLETS_SEC || '8');

    for (let i = 0; i < walletsList.length; i++) {
        const item = walletsList[i];
        const nextWallet = (i + 1 < walletsList.length) ? walletsList[i + 1].wallet.address : (walletsList.length > 1 ? walletsList[0].wallet.address : null);

        const res = await runTasksForWallet(client, item.wallet, i + 1, walletsList.length, nextWallet);
        allResults.push({ wallet: item.wallet.address, results: res });

        if (i + 1 < walletsList.length) {
            const randomWalletDelay = Math.max(5000, getRandomDelay((baseDelaySec - 2) * 1000, (baseDelaySec + 5) * 1000));
            console.log(chalk.gray(`\nMenunggu jeda acak ${(randomWalletDelay / 1000).toFixed(1)} detik sebelum beralih ke akun #${i + 2}...\n`));
            await sleep(randomWalletDelay);
        }
    }

    // Overall Summary
    console.log(chalk.bold.magenta('\n========================================================'));
    console.log(chalk.bold.cyan('             RINGKASAN AKHIR SEMUA AKUN                 '));
    console.log(chalk.bold.magenta('========================================================'));

    for (let i = 0; i < allResults.length; i++) {
        const item = allResults[i];
        let successCount = 0;
        let skippedCount = 0;
        let failCount = 0;

        for (const [task, r] of Object.entries(item.results)) {
            if (r && r.skipped) skippedCount++;
            else if (r && r.success) successCount++;
            else if (r && !r.reason && r.isValidator === undefined) failCount++;
        }

        console.log(
            `Akun #${i + 1} (${item.wallet.substring(0, 14)}...${item.wallet.slice(-6)}): ` +
            chalk.green(`${successCount} Sukses Baru`) + ' | ' +
            chalk.cyan(`${skippedCount} Sudah Selesai Hari Ini`) + ' | ' +
            (failCount > 0 ? chalk.red(`${failCount} Gagal`) : chalk.gray('0 Gagal'))
        );
    }
    console.log(chalk.bold.magenta('========================================================\n'));
}

// Auto-execute if run directly
if (process.argv[1].endsWith('bot.js')) {
    runBot().catch(err => {
        console.error(chalk.red(`Fatal Error: ${err.message}`));
    });
}
