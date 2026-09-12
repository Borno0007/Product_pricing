# PricePilot

PricePilot is a browser-based product pricing and revenue simulator. Adjust pricing assumptions, compare scenarios, review demand and profitability charts, and export a CSV report.

## Run locally

No build step is required. Open `index.html` in a modern browser, or serve the folder with any local static file server.

For example, with Python installed:

```powershell
python -m http.server 8000
```

Then open <http://localhost:8000>.

## Features

- Product price, cost, demand, marketing, discount, elasticity, and competitor inputs
- Automatic revenue, profit, margin, break-even, and ROI calculations
- Demand, performance, cost, and break-even charts
- Premium, balanced, and market-penetration pricing scenarios
- Editable project name, workspace name, and organization name
- Light and dark themes
- Scenario saving, report printing, and CSV export

Profile and theme settings are stored in the browser's local storage. Chart rendering uses Chart.js from jsDelivr.
