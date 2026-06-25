# Bitrix24 Integration Specifications

The `BitrixService` is the data backbone of the bot, connecting it to the live CRM. Since the official Bitrix24 API can be slow and heavily rate-limited, this application connects through a custom PHP Proxy (`https://bitrix24calculatorv2.premierchoiceint.online/api/data`).

## Live Inventory Architecture
We **do not** sync the entire Bitrix database to PostgreSQL. Instead:
1. When the NestJS application starts, the `BitrixService` warms up an in-memory cache using `@nestjs/common`'s `onApplicationBootstrap`.
2. It fetches all projects, units, and inventory states from the proxy into memory arrays (`this.cachedUnits`).
3. This guarantees that `search_units` resolves instantly (<10ms) without network latency.

## Edge Cases and Parsing
Bitrix24's custom fields are often inconsistent. The `BitrixService` implements specific normalization logic to standardize these fields so the AI agent does not get confused.

### 1. The Box Park 3 Exception
Certain projects (like Box Park 3) are sold on "Gross Area" instead of "Net Area".
The `BitrixService` intercepts these specific project IDs and overrides the area string mapping to use the correct custom field so the bot does not underquote the property size.

### 2. Status Normalization
The Bitrix API returns numerical IDs or varied strings for unit status (e.g., "753", "Available", "Sold").
The `normalizeUnit` function converts all variations into a strict boolean flag (`available: true | false`). Only available units are exposed to the AI model during `search_units`.

### 3. Price Formatting
Prices are heavily sanitized inside `getNormalizedUnit()`. 
Any comma-separated string (e.g. `23,500,000`) is stripped of characters, parsed as a float, and formatted consistently for the `pdf-lib` payment generator logic.

## Security
The `BitrixService` communicates over standard `HTTPS`. It does not require an API key in the header because the intermediate PHP proxy handles the actual CRM webhook authentication. Therefore, `BITRIX_API_BASE` should never be exposed to the end-user.
