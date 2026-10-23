import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { AsentumClient, AsentumWallet } from '@asentum/sdk';
import * as bip39 from 'bip39';
import dotenv from 'dotenv';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Parses a single private key or mnemonic string into an AsentumWallet instance
 */
export async function parseWallet(client, inputString, publicKeyInput = '') {
    const raw = (inputString || '').trim();
    if (!raw) return null;

    // 1. Check if 12/24-word Mnemonic
    const words = raw.split(/\s+/);
    if (words.length >= 12 && bip39.validateMnemonic(raw)) {
        const seed = await bip39.mnemonicToSeed(raw);
        const seed32 = seed.subarray(0, 32);
        const wallet = AsentumWallet.fromSeed(client, seed32);
        return { wallet, type: 'mnemonic' };
    }

    // 2. Check if raw Dilithium SK + PK pair
    if (publicKeyInput) {
        const wallet = AsentumWallet.fromSecretKey(client, raw, publicKeyInput);
        return { wallet, type: 'secretKeyWithPublicKey' };
    }

    // 3. Hex Seed / 32-byte Private Key (64 hex characters)
    let hex = raw;
    if (hex.startsWith('0x') || hex.startsWith('0X')) {
        hex = hex.slice(2);
    }

    if (hex.length === 64) {
        const seedBytes = new Uint8Array(Buffer.from(hex, 'hex'));
        const wallet = AsentumWallet.fromSeed(client, seedBytes);
        return { wallet, type: 'hexSeed32' };
    }

    if (hex.length > 1000) {
        throw new Error('Full Dilithium Secret Key provided without PUBLIC_KEY. Please provide 32-byte seed or mnemonic.');
    }

    throw new Error(`Unrecognized key format (Length: ${raw.length}). Expected: 12/24-word mnemonic or 64-char hex seed.`);
}

/**
 * Loads all wallets from wallets.txt or fallback to .env
 */
export async function loadAllWallets() {
    const rpcUrl = process.env.RPC_URL || 'https://testnet.asentum.com';
    const client = new AsentumClient(rpcUrl);

    const walletsList = [];
    const walletsFilePath = path.resolve(__dirname, '../wallets.txt');

    // 1. Check wallets.txt
    if (fs.existsSync(walletsFilePath)) {
        const fileContent = fs.readFileSync(walletsFilePath, 'utf8');
        const lines = fileContent.split('\n');

        for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
            const trimmed = lines[lineIdx].trim();
            if (!trimmed || trimmed.startsWith('#')) continue;

            try {
                const parsed = await parseWallet(client, trimmed);
                if (parsed) {
                    walletsList.push({
                        client,
                        wallet: parsed.wallet,
                        type: parsed.type,
                        index: walletsList.length + 1
                    });
                }
            } catch (err) {
                console.error(`[Wallet Load Error] Line #${lineIdx + 1}: ${err.message}`);
            }
        }
    }

    // 2. If wallets.txt is empty, fallback to .env PRIVATE_KEY
    if (walletsList.length === 0) {
        const envKey = (process.env.PRIVATE_KEY || '').trim();
        const envPub = (process.env.PUBLIC_KEY || '').trim();

        if (envKey) {
            const parsed = await parseWallet(client, envKey, envPub);
            walletsList.push({
                client,
                wallet: parsed.wallet,
                type: parsed.type,
                index: 1
            });
        }
    }

    if (walletsList.length === 0) {
        throw new Error(
            'Tidak ada wallet yang ditemukan! Masukkan private key / mnemonic di file wallets.txt atau di file .env'
        );
    }

    return { client, walletsList };
}
