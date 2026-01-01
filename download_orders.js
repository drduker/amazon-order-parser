#!/usr/bin/env node
/**
 * Amazon Order History Downloader
 * Downloads all order history pages for a given year using Playwright.
 *
 * Prerequisites: Run `node login.js` first to save your Amazon session.
 *
 * Usage: node download_orders.js <year> <total-orders>
 * Example: node download_orders.js 2025 536
 */

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ORDERS_PER_PAGE = 10;
const DELAY_MS = 2000;
const STATE_FILE = 'amazon-state.json';

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    const args = process.argv.slice(2);

    if (args.length < 2) {
        console.log('Amazon Order History Downloader');
        console.log('');
        console.log('Usage: node download_orders.js <year> <total-orders>');
        console.log('');
        console.log('Arguments:');
        console.log('  year          The year to download orders for (e.g., 2025)');
        console.log('  total-orders  Approximate total number of orders');
        console.log('');
        console.log('Example:');
        console.log('  node download_orders.js 2025 536');
        console.log('');
        console.log('Prerequisites:');
        console.log('  Run `node login.js` first to save your Amazon session.');
        process.exit(1);
    }

    const year = args[0];
    const totalOrders = parseInt(args[1], 10);
    const totalPages = Math.ceil(totalOrders / ORDERS_PER_PAGE);
    const outputDir = `amazon-${year}-pages`;

    console.log('Amazon Order History Downloader');
    console.log('================================');
    console.log(`Year: ${year}`);
    console.log(`Expected orders: ${totalOrders}`);
    console.log(`Pages to download: ${totalPages}`);
    console.log(`Output directory: ${outputDir}`);
    console.log('');

    // Check for saved state
    if (!fs.existsSync(STATE_FILE)) {
        console.error(`Error: Session state not found: ${STATE_FILE}`);
        console.error('');
        console.error('Please run `node login.js` first to log into Amazon.');
        process.exit(1);
    }

    // Create output directory
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log('Launching browser...');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ storageState: STATE_FILE });
    const page = await context.newPage();

    console.log('');
    console.log('Starting download...');
    console.log('');

    for (let i = 0; i < totalPages; i++) {
        const startIndex = i * ORDERS_PER_PAGE;
        const pageNum = i + 1;

        process.stdout.write(`Downloading page ${pageNum} of ${totalPages}... `);

        try {
            const url = `https://www.amazon.com/your-orders/orders?timeFilter=year-${year}&startIndex=${startIndex}`;
            await page.goto(url, { waitUntil: 'networkidle' });

            const html = await page.content();
            const outputPath = path.join(outputDir, `page-${pageNum}.html`);
            fs.writeFileSync(outputPath, html, 'utf-8');

            // Check for CAPTCHA or login redirect
            if (html.includes('Robot Check') || html.includes('ap_email')) {
                console.log('Session expired!');
                console.log('');
                console.log('Your session has expired. Please run `node login.js` again.');
                await browser.close();
                process.exit(1);
            }

            // Count orders on page
            const orderCount = (html.match(/order-card/g) || []).length;
            console.log(`${orderCount} orders`);

            if (orderCount === 0 && i > 0) {
                console.log('  (end of orders reached)');
                break;
            }

        } catch (err) {
            console.log('Error!');
            console.error(`  ${err.message}`);
        }

        // Rate limit
        if (i < totalPages - 1) {
            await sleep(DELAY_MS);
        }
    }

    await browser.close();

    console.log('');
    console.log('Download complete!');
    console.log(`Pages saved to: ${outputDir}/`);
    console.log('');
    console.log('Next step: Parse the orders with:');
    console.log(`  node parse_orders.js ./${outputDir} amazon_orders_${year}`);
}

main().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});
