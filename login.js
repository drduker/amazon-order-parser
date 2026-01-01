#!/usr/bin/env node
/**
 * Amazon Login Helper
 * Opens a browser for manual login, then saves the session state.
 *
 * Usage: node login.js
 */

const { chromium } = require('playwright');

(async () => {
    console.log('Amazon Login Helper');
    console.log('===================');
    console.log('');
    console.log('A browser window will open. Please:');
    console.log('1. Log into your Amazon account');
    console.log('2. Complete any 2FA if prompted');
    console.log('3. Press Enter in this terminal when done');
    console.log('');

    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto('https://www.amazon.com/your-orders/orders');
    console.log('Browser opened. Log in manually, then press Enter here...');

    process.stdin.once('data', async () => {
        await context.storageState({ path: 'amazon-state.json' });
        await browser.close();
        console.log('');
        console.log('Login state saved to: amazon-state.json');
        console.log('');
        console.log('You can now run:');
        console.log('  node download_orders.js <year> <total-orders>');
        process.exit(0);
    });
})();
