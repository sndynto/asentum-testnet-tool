import chalk from 'chalk';
import { formatAse } from '@asentum/sdk';
import { getRandomDelay } from '../utils/randomizer.js';

export const ASEBET_CONTRACT_HEX = '0xc91aef943a1a0e587e6b57959de0692d1a704879';
export const ASEBET_CONTRACT_ASE1 = 'ase1eydwl9p6rg89slnt272emcrf95d8qjregvszr6';

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetches all currently active and open prediction markets on AseBet
 */
export async function getOpenMarkets(client) {
    try {
        const num = await client.getBlockNumber();
        const block = await client.getBlock(num);
        const now = BigInt(block.header?.timestamp || Date.now());

        const res = await client.viewCall(ASEBET_CONTRACT_HEX, 'markets', []);
        const allMarkets = res.returnValue || [];

        // Filter truly open markets with buffer of at least 2 minutes before closesAt
        const openMarkets = allMarkets.filter(m => {
            if (m.status !== 'open') return false;
            if (m.closesAt && m.closesAt !== '0') {
                return BigInt(m.closesAt) > (now + 120000n);
            }
            return true;
        });

        return openMarkets;
    } catch (err) {
        console.log(chalk.red(`[Task: AseBet] Error fetching markets: ${err.message}`));
        return [];
    }
}

/**
 * Executes 1 bet on a specific or random open market
 */
export async function executeSingleBet(client, wallet, market, outcomeIdx = null, betAmountWei = 1000000000000000000n) {
    const outcome = outcomeIdx !== null 
        ? outcomeIdx 
        : Math.floor(Math.random() * (market.outcomes?.length || 2));
    const outcomeName = market.outcomes ? market.outcomes[outcome] : `Outcome #${outcome}`;

    console.log(chalk.cyan(`[Task: AseBet] Placing bet on Market #${market.id} ("${outcomeName}") with ${formatAse(betAmountWei)} ASE...`));

    const tx = await wallet.sendCall({
        to: ASEBET_CONTRACT_HEX,
        method: 'bet',
        args: [String(market.id), outcome],
        value: betAmountWei,
        gasLimit: 2000000n
    });

    console.log(chalk.blue(`[Task: AseBet] Broadcasted! Hash: ${tx.hash}`));
    const receipt = await tx.wait({ timeoutMs: 60000 });

    if (receipt.success) {
        console.log(chalk.green(`[OK] [Task: AseBet] Bet placed successfully in block #${receipt.blockNumber}!`));
        console.log(chalk.gray(`  Market #${market.id} | Outcome: ${outcomeName} | Amount: ${formatAse(betAmountWei)} ASE`));
        return {
            success: true,
            txHash: tx.hash,
            blockNumber: receipt.blockNumber,
            marketId: market.id,
            outcome: outcomeName
        };
    } else {
        console.log(chalk.red(`[FAIL] [Task: AseBet] Failed: ${receipt.error || 'Reverted'}`));
        return { success: false, error: receipt.error };
    }
}

/**
 * Places N bets (default 2 bets) on AseBet
 * Fulfills Quest: "Place 2 bets on AseBet"
 */
export async function executeAseBet(client, wallet, targetBets = 2) {
    console.log(chalk.cyan(`\n[Task: AseBet] Starting ${targetBets} bets on AseBet (asebet.uk)...`));

    const maxAllowed = parseFloat(process.env.MAX_ALLOWED_TX_ASE || '999');
    if (1.0 > maxAllowed) {
        console.log(chalk.yellow(`[Task: AseBet] Dilewati: Kontrak AseBet mewajibkan minimal 1.0 ASE per bet (melampaui batas MAX_ALLOWED_TX_ASE = ${maxAllowed} ASE).`));
        return { success: true, skipped: true, reason: 'Exceeds MAX_ALLOWED_TX_ASE (Contract minBet is 1.0 ASE)' };
    }

    try {
        const balWei = await wallet.getBalance();
        const minRequired = BigInt(targetBets) * 1000000000000000000n; // 1 ASE per bet
        if (balWei < minRequired) {
            console.log(chalk.yellow(`[Task: AseBet] Skipped: Insufficient balance (${formatAse(balWei)} ASE). Need at least ${targetBets} ASE for bets.`));
            return { success: false, reason: 'Insufficient balance' };
        }

        const openMarkets = await getOpenMarkets(client);
        if (!openMarkets || openMarkets.length === 0) {
            console.log(chalk.yellow(`[Task: AseBet] No open markets found on AseBet currently.`));
            return { success: false, reason: 'No open markets' };
        }

        console.log(chalk.gray(`[Task: AseBet] Found ${openMarkets.length} active open markets.`));

        const results = [];
        // Shuffle or pick distinct markets if possible
        const shuffled = [...openMarkets].sort(() => 0.5 - Math.random());

        for (let i = 0; i < targetBets; i++) {
            const market = shuffled[i % shuffled.length];
            console.log(chalk.cyan(`\n[Task: AseBet] Executing Bet ${i + 1}/${targetBets}...`));

            const res = await executeSingleBet(client, wallet, market);
            results.push(res);

            if (i < targetBets - 1) {
                const delayMs = getRandomDelay(4000, 7000);
                console.log(chalk.gray(`[Task: AseBet] Waiting ${Math.round(delayMs / 1000)}s before next bet...`));
                await sleep(delayMs);
            }
        }

        const successfulBets = results.filter(r => r.success).length;
        console.log(chalk.bold.green(`[OK] [Task: AseBet] Completed ${successfulBets}/${targetBets} bets successfully on AseBet!\n`));
        return {
            success: successfulBets >= targetBets,
            successfulBets,
            totalRequested: targetBets,
            details: results
        };

    } catch (err) {
        console.log(chalk.red(`[FAIL] [Task: AseBet] Error: ${err.message}`));
        return { success: false, error: err.message };
    }
}
