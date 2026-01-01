#!/usr/bin/env node
/**
 * Amazon Order History Parser
 * Parses Amazon order history HTML pages and exports to CSV with categorization.
 *
 * Usage: node parse_orders.js <input-directory> [output-prefix]
 * Example: node parse_orders.js ./amazon-2025-pages amazon_orders_2025
 */

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

// Category definitions with keywords
const CATEGORIES = {
    'Books': ['book', 'edition', 'hardcover', 'paperback', 'novel', 'bible', 'guide', 'story', 'tales', 'reading', 'god gave us', 'big sister', 'big brother', 'tiny toes', 'enneagram', 'good pictures bad pictures', 'when a snore', 'don\'t forget to remember', 'the common rule', 'hello, world', 'snow thief', 'leaf thief', 'berenstain bears', 'when i pray', 'are you my mother', 'kisses, cuddles', 'time to brush', 'tops & bottoms', 'goodbye summer', 'goodbye autumn', 'hello autumn', 'hello winter'],
    'Baby & Kids': ['baby', 'infant', 'toddler', 'kids', 'children', 'child', 'boys', 'girls', 'diaper', 'cradle', 'stroller', 'pacifier', 'nursery', 'crib', 'grosmimi', 'kiddie', 'oxo tot', 'bottle brush', 'nipple cleaner', 'pigeon silicone nipple', 'kid-proof case', 'fire hd 8', 'safety 1st', 'outsmart'],
    'Toys & Games': ['toy', 'game', 'puzzle', 'lego', 'doll', 'action figure', 'monster jam', 'playset', 'cards for kids', 'swing', 'secret hitler', 'board game', 'magna-tiles', 'magnetic construction', 'balloons', 'balloon arch', 'ping pong', 'table tennis'],
    'Kitchen & Dining': ['kitchen', 'cooking', 'baking', 'bread', 'banneton', 'sourdough', 'jar', 'towel', 'dish', 'table runner', 'tablecloth', 'parchment', 'container', 'grill cover', 'traeger', 'bucket', 'food grade storage', 'spatula', 'turner', 'tortilla press', 'cast iron'],
    'Health & Personal Care': ['vitamin', 'supplement', 'medicine', 'health', 'nasal', 'dental', 'toothbrush', 'soap', 'shampoo', 'lotion', 'skincare', 'mints', 'elderberr', 'toothpaste', 'gum', 'xylitol', 'propolis', 'boiron', 'sleep aid', 'insect sting', 'bug bite', 'bite relief', 'knee pain', 'therapeutic', 'razor', 'shave', 'lubricant', 'styling powder', 'foot repair', 'foot cream', 'first honey', 'dead sea salt', 'bath salt', 'sunscreen', 'spf', 'lip balm', 'manuka honey', 'wedderspoon'],
    'Beauty & Makeup': ['makeup', 'cosmetic', 'beauty', 'lipstick', 'mascara', 'nail', 'zipper case', 'zipper pouch', 'toiletry', 'hair brush', 'wet brush', 'detangler', 'hair clippers', 'barber', 'neck duster', 'trimmer'],
    'Home & Garden': ['home', 'decor', 'furniture', 'garden', 'plant', 'bird feeder', 'bird food', 'wall decal', 'sticker', 'door lock', 'door monkey', 'kwikset', 'pillow', 'bedding', 'bedsure', 'solar fence', 'fence lights', 'valance clips', 'shade cord', 'roman shades', 'window visors', 'rain guards', 'bean bag', 'shoe organizer', 'hanging organizer', 'wall plate', 'keystone'],
    'Electronics': ['electronic', 'battery', 'batteries', 'charger', 'cable', 'phone', 'computer', 'speaker', 'headphone', 'bluetooth', 'ring pan-tilt', 'ring cam', 'indoor cam', 'smart motion sensor', 'dimmer switch', 'alexa', 'server rack', 'ethernet adapter', 'usb c', 'usb-c', 'wavlink'],
    'Clothing & Accessories': ['shirt', 'pants', 'dress', 'shoes', 'jacket', 'coat', 'hat', 'costume', 'cape', 'outfit', 'sandal', 'skechers', 'jeans', 'democracy women', 'shorts', 'jogger', 'flip flop', 'reef', 'sneaker', 'bralette', 'bra', 'sweater', 'blouse', 'women\'s', 'womens', 'marika', 'willit', 'zac & rachel', 'qinsen', 'dr. scholl'],
    'Pet Supplies': ['pet', 'dog', 'cat', 'bird seed', 'pet food', 'collar', 'leash'],
    'Office & School': ['office', 'school', 'pen', 'pencil', 'notebook', 'desk', 'stapler', 'folder'],
    'Grocery': ['grocery', 'snack', 'coffee', 'tea', 'organic', 'spam'],
    'Sports & Outdoors': ['sport', 'exercise', 'fitness', 'camping', 'hiking', 'bike', 'swimming', 'gym people', 'athletic', 'workout', 'running shorts'],
    'Beverages': ['sparkling water', 'spindrift', 'soda', 'juice', 'beverage', 'drink', 'just water', 'spring water'],
    'Supplements': ['peptide', 'creatine', 'bpc 157', 'fenbendazole', 'iverrectin', 'ivermectin', 'capsules', 'momentous', 'protein powder', 'tablets 99'],
    'Travel Accessories': ['packing cubes', 'luggage', 'fanny pack', 'belt bag', 'travel organizer', 'bagail'],
    'Pool & Lawn': ['inflatable', 'sprinkler', 'pool', 'intex', 'rain bird', 'melnor', 'hose', 'lawn'],
    'Cleaning & Vacuum': ['roborock', 'vacuum', 'broom', 'mop', 'cleaning', 'replacement parts', 'water filter', 'refrigerator filter', 'excelpure'],
    'Insect Repellent': ['repellent', 'insect', 'mosquito', 'picaridin', 'ranger ready'],
    'Auto & Vehicle': ['car fuse', 'fuse kit', 'vehicle', 'automotive', 'window visors', 'nissan', 'car'],
    'TV & Mounting': ['tv mount', 'tv wall mount', 'mounting dream', 'tv bracket', 'full motion'],
    'HVAC & Furnace': ['furnace', 'carrier', 'limit switch', 'flame sensor', 'hvac', 'hh18'],
    'Tools & Hardware': ['wrench', 'armorers', 'tool', 'hardware'],
    'Arts & Crafts': ['clasps', 'necklaces', 'jewelry making', 'beads', 'connectors'],
    'Party Supplies': ['party set', 'tableware', 'first trip around the sun', 'birthday party', 'disposable plates'],
};

function categorizeProduct(productName) {
    const lowerName = productName.toLowerCase();

    for (const [category, keywords] of Object.entries(CATEGORIES)) {
        for (const keyword of keywords) {
            if (lowerName.includes(keyword.toLowerCase())) {
                return category;
            }
        }
    }
    return 'Other';
}

function categorizeOrder(products, orderLink = '') {
    if (products.length === 0) {
        // Check if it's a Whole Foods order based on the link
        if (orderLink.includes('fopo') || orderLink.includes('wwgs') || orderLink.includes('uff')) {
            return 'Whole Foods / Amazon Fresh';
        }
        return 'Unknown';
    }

    const categories = products.map(p => categorizeProduct(p));
    const uniqueCategories = [...new Set(categories)];
    return uniqueCategories.join(' | ');
}

function parseOrderCard($, orderCard) {
    const order = {
        orderId: '',
        orderDate: '',
        total: '',
        shipTo: '',
        orderLink: '',
        products: []
    };

    // Extract order ID (pattern: xxx-xxxxxxx-xxxxxxx)
    const orderIdSpan = $(orderCard).find('span.a-color-secondary').filter((i, el) => {
        const text = $(el).text().trim();
        return /^\d{3}-\d{7}-\d{7}$/.test(text);
    });
    if (orderIdSpan.length) {
        order.orderId = orderIdSpan.first().text().trim();
    }

    // Find order header section
    const orderHeader = $(orderCard).find('.order-header');

    // Find all label/value pairs in the header
    orderHeader.find('.a-column').each((i, col) => {
        const label = $(col).find('.a-text-caps').text().trim().toLowerCase();
        const value = $(col).find('.aok-break-word').text().trim();

        if (label.includes('order placed')) {
            order.orderDate = value;
        } else if (label.includes('total')) {
            order.total = value;
        } else if (label.includes('ship to')) {
            order.shipTo = value;
        }
    });

    // Extract product titles
    $(orderCard).find('.yohtmlc-product-title a').each((i, el) => {
        const productName = $(el).text().trim();
        if (productName) {
            order.products.push(productName);
        }
    });

    // Extract order details link
    const orderDetailsLink = $(orderCard).find('a[href*="order-details"]').first();
    if (orderDetailsLink.length) {
        const href = orderDetailsLink.attr('href');
        order.orderLink = `https://www.amazon.com${href}`;
    } else if (order.orderId) {
        order.orderLink = `https://www.amazon.com/gp/your-account/order-details?orderID=${order.orderId}`;
    }

    return order;
}

function parseHtmlFile(filepath) {
    const content = fs.readFileSync(filepath, 'utf-8');
    const $ = cheerio.load(content);

    const orders = [];
    $('.order-card.js-order-card').each((i, card) => {
        const order = parseOrderCard($, card);
        if (order.orderId) {
            orders.push(order);
        }
    });

    return orders;
}

function escapeCSV(value) {
    if (typeof value !== 'string') return value;
    if (value.includes('"') || value.includes(',') || value.includes('\n')) {
        return '"' + value.replace(/"/g, '""') + '"';
    }
    return value;
}

function main() {
    const args = process.argv.slice(2);

    if (args.length < 1) {
        console.log('Amazon Order History Parser');
        console.log('');
        console.log('Usage: node parse_orders.js <input-directory> [output-prefix]');
        console.log('');
        console.log('Arguments:');
        console.log('  input-directory   Directory containing page-*.html files');
        console.log('  output-prefix     Optional prefix for output files (default: amazon_orders)');
        console.log('');
        console.log('Example:');
        console.log('  node parse_orders.js ./amazon-2025-pages amazon_orders_2025');
        process.exit(1);
    }

    const inputDir = path.resolve(args[0]);
    const outputPrefix = args[1] || 'amazon_orders';

    if (!fs.existsSync(inputDir)) {
        console.error(`Error: Input directory not found: ${inputDir}`);
        process.exit(1);
    }

    const allOrders = [];

    // Find all page-*.html files and sort numerically
    const files = fs.readdirSync(inputDir)
        .filter(f => f.match(/^page-\d+\.html$/))
        .sort((a, b) => {
            const numA = parseInt(a.match(/\d+/)[0]);
            const numB = parseInt(b.match(/\d+/)[0]);
            return numA - numB;
        });

    if (files.length === 0) {
        console.error('Error: No page-*.html files found in input directory');
        process.exit(1);
    }

    console.log(`Found ${files.length} HTML files to process...`);

    for (const file of files) {
        const filepath = path.join(inputDir, file);
        const orders = parseHtmlFile(filepath);
        console.log(`  ${file}: ${orders.length} orders`);
        allOrders.push(...orders);
    }

    console.log(`\nTotal orders found: ${allOrders.length}`);

    // Write to CSV
    const csvPath = `${outputPrefix}.csv`;
    const headers = ['Order ID', 'Order Date', 'Total', 'Ship To', 'Category', 'Product Count', 'Products', 'Order Link'];

    let csvContent = headers.join(',') + '\n';

    for (const order of allOrders) {
        const category = categorizeOrder(order.products, order.orderLink);
        const row = [
            escapeCSV(order.orderId),
            escapeCSV(order.orderDate),
            escapeCSV(order.total),
            escapeCSV(order.shipTo),
            escapeCSV(category),
            order.products.length,
            escapeCSV(order.products.join(' | ')),
            escapeCSV(order.orderLink)
        ];
        csvContent += row.join(',') + '\n';
    }

    fs.writeFileSync(csvPath, csvContent, 'utf-8');
    console.log(`\nCSV exported to: ${csvPath}`);

    // Category breakdown with spending
    const categoryStats = {};
    for (const order of allOrders) {
        const cats = categorizeOrder(order.products, order.orderLink).split(' | ');
        const amount = parseFloat(order.total.replace(/[$,]/g, '')) || 0;
        const amountPerCat = amount / cats.length;
        for (const cat of cats) {
            if (!categoryStats[cat]) {
                categoryStats[cat] = { count: 0, total: 0 };
            }
            categoryStats[cat].count += 1;
            categoryStats[cat].total += amountPerCat;
        }
    }

    // Write category summary CSV
    const summaryCsvPath = `${outputPrefix}_summary.csv`;
    const summaryHeaders = ['Category', 'Order Count', 'Total Spent'];
    let summaryCsvContent = summaryHeaders.join(',') + '\n';

    const sortedCategories = Object.entries(categoryStats)
        .sort((a, b) => b[1].total - a[1].total);

    for (const [cat, stats] of sortedCategories) {
        const row = [
            escapeCSV(cat),
            stats.count,
            `$${stats.total.toFixed(2)}`
        ];
        summaryCsvContent += row.join(',') + '\n';
    }

    // Add grand total row
    const grandTotalCount = allOrders.length;
    const grandTotalSpent = allOrders.reduce((sum, order) => {
        const amount = parseFloat(order.total.replace(/[$,]/g, '')) || 0;
        return sum + amount;
    }, 0);
    summaryCsvContent += `TOTAL,${grandTotalCount},$${grandTotalSpent.toFixed(2)}\n`;

    fs.writeFileSync(summaryCsvPath, summaryCsvContent, 'utf-8');
    console.log(`Category summary exported to: ${summaryCsvPath}`);

    console.log('\nCategory breakdown:');
    for (const [cat, stats] of sortedCategories) {
        console.log(`  ${cat}: ${stats.count} orders, $${stats.total.toFixed(2)}`);
    }

    console.log(`\nSummary:`);
    console.log(`  Total orders: ${grandTotalCount}`);
    console.log(`  Total spent: $${grandTotalSpent.toFixed(2)}`);
}

main();
