# FrostTrack – Live Demo Setup (Roman Urdu)

Jani, is project mein **Next.js frontend aur backend dono ek hi Vercel deployment mein** chalenge. Database **Neon PostgreSQL** par hoga.

## Step 1: Database
1. `https://neon.tech` par free account/project banao.
2. SQL Editor mein `sql/schema.sql` ki saari SQL paste kar ke Run karo.
3. Neon ke Connect button se **pooled** `DATABASE_URL` copy kar lo.

## Step 2: Vercel
1. Is folder ko GitHub repository mein upload karo. Secret wali `.env.local` file kabhi GitHub par upload mat karna.
2. `https://vercel.com/new` par Import GitHub Repo karo.
3. **Next.js** framework auto-select hoga.
4. Vercel → Project Settings → Environment Variables mein 4 variables set karo:
   - `DATABASE_URL` → Neon ki Postgres connection string.
   - `MANAGER_PASSWORD` → apna 12+ characters ka strong password.
   - `SESSION_SECRET` → 32+ characters ki random secret (e.g. `openssl rand -hex 32`).
   - `DEVICE_API_KEY` → doosri random key 20+ characters, Arduino/gateway ke liye.
5. Deploy button dabao. Tumhe `https://project-name.vercel.app` ka link mil jayega.

## Step 3: Professor ko live demo
1. Vercel wali website open karo aur manager password se login karo.
2. Chicken, Beef, Mutton aur Keema ke live-style stock aur temperature cards show karo.
3. Keema mein **Simulate reading** par click karo → Weight **2 kg** / Temp **2.5°C** → Send.
4. Backend API se same data Neon PostgreSQL mein save hoga. Dashboard har **5 seconds** refresh hota hai.
5. Low Stock Alert aayega. **Order 23 kg** button click karo (capacity 25 - stock 2 = 23 kg).
6. Purchase Orders tab mein naya order show hoga, phir **Mark received** option dikhana.
7. Temperature ko 7°C set kar ke temperature alert bhi show kar sakte ho.

## Step 4: Arduino ko actual data send karwana ho
- `arduino/FrostTrack_Mega_W5500.ino` Arduino IDE mein kholna. Libraries: HX711, OneWire, DallasTemperature, Ethernet.
- W5500 Ethernet ke LAN ke saath local gateway computer same network par hona chahiye.
- `gateway/gateway.mjs` ko `node gateway/gateway.mjs` se run karo, lekin pehle `CLOUD_API_URL` aur `DEVICE_API_KEY` environment variables set karo (full command README mein hai).
- Arduino sketch mein `gatewayHost(192,168,1,20)` ko apne laptop/Raspberry Pi ka actual LAN IP bana do.
- Sensors ko real weights se calibrate karna laazmi hai.

**Important:** Physical Arduino-to-server link abhi hardware par test nahi hua; web dashboard ke built-in simulator se backend/database/order flow ka live demo ho sakta hai. Supplier ko automatic purchase order bhejne ki integration abhi nahi hai.

## Kahan kya deploy hoga?

| Part | Kahan |
|---|---|
| Frontend Next.js + Redux | Vercel |
| Backend Next.js API Routes | Wahi Vercel Project |
| PostgreSQL Database | Neon |
| Arduino LAN-to-HTTPS Gateway (optional hardware) | Tumhara local laptop ya Raspberry Pi |
| Arduino Code | Arduino Mega 2560 board |

**Security note:** Vercel endpoint HTTPS hai, aur device API key required hai. Arduino ka W5500 `EthernetClient` TLS nahi karta, isliye local trusted LAN par gateway rakha gaya hai. Ye classroom prototype hai; public production use se pehle additional security controls chahiye honge.
