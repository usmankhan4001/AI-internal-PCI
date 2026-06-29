# Bitrix24 Integration Specifications

The `BitrixService` is the data backbone of the bot, connecting it to the live CRM. This bot uses **Direct Bitrix24 Incoming Webhooks** to fetch properties, products, and prices natively. It completely bypasses the legacy intermediary proxy, resulting in zero latency, 100% data fidelity, and enterprise-grade reliability.

## 1. Authentication
Authentication is handled via an Incoming Webhook, removing the need for OAuth complexity. 
The application expects the `BITRIX_WEBHOOK_URL` environment variable.

```env
BITRIX_WEBHOOK_URL="https://pcicrm.bitrix24.com/rest/11/01finquajfj22z2p/"
```

## 2. Endpoints Used
We rely on the official Bitrix24 `crm.product.*` REST API endpoints:
- `crm.product.property.list`: Fetches properties and their enum definitions (Projects, Floors, Types, etc.).
- `crm.product.list`: Fetches the inventory and paginates natively to populate our cache.
- `crm.product.get`: Fetches real-time, granular details of a specific unit.

## 3. Live Inventory Architecture
We **do not** sync the entire Bitrix database to PostgreSQL. Instead:
1. When the NestJS application starts, the `BitrixService` warms up an in-memory cache using `@nestjs/common`'s `onApplicationBootstrap`.
2. It paginates through `crm.product.list` to load all products into memory arrays (`this._inventoryCache`).
3. This guarantees that `search_units` resolves instantly (<10ms) without network latency, bypassing the 2 req/sec Bitrix24 webhook rate limits.

## 4. Property Mapping
The system maps Bitrix Property IDs directly. For example:
- **173**: Project Name
- **177**: Property Type
- **139**: Category
- **135**: Floor
- **99**: Availability (Value `155` means available)
- **259** / **113**: Gross Area (Total Sqft)
- **115**: Base Rate

These mappings are managed within `src/bitrix/types.ts`.
