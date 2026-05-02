/**
 * @OnlyCurrentDoc
 *
 * The above comment directs Apps Script to limit the scope of file
 * access for this add-on. It specifies that this add-on will only
 * attempt to read or modify the files in which it is used, and not
 * have access to other files stored in Drive.
 */

/**
 * Creates a menu entry in the Google Sheets UI when the document is opened.
 * This is a an Editor Add-on feature and will work for scripts bound to a sheet.
 * For the published Workspace Add-on, the onHomepage trigger is the main entry point.
 *
 * @param {object} e The event parameter for a simple onOpen trigger.
 */
function onOpen(e) {
  SpreadsheetApp.getUi()
    .createMenu('GuardLabs Toolkit')
    .addItem('Open sidebar', 'showSidebar')
    .addItem('How to use', 'showHelp')
    .addSeparator()
    .addItem('Free Course →', 'openFreeCourseLink')
    .addItem('Affiliate 30-50% →', 'openAffiliateLink')
    .addToUi();
}

/**
 * The entry point for the add-on's homepage card.
 *
 * @param {object} e The event parameter.
 * @returns {CardService.Card} The card to display.
 */
function onHomepage(e) {
  const builder = CardService.newCardBuilder();
  const section = CardService.newCardSection();

  section.addWidget(CardService.newTextParagraph()
    .setText("Use custom functions in your cells or explore our resources."));

  const buttonSet = CardService.newButtonSet()
    .addButton(CardService.newTextButton()
      .setText("Free Course")
      .setOpenLink(CardService.newOpenLink()
        .setUrl("https://nexus-bot.pro")))
    .addButton(CardService.newTextButton()
      .setText("Affiliate Program")
      .setOpenLink(CardService.newOpenLink()
        .setUrl("https://guardlabs.online/partners?ref=appsscript")))
    .addButton(CardService.newTextButton()
      .setText("Help")
      .setOnClickAction(CardService.newAction()
        .setFunctionName("showHelpAction")));

  section.addWidget(buttonSet);

  builder.addSection(section);
  return builder.build();
}

/**
 * Action function to show a notification with help text.
 * This is used by the onHomepage card.
 */
function showHelpAction() {
  const helpText = `Examples:
=GUARDLABS_PRICE("BTC", "p")
=GUARDLABS_RISK(1000, 1, 50000, 49000)
=GUARDLABS_GRID(100, 200, 10)`;

  return CardService.newActionResponseBuilder()
    .setNotification(CardService.newNotification()
      .setText(helpText))
    .build();
}


/**
 * Shows the add-on sidebar.
 */
function showSidebar() {
  const html = HtmlService.createHtmlOutputFromFile('Sidebar')
    .setTitle('GuardLabs Trading Toolkit');
  SpreadsheetApp.getUi().showSidebar(html);
}

/**
 * Shows a dialog box with help text and examples.
 */
function showHelp() {
  const message = `Custom Function Examples:

1. Get Price Data:
=GUARDLABS_PRICE("BTC", "p")
(mode can be 'p' for price, 'h' for 24h high, 'l' for 24h low, 'c' for 24h change %, 'v' for 24h volume)

2. Calculate Risk:
=GUARDLABS_RISK(1000, 1, 50000, 49000)
(equity, risk %, entry price, stop loss)

3. Generate Price Grid:
=GUARDLABS_GRID(100, 200, 10)
(low price, high price, number of levels)`;

  Browser.msgBox('How to Use GuardLabs Toolkit', message, Browser.Buttons.OK);
}

/**
 * Opens the free course link in a modal dialog.
 */
function openFreeCourseLink() {
  const html = `
    <div style="font-family: sans-serif; padding: 8px;">
      <p>Click the link below to get your free course:</p>
      <a href="https://nexus-bot.pro" target="_blank">nexus-bot.pro</a>
    </div>`;
  const htmlOutput = HtmlService.createHtmlOutput(html).setWidth(300).setHeight(100);
  SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'Free Course');
}

/**
 * Opens the affiliate program link in a modal dialog.
 */
function openAffiliateLink() {
  const html = `
    <div style="font-family: sans-serif; padding: 8px;">
      <p>Click the link below for our affiliate program:</p>
      <a href="https://guardlabs.online/partners?ref=appsscript" target="_blank">guardlabs.online/partners</a>
    </div>`;
  const htmlOutput = HtmlService.createHtmlOutput(html).setWidth(350).setHeight(100);
  SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'Affiliate Program 30-50%');
}


/**
 * Fetches cryptocurrency price data from Binance.
 *
 * @param {"BTC"} symbol The cryptocurrency symbol (e.g., "BTC", "ETH") without the USDT suffix.
 * @param {"p"} [mode='p'] The data to return: 'p' for price (default), 'h' for 24h high, 'l' for 24h low, 'c' for 24h % change, 'v' for 24h volume in USDT.
 * @return {number|string} The requested data or an error message.
 * @customfunction
 */
function GUARDLABS_PRICE(symbol, mode) {
  if (!symbol) {
    return "Error: Symbol is required.";
  }

  const ticker = symbol.toUpperCase() + 'USDT';
  const cache = CacheService.getScriptCache();
  const cacheKey = 'guardlabs_price_' + ticker;
  let data;

  try {
    const cached = cache.get(cacheKey);
    if (cached) {
      data = JSON.parse(cached);
    } else {
      const response = UrlFetchApp.fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${ticker}`);
      const responseText = response.getContentText();
      data = JSON.parse(responseText);
      cache.put(cacheKey, responseText, 60); // Cache for 60 seconds
    }

    const currentMode = mode || 'p';
    switch (currentMode.toLowerCase()) {
      case 'p':
        return parseFloat(data.lastPrice);
      case 'h':
        return parseFloat(data.highPrice);
      case 'l':
        return parseFloat(data.lowPrice);
      case 'c':
        return parseFloat(data.priceChangePercent);
      case 'v':
        return parseFloat(data.quoteVolume);
      default:
        return `Error: Invalid mode '${mode}'. Use 'p', 'h', 'l', 'c', or 'v'.`;
    }
  } catch (e) {
    return `Error: ${e.message}. Invalid symbol?`;
  }
}

/**
 * Calculates position size based on risk parameters.
 *
 * @param {number} equity Total account equity.
 * @param {number} risk_pct The percentage of equity to risk (e.g., 1 for 1%).
 * @param {number} entry The entry price.
 * @param {number} sl The stop loss price.
 * @return {number|string} The calculated position size in USDT, rounded to 2 decimal places.
 * @customfunction
 */
function GUARDLABS_RISK(equity, risk_pct, entry, sl) {
  if ([equity, risk_pct, entry, sl].some(v => typeof v !== 'number' || v <= 0)) {
    return "Error: All inputs must be positive numbers.";
  }

  const price_diff = Math.abs(entry - sl);
  if (price_diff === 0) {
    return "Error: Entry and Stop Loss cannot be the same.";
  }

  const risk_usd = equity * risk_pct / 100;
  const position_size_usdt = risk_usd / (price_diff / entry);

  return parseFloat(position_size_usdt.toFixed(2));
}

/**
 * Generates a vertical grid of price levels.
 *
 * @param {number} low The lowest price of the grid.
 * @param {number} high The highest price of the grid.
 * @param {number} levels The number of levels in the grid (between 2 and 50).
 * @return {Array<Array<number>>|string} A 2D array of price levels for vertical output in Sheets.
 * @customfunction
 */
function GUARDLABS_GRID(low, high, levels) {
  if (typeof low !== 'number' || typeof high !== 'number' || typeof levels !== 'number') {
    return "Error: All inputs must be numbers.";
  }
  if (low >= high) {
    return "Error: 'low' must be less than 'high'.";
  }
  if (levels < 2 || levels > 50) {
    return "Error: 'levels' must be between 2 and 50.";
  }

  const grid = [];
  const step = (high - low) / (levels - 1);

  for (let i = 0; i < levels; i++) {
    const levelValue = low + (i * step);
    grid.push([levelValue]);
  }

  return grid;
}
