## Manager login now uses Neon (updated)

See **`DB_LOGIN_SETUP_Roman_Urdu.md`** for the exact migration and one-time user creation steps.

- Run `sql/manager_auth_migration.sql` on your existing Neon production database.
- Add `DATABASE_URL` to local `.env.local`, then run `npm run manager:create` to create/reset a manager account without storing a plain-text password.
- Login requires **email + password**. Old password-only cookies are invalidated.
- In Vercel only `DATABASE_URL`, `SESSION_SECRET` and `DEVICE_API_KEY` remain; `MANAGER_PASSWORD` is no longer used.

# FrostTrack | Next.js + Vercel + Neon PostgreSQL

Full-stack live classroom-demo application for **Arduino Mega 2560 Smart Meat Refrigerator**.

- Frontend: **Next.js App Router + React + Redux Toolkit**
- Backend: **Next.js Route Handlers (Node.js) on Vercel**
- Persistent database: **Neon PostgreSQL** (runs separately, connected to Vercel)
- Data: Chicken, Beef, Mutton, Keema (Mince)
- Features: 4 inventory cards, temperature warning >4°C, low-stock alert, simulator, purchase-order approval, mark received, history, simple protected manager dashboard
- Hardware example: Mega + HX711 x4 + DS18B20 x4 + W5500 Ethernet + local HTTP→HTTPS gateway

## Architecture

```text
Physical setup:                     Web/cloud:
Load cells x4 -> HX711 x4 --\       ┌─ Vercel Next.js API (/api/telemetry) ── Neon PostgreSQL
DS18B20 x4 ----------------> Mega -> W5500 -> Ethernet LAN gateway -> HTTPS ────┘
                                   └─ Vercel Next.js dashboard + Redux <- API
                                      Manager → approve → Purchase Order

Live classroom demo (no hardware needed):
Dashboard "Simulate reading" → POST /api/demo/update → SAME PostgreSQL → dashboard refresh (5 s)
```

> **Why a gateway?** Arduino Mega + W5500's regular `EthernetClient` does not perform HTTPS/TLS itself. Vercel public APIs use HTTPS. The provided `gateway/gateway.mjs` receives Arduino HTTP only on a trusted local LAN, adds a device API key, and forwards to the Vercel HTTPS endpoint. DO NOT expose local HTTP gateway directly to the public internet. A direct end-to-end encrypted Arduino-to-cloud connection requires different TLS-capable hardware/software design.

## Fast Vercel deployment (single project for frontend + backend)

1. Create a free PostgreSQL database at **https://neon.tech** (or Vercel Marketplace → Neon). Choose a region near your app's function region.
2. Neon Console → **SQL Editor** → paste and run **`sql/schema.sql`**. This creates the four compartments, alerts, readings, orders and managers tables and starter records. If the first four tables already exist, only run `sql/manager_auth_migration.sql`.
3. Copy the **pooled `DATABASE_URL`** from Neon Console → **Connect**. It will look like `postgresql://...-pooler.../neondb?sslmode=require`.
4. Upload this folder to a new **GitHub repository** (do **not** commit `.env.local`), then open **https://vercel.com/new** → Import Git Repository.
5. Framework: **Next.js** (auto-detected). Root Directory: project root. Build Command: `npm run build`. No separate backend deployment needed.
6. Run `sql/manager_auth_migration.sql` on the existing Neon production branch.
7. Run `npm run manager:create` locally (with `.env.local` set) to create your manager email/password securely in the database.
8. Under Vercel **Project Settings → Environment Variables**, add these for **Production**:
   - `DATABASE_URL` = pooled Neon connection string
   - `SESSION_SECRET` = random **32+ characters**, e.g. run `openssl rand -hex 32`
   - `DEVICE_API_KEY` = a *different* random **20+ characters**, e.g. `openssl rand -hex 32`
9. Deploy. Open the generated `https://...vercel.app` URL. Sign in with the manager email and password created in step 7.
8. Try **Simulate reading → Keema weight 2 kg → Send reading → Approve order**. Go to Purchase Orders to see the approved order saved in Neon.

**Deployment result:** The dashboard is hosted on `https://YOUR-PROJECT.vercel.app` and the backend is already at `https://YOUR-PROJECT.vercel.app/api/*`. Neon PostgreSQL is not hosted inside Vercel itself.

## Run locally

```bash
npm install
cp .env.example .env.local
# Fill .env.local, and run sql/schema.sql in Neon before starting
npm run dev
```

Open `http://localhost:3000` and login using your Neon manager email and password.

> DO NOT open the app with plain HTML file mode; this is a Next.js server + database app. `npm install` needs working internet access for dependencies.

## Live classroom demonstration without hardware

1. Open your deployed Vercel website and login.
2. Dashboard shows initial readings for four compartments (seed data).
3. Press **Simulate reading** on Chicken or Keema. Set weight **2 kg** and temperature **2.3°C**. Submit.
4. PostgreSQL is updated through `/api/demo/update`, and dashboard polls `/api/dashboard` every **5 seconds** (this is near-real-time polling, *not* WebSockets or SSE).
5. A low-stock alert appears. Approve an order and open Purchase Orders. Order quantity = capacity − current stock (25 − 2 = 23 kg for Keema).
6. Try temperature **8°C** to trigger a temperature alert. Set it back to **2.5°C** to resolve it.
7. Press **Mark received** to close a purchase order. This does not automatically change measured weight; only a new sensor reading should change inventory. No supplier order is transmitted by this prototype.

## API endpoints

| Endpoint | Method | Access | Purpose |
|---|---|---|---|
| `/api/auth/login` | POST | Manager email + password | Sign in; sets signed HTTP-only cookie |
| `/api/auth/logout` | POST | Browser | Sign out |
| `/api/auth/me` | GET | Browser | Check active session |
| `/api/dashboard` | GET | Manager session | Get compartments, alerts, orders, history |
| `/api/demo/update` | POST | Manager session | Inject simulated sensor reading |
| `/api/telemetry` | POST | `x-device-key` header | Arduino/gateway data ingest |
| `/api/orders` | POST | Manager session | Approve and create purchase order |
| `/api/orders/:id/received` | POST | Manager session | Mark delivery received |

Example telemetry request (run in a terminal; avoid storing real secrets in shell history):

```bash
curl -X POST https://YOUR-PROJECT.vercel.app/api/telemetry \
  -H "Content-Type: application/json" \
  -H "x-device-key: YOUR_DEVICE_API_KEY" \
  -d '{"deviceId":"mega-01","readings":[{"compartment":"chicken","weightKg":8.5,"temperatureC":2.3},{"compartment":"beef","weightKg":11.2,"temperatureC":2.6},{"compartment":"mutton","weightKg":9,"temperatureC":3.1},{"compartment":"mince","weightKg":3,"temperatureC":2.5}]}'
```

This request should return `{ "ok": true, "results": [...] }`, and manager dashboard will reflect new values after its next refresh.

## Arduino wiring / operation

`arduino/FrostTrack_Mega_W5500.ino` is a **physical hardware sketch example**, with these Arduino Mega digital pins:

- HX711 DT/SCK: Chicken **22/23**, Beef **24/25**, Mutton **26/27**, Keema **28/29**.
- DS18B20 DQ: Chicken **30**, Beef **31**, Mutton **32**, Keema **33**. Each DATA line needs **4.7kΩ pull-up to the sensor supply**, plus common ground.
- Warning LED: **D34** (use current-limiting resistor).
- W5500 SPI: Mega **MISO D50**, **MOSI D51**, **SCK D52** and shield **CS D10** (confirm breakout/shield pinout; other W5500 boards may use a different CS). Keep D53 configured OUTPUT for SPI master mode.
- All peripherals require compatible regulated power with sufficient current capacity; some W5500 modules are **3.3V-only**, while 5V-compatible shields contain their own regulators. Never assume all W5500 modules accept 5V logic directly.

Install Arduino libraries: **HX711 (bogde)**, **OneWire**, **DallasTemperature**, and **Ethernet**. Change `gatewayHost` in the `.ino` to your local gateway IP, connect LAN and power, and calibrate your real sensors individually using known weights. **420 is a placeholder calibration factor**, not a guaranteed real measurement. Tare with the empty tray. Wokwi's old HX711-only demo can still demonstrate simulated sensors separately; do not claim W5500 network integration is already simulated.

### Local secure forwarding gateway

Run the gateway on a laptop/Raspberry Pi connected to the same trusted router as Arduino:

```bash
# Bash / macOS / Linux
export CLOUD_API_URL='https://YOUR-PROJECT.vercel.app'
export DEVICE_API_KEY='YOUR_DEVICE_API_KEY'
node gateway/gateway.mjs
```

Windows PowerShell:

```powershell
$env:CLOUD_API_URL='https://YOUR-PROJECT.vercel.app'
$env:DEVICE_API_KEY='YOUR_DEVICE_API_KEY'
node gateway/gateway.mjs
```

Configure Arduino `gatewayHost` to the host's **LAN IP** (e.g. `192.168.1.20`), using local port **8787**. Ensure local firewall allows this **only on trusted LAN**. Public network traffic from gateway to Vercel is HTTPS. No physical hardware/gateway network test was performed in the creation environment.

## Security and scope

- Manager actions: scrypt-hashed credentials in Neon, HMAC-signed HTTP-only SameSite=Strict session cookies.
- Device ingestion: `x-device-key` secret on the **HTTPS** Vercel endpoint, kept in gateway environment only.
- Input validation, constrained supported compartments, parameterized SQL and database unique indexes prevent accidental duplicate pending purchase orders and alerts.
- Neon connection string is **server-only**; never use `NEXT_PUBLIC_DATABASE_URL`.
- The code is suitable for a university demo. For public production, add proper user management, rate limiting, audit logging, request signing/replay protection, role-based permissions, service monitoring, and security reviews.
- **The gateway's local HTTP leg is not encrypted.** Prefer an isolated wired network or a TLS-capable MCU design if that threat matters.
- HTTPS is enforced on Vercel browser-to-API connections, not magically provided by `EthernetClient` on the Arduino.
- This prototype is **not a certified food-safety system**; it monitors temperature but cannot prove meat freshness/expiry.
- PostgreSQL, Vercel, Neon accounts and live deployment require your account setup. No public app URL has been deployed by this package.
