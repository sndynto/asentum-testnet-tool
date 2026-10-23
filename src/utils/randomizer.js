// ==============================================================
// ASENTUM BOT RANDOMIZER UTILITIES
// Anti-sybil & on-chain uniqueness generator
// ==============================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const USED_TICKERS_FILE = path.resolve(__dirname, '../../used_tickers.json');

// Extensive List of Popular Solana Memecoins (Clean names & tickers, no numbers)
const SOLANA_MEME_SYMBOLS = [
    { name: "dogwifhat", symbol: "WIF" },
    { name: "Bonk", symbol: "BONK" },
    { name: "Popcat", symbol: "POPCAT" },
    { name: "cat in a dogs world", symbol: "MEW" },
    { name: "Book of MEME", symbol: "BOME" },
    { name: "Moo Deng", symbol: "MOODENG" },
    { name: "Peanut the Squirrel", symbol: "PNUT" },
    { name: "Goatseus Maximus", symbol: "GOAT" },
    { name: "Just a chill guy", symbol: "CHILLGUY" },
    { name: "Fartcoin", symbol: "FARTCOIN" },
    { name: "Act I The AI Prophecy", symbol: "ACT" },
    { name: "Zerebro", symbol: "ZEREBRO" },
    { name: "ai16z", symbol: "AI16Z" },
    { name: "Slerf", symbol: "SLERF" },
    { name: "Myro", symbol: "MYRO" },
    { name: "Ponke", symbol: "PONKE" },
    { name: "Wen", symbol: "WEN" },
    { name: "Michi", symbol: "MICHI" },
    { name: "Mother Iggy", symbol: "MOTHER" },
    { name: "Billy", symbol: "BILLY" },
    { name: "GigaChad", symbol: "GIGA" },
    { name: "Samoyedcoin", symbol: "SAMO" },
    { name: "Retardio", symbol: "RETARDIO" },
    { name: "Pudgy Penguins Solana", symbol: "PENGU" },
    { name: "Holy Year Luce", symbol: "LUCE" },
    { name: "Bully", symbol: "BULLY" },
    { name: "Maneki", symbol: "MANEKI" },
    { name: "Griffain", symbol: "GRIFFAIN" },
    { name: "Swarms", symbol: "SWARMS" },
    { name: "Habibi", symbol: "HABIBI" },
    { name: "Gorilla", symbol: "GOR" },
    { name: "Chex", symbol: "CHEX" },
    { name: "Degen", symbol: "DEGEN" },
    { name: "Tooker Kurlson", symbol: "TOOKER" },
    { name: "Pups", symbol: "PUPS" },
    { name: "Harambe", symbol: "HARAMBE" },
    { name: "Gummy", symbol: "GUMMY" },
    { name: "Mumu the Bull", symbol: "MUMU" },
    { name: "Hege", symbol: "HEGE" },
    { name: "Kendu Inu", symbol: "KENDU" },
    { name: "Doland Tremp", symbol: "TREMP" },
    { name: "Jeo Boden", symbol: "BODEN" },
    { name: "Klaus", symbol: "KLAUS" },
    { name: "Moonke", symbol: "MOONKE" },
    { name: "Smog", symbol: "SMOG" },
    { name: "Honk", symbol: "HONK" },
    { name: "Flokita", symbol: "FLOKITA" },
    { name: "Boba", symbol: "BOBA" },
    { name: "Chill", symbol: "CHILL" },
    { name: "Sigma", symbol: "SIGMA" },
    { name: "Frog", symbol: "FROG" },
    { name: "Chimp", symbol: "CHIMP" },
    { name: "Tora", symbol: "TORA" },
    { name: "Shinobi", symbol: "SHINOBI" },
    { name: "Ronin", symbol: "RONIN" },
    { name: "Apex", symbol: "APEX" },
    { name: "Voyage", symbol: "VOYAGE" },
    { name: "Vortex", symbol: "VORTEX" },
    { name: "Nova", symbol: "NOVA" },
    { name: "Cosmo", symbol: "COSMO" },
    { name: "Spectra", symbol: "SPECTRA" },
    { name: "Astra", symbol: "ASTRA" }
];

// 100% Organic Human Messages (NO EMOJIS, NO HASHTAGS, NO SYMBOLS)
const ORGANIC_HUMAN_POSTS = [
    "check in done for today",
    "just tested the swap and it was pretty smooth",
    "transactions confirming fast today on testnet",
    "finished my daily interactions on the network",
    "testing out the dex and launchpad today",
    "another day testing contracts and transfers",
    "testnet performance looking pretty solid so far",
    "daily tasks complete everything went through nicely",
    "tried swapping tokens earlier and finality was under two seconds",
    "keeping the daily streak going on the chain",
    "everything running smoothly on my end today",
    "testing out some of the ecosystem apps today",
    "quick check in and daily transaction done",
    "good to see block times staying consistent",
    "exploring new features and testing dex liquidity",
    "solid progress on the network today",
    "just did my daily transfer and swap",
    "testing smart contract execution on testnet",
    "glad to see network finality is quick today",
    "daily check in completed for the testnet streak",
    "smooth transaction execution on asentum testnet today",
    "logged in to do daily swaps and transfers",
    "all daily interactions confirmed without issues",
    "testing out trading pairs and contract calls today",
    "nice to see active block production today",
    "another day interacting with the network",
    "all tasks settled on chain cleanly today",
    "testing dex swaps and post quantum contract calls",
    "streak alive and daily checks all confirmed",
    "network responsiveness feels very good today"
];

// Clean human display names for on-chain profile
const HUMAN_NAMES = [
    "Alex", "David", "Lucas", "Marcus", "Ethan", "Julian", "Adrian", 
    "Ryan", "Kevin", "Daniel", "Nathan", "Felix", "Leo", "Oscar", 
    "Simon", "Victor", "Aaron", "Adam", "Colin", "Dylan"
];

/**
 * Returns a random float between min and max (strictly < 0.13 ASE)
 */
export function getRandomAseAmount(min = 0.002, max = 0.08, decimals = 4) {
    const safeMax = Math.min(max, 0.125);
    const safeMin = Math.max(min, 0.001);
    const rand = Math.random() * (safeMax - safeMin) + safeMin;
    return rand.toFixed(decimals);
}

/**
 * Returns a random delay in milliseconds (e.g. 3000 - 8000 ms)
 */
export function getRandomDelay(minMs = 3000, maxMs = 7000) {
    return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
}

/**
 * Loads used tickers from persistent file to avoid duplicate deployments across wallets
 */
function getUsedTickers() {
    try {
        if (fs.existsSync(USED_TICKERS_FILE)) {
            return JSON.parse(fs.readFileSync(USED_TICKERS_FILE, 'utf8') || '[]');
        }
    } catch (e) {
        // ignore
    }
    return [];
}

/**
 * Records used ticker persistently
 */
function recordUsedTicker(symbol) {
    try {
        const used = getUsedTickers();
        if (!used.includes(symbol)) {
            used.push(symbol);
            fs.writeFileSync(USED_TICKERS_FILE, JSON.stringify(used, null, 2));
        }
    } catch (e) {
        // ignore
    }
}

/**
 * Generates a clean Solana Memecoin Token (NO NUMBERS, NON-DUPLICATE TICKER)
 */
export function getRandomMemeToken() {
    const usedTickers = getUsedTickers();
    // Filter available tickers that haven't been used yet
    let available = SOLANA_MEME_SYMBOLS.filter(item => !usedTickers.includes(item.symbol));
    
    // If all tickers were used, reset to full list
    if (available.length === 0) {
        available = SOLANA_MEME_SYMBOLS;
    }

    const selected = available[Math.floor(Math.random() * available.length)];
    recordUsedTicker(selected.symbol);

    const supplies = [
        "1000000000000000000000000",      // 1M
        "10000000000000000000000000",     // 10M
        "100000000000000000000000000",    // 100M
        "1000000000000000000000000000"    // 1B
    ];
    const totalSupply = supplies[Math.floor(Math.random() * supplies.length)];

    return {
        name: selected.name,
        symbol: selected.symbol,
        totalSupply,
        description: `${selected.name} (${selected.symbol}) community token deployed on Asentum L1.`
    };
}

/**
 * Generates a 100% organic human post (NO EMOJIS, NO HASHTAGS, NO WEIRD SYMBOLS)
 */
export function getRandomSocialMessage() {
    return ORGANIC_HUMAN_POSTS[Math.floor(Math.random() * ORGANIC_HUMAN_POSTS.length)];
}

/**
 * Generates a clean human display profile (NO EMOJIS, NO NUMBERS IN NAME)
 */
export function getRandomProfile() {
    const name = HUMAN_NAMES[Math.floor(Math.random() * HUMAN_NAMES.length)];
    const bios = [
        "Exploring web3 and testnets.",
        "Crypto enthusiast testing decentralized protocols.",
        "Active testnet participant.",
        "Interested in post quantum cryptography and layer one networks.",
        "Web3 builder and crypto tester."
    ];
    const bio = bios[Math.floor(Math.random() * bios.length)];
    return { name, bio };
}

/**
 * Generates a custom, UNIQUE JavaScript smart contract source code.
 * Token name and symbol remain 100% clean (no numbers), while internal
 * salt ensures unique bytecode hash per deployment!
 */
export function generateUniqueSmartContract(tokenInfo) {
    const internalSalt = Math.random().toString(36).substring(2, 10);
    const timestamp = Date.now();

    return `// Solana Memecoin Smart Contract for Asentum VM
// Token: ${tokenInfo.name} | Symbol: ${tokenInfo.symbol}
// Internal deployment signature: ${internalSalt}_${timestamp}

function initialize() {
    const owner = msg.sender;
    const initialSupply = '${tokenInfo.totalSupply}';
    storage.set('name', '${tokenInfo.name}');
    storage.set('symbol', '${tokenInfo.symbol}');
    storage.set('totalSupply', initialSupply);
    storage.set('balance:' + owner, initialSupply);
    storage.set('_deploy_entropy', '${internalSalt}');
    emit('Initialized', { owner: owner, supply: initialSupply, symbol: '${tokenInfo.symbol}' });
}

function transfer(recipient, amount) {
    const sender = msg.sender;
    const senderKey = 'balance:' + sender;
    const recipientKey = 'balance:' + recipient;
    const sBal = BigInt(storage.get(senderKey) || '0');
    const amt = BigInt(amount);

    assert(amt > 0n, 'Amount must be positive');
    assert(sBal >= amt, 'Insufficient balance');

    storage.set(senderKey, (sBal - amt).toString());
    const rBal = BigInt(storage.get(recipientKey) || '0');
    storage.set(recipientKey, (rBal + amt).toString());

    emit('Transfer', { from: sender, to: recipient, value: amount.toString() });
    return true;
}

function balanceOf(account) {
    return storage.get('balance:' + account) || '0';
}
`;
}
