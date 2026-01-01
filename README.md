# Amazon Order History Parser

Parse and categorize your Amazon order history into CSV files with spending breakdowns by category.

## Features

- Downloads Amazon order history pages
- Parses order details: ID, date, total, shipping recipient, products
- Auto-categorizes products into 25+ categories
- Detects Whole Foods / Amazon Fresh orders
- Exports detailed CSV with all orders
- Exports summary CSV with category totals
- Direct links to order details on Amazon

## Prerequisites

- Node.js (v14 or later)
- npm

## Installation

```bash
cd amazon-order-parser
npm install
```

## Usage

### Step 1: Login to Amazon

Run the login script to open a browser and save your session:

```bash
node login.js
```

This will:
1. Open a browser window to Amazon
2. Wait for you to log in manually (including any 2FA)
3. Press Enter in the terminal when done
4. Save the session to `amazon-state.json`

### Step 2: Download Order History Pages

```bash
# Download orders (specify year and approximate total orders)
node download_orders.js 2025 536
```

This will download all pages to `amazon-2025-pages/`.

### Step 3: Parse the Orders

```bash
# Parse orders and generate CSV files
node parse_orders.js ./amazon-2025-pages amazon_orders_2025
```

This will create:
- `amazon_orders_2025.csv` - All orders with details
- `amazon_orders_2025_summary.csv` - Category breakdown with totals

## Output Files

### Orders CSV (`amazon_orders_YYYY.csv`)

| Column | Description |
|--------|-------------|
| Order ID | Amazon order number (xxx-xxxxxxx-xxxxxxx) |
| Order Date | Date order was placed |
| Total | Order total amount |
| Ship To | Recipient name |
| Category | Product category (or multiple separated by `\|`) |
| Product Count | Number of items in order |
| Products | Product names (separated by `\|`) |
| Order Link | Direct URL to order details on Amazon |

### Summary CSV (`amazon_orders_YYYY_summary.csv`)

| Column | Description |
|--------|-------------|
| Category | Product category name |
| Order Count | Number of orders in category |
| Total Spent | Total amount spent in category |

## Categories

The parser automatically categorizes products into these categories:

- Baby & Kids
- Books
- Clothing & Accessories
- Kitchen & Dining
- Health & Personal Care
- Home & Garden
- Electronics
- Toys & Games
- Grocery
- Pet Supplies
- Beauty & Makeup
- Supplements
- Beverages
- Sports & Outdoors
- Travel Accessories
- Office & School
- Cleaning & Vacuum
- Pool & Lawn
- Auto & Vehicle
- TV & Mounting
- HVAC & Furnace
- Tools & Hardware
- Arts & Crafts
- Party Supplies
- Insect Repellent
- Whole Foods / Amazon Fresh (auto-detected from order URL)
- Other / Unknown

## Customizing Categories

Edit the `CATEGORIES` object in `parse_orders.js` to add or modify categories:

```javascript
const CATEGORIES = {
    'My Custom Category': ['keyword1', 'keyword2', 'product name'],
    // ...
};
```

Keywords are matched case-insensitively against product names.

## Example Output

```
Found 54 HTML files to process...
  page-1.html: 10 orders
  page-2.html: 10 orders
  ...

Total orders found: 536

CSV exported to: amazon_orders_2025.csv
Category summary exported to: amazon_orders_2025_summary.csv

Category breakdown:
  Whole Foods / Amazon Fresh: 65 orders, $8302.18
  Baby & Kids: 211 orders, $7303.25
  Kitchen & Dining: 61 orders, $2035.59
  ...

Summary:
  Total orders: 536
  Total spent: $27299.22
```

## Troubleshooting

### Session expired
If you see "Session expired" when downloading:
1. Run `node login.js` again to refresh your session
2. Complete any 2FA prompts in the browser

### CAPTCHA detected
If Amazon shows a CAPTCHA:
1. Wait a few minutes before trying again
2. Run `node login.js` to get a fresh session

### No orders found
- Make sure you're logged into Amazon
- Run `node login.js` to refresh your session
- Verify the year has orders

### Products showing as "Other" or "Unknown"
- "Unknown" = Whole Foods/Fresh orders (no product details on order list page)
- "Other" = Add keywords to the CATEGORIES object in `parse_orders.js`

## License

MIT
