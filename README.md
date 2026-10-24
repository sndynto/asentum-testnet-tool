# Asentum Testnet Tool

Perangkat baris perintah (CLI) untuk interaksi jaringan dan pengujian fungsi on-chain pada Asentum Testnet.

## Fitur Interaksi

1. ASocial: Interaksi profil dan publikasi pesan teks ke kontrak `AsentumPosts`.
2. Transfer: Transaksi pengiriman ASE harian antar wallet (daisy-chain) atau ke alamat tujuan.
3. Auras DEX Swap: Swap token melalui Auras Router.
4. Auras Liquidity: Penambahan likuiditas ke Pool 1 Auras.
5. AseDex Swap: Swap token pada kontrak AMM AseDex (`ase1cwpnkultxqjz9z09xwe7jlztw2uhuf8fklhzsm`).
6. Deploy Smart Contract: Deployment smart contract token berbasis JavaScript VM dengan ticker memecoin Solana unik.
7. AsePad Buy: Pembelian token bonding curve pada platform AsePad (`ase1r57zd8sstugu4km2axf7ar85q0fj793vdlzt6v`).
8. AseBet: Penempatan taruhan pada pasar prediksi terbuka di AseBet (`0xc91aef943a1a0e587e6b57959de0692d1a704879`).
9. ASE Vegas Treasure: Penggalian petak sel (dig a cell) pada game perburuan harta karun (`ase1znfss8jyag09x9c570cjn5cyxk3v6zta3z27lr`).
10. Validator Monitor: Pengecekan status node dan riwayat penandatanganan blok validator.

## Kebijakan Transaksi

- Nilai transaksi dibatasi acak di bawah 0.13 ASE (antara 0.002 hingga 0.08 ASE).
- Pesan pada ASocial menggunakan teks natural tanpa emotikon, simbol, atau tanda pagar.
- Ticker token menggunakan referensi memecoin Solana tanpa angka di akhir dan dilacak secara lokal untuk mencegah duplikasi.
- Jeda waktu acak diterapkan antar-eksekusi tugas dan antar-akun.

## Instalasi

1. Pastikan Node.js (v18 ke atas) telah terpasang.
2. Pasang dependensi proyek:

```bash
npm install
```

## Konfigurasi

### 1. Daftar Wallet

Tambahkan private key (format 64 hex) atau seed phrase (12/24 kata) ke dalam file `wallets.txt`, satu akun per baris:

```text
word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12
0x1111111111111111111111111111111111111111111111111111111111111111
```

Catatan: File `wallets.txt` telah masuk dalam daftar `.gitignore` sehingga tidak akan terunggah ke repositori Git.

### 2. File Environment

Salin file contoh konfigurasi:

```bash
cp .env.example .env
```

Sesuaikan nilai di dalam `.env` jika diperlukan (RPC URL, penjadwalan cron, atau pengaturan tugas aktif).

## Menjalankan

### Eksekusi Sekali (Manual)

Untuk menjalankan seluruh tugas satu kali untuk semua akun terdaftar:

```bash
npm start
```

### Eksekusi AseBet Saja

Untuk memasang taruhan di AseBet:

```bash
npm run bet:asebet
```

### Eksekusi ASE Vegas Treasure Saja

Untuk menggali sel di ASE Vegas Treasure:

```bash
npm run dig:treasure
```

### Penjadwal Harian

Untuk menjalankan proses secara terjadwal setiap hari (default pukul 01:00):

```bash
npm run start:daily
```

### Penjadwal Faucet 6 Jam

Untuk menjalankan pengecekan dan klaim faucet berkala setiap 6 jam:

```bash
npm run faucet:6h
```
