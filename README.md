# FrostTrack — Arduino IoT Refrigerator Monitoring

**Frontend + backend:** Next.js on Vercel  
**Database:** Neon PostgreSQL (separate service)  
**IoT side:** Arduino Mega 2560, four HX711 load-cell modules, four DS18B20 sensors, W5500 Ethernet, optional local HTTPS-forwarding gateway.

This is the cleaned project source. No demo HTML preview or old duplicate setup guides are included. All application code, Arduino firmware, database schema/migrations, gateway and tests are retained.

## Features

- Manager login using accounts and password hashes stored in PostgreSQL.
- Monitor Chicken, Beef, Mutton and Keema weight/temperature.
- Color-coded stock and temperature alerts; demo sensor reading controls.
- Reorder quantity = maximum compartment capacity − current weight.
- Approve, cancel, or mark placed orders received; retain order history.
- **After approving an order:** acknowledge that compartment's low-stock alert and don't recreate it while a `placed` order exists. If the order is cancelled while stock is still low, an alert may reopen. Temperature alerts are independent.

## One-time setup

1. Run `npm install` from the project root.
2. Create a **Neon PostgreSQL** database. In Neon SQL Editor, run `sql/schema.sql` **for a new database**.
   - If your Neon DB already contains FrostTrack tables, do **not** reset it. Apply only the needed migrations:
     - `sql/manager_auth_migration.sql` for the `managers` table;
     - `sql/order_cancellation_migration.sql` for older `orders` tables lacking cancellation fields.
     - `sql/resolve_existing_order_alerts.sql` **once** if you already have `placed` orders and old low-stock alerts are still open.
   - In particular, the existing Neon production database with cancellation fields already added needs **no repeated cancellation migration**.
3. Copy `.env.example` to `.env.local` (never commit it) and set:

```env
DATABASE_URL=postgresql://YOUR_NEON_CONNECTION_URL
SESSION_SECRET=YOUR_RANDOM_32_PLUS_CHARACTER_SECRET
DEVICE_API_KEY=YOUR_DIFFERENT_RANDOM_20_PLUS_CHARACTER_KEY
```

4. Create or update your manager account in Neon:

```bash
npm run manager:create
```

5. Run and test locally:

```bash
npm run dev
npm test
```

Open http://localhost:3000 and log in with the manager email/password.

## Deploy to Vercel

- Push the **contents of this FrostTrack folder** to the connected GitHub repository.
- Vercel framework **Next.js**; project root is this folder. `npm run build` is the build command.
- Add `DATABASE_URL`, `SESSION_SECRET`, and `DEVICE_API_KEY` under **Vercel → Project → Settings → Environment Variables** (Production) and redeploy.
- **Do not** set `MANAGER_PASSWORD`: manager credentials are held in the `managers` database table.
- Frontend and `/api/*` routes are deployed in the **same Vercel app**. PostgreSQL stays in Neon, not inside Vercel.

## Main folders

```text
app/          Next.js UI and backend API route handlers
components/   React context/provider wiring
lib/          Database, auth, inventory, configuration, order rules
store/        Redux store
sql/          Fresh schema and safe production migrations
scripts/      One-time manager creation script
arduino/      Arduino Mega + W5500 firmware sketch
gateway/      Local Arduino HTTP → cloud HTTPS forwarding (optional hardware flow)
tests/        Application unit tests
```

## Backend endpoints

| Route | Purpose |
|---|---|
| `POST /api/auth/login` | Manager authentication (email/password) |
| `POST /api/auth/logout` | Sign out |
| `GET /api/auth/me` | Verify logged-in session |
| `GET /api/dashboard` | Current inventory, alerts, orders and history |
| `POST /api/demo/update` | Simulate a weight/temperature reading |
| `POST /api/telemetry` | IoT telemetry via authorized device key |
| `POST /api/orders` | Approve/create purchase order and acknowledge low-stock alert |
| `POST /api/orders/:id/cancel` | Cancel a placed order |
| `POST /api/orders/:id/received` | Mark order received |

## Physical hardware note

The Arduino sketch is an example for calibrated physical hardware, not proof of verified end-to-end IoT deployment. Arduino Mega + W5500 commonly uses plain HTTP on a local LAN; the `gateway/gateway.mjs` process can forward readings via HTTPS to Vercel. Run that gateway on a laptop/Raspberry Pi on the same trusted LAN as the Arduino. Protect local HTTP access and never put device/database secrets in browser code.

Wiring: HX711 Chicken D22/D23, Beef D24/D25, Mutton D26/D27, Keema D28/D29; temperatures D30–D33; warning LED D34; W5500 MISO D50, MOSI D51, SCK D52 and CS D10 (depending on module). Confirm board power/voltage compatibility and calibrate load cells.

## Validation

`npm test` checks the existing Node test suite. A successful test run does **not** prove live Neon connectivity or deployment; verify database migrations and dashboard behavior on your Vercel site separately. Purchase orders are recorded in PostgreSQL but not automatically sent to external suppliers.
