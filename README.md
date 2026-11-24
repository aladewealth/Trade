# Trade

Crypto profit and loss calculator. Enter an entry price, an exit price, and an investment amount to see profit or loss, ROI, exit value, and position size.

The math runs in the browser. There is no account, no server, and no market-data API.

## Use it

Open `index.html` in a browser.

Profit or loss = investment × (exit − entry) ÷ entry  
ROI = profit or loss ÷ investment

Green means profit. Red means loss. Equal prices are breakeven. Reset clears the position.

## Check the math

```bash
node calc.test.js
```

IBM Plex Sans is included under the SIL Open Font License. See `fonts/OFL.txt`.
