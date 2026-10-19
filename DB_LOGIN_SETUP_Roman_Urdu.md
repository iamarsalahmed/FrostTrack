# FrostTrack — Database-Based Manager Login (Roman Urdu)

**Important:** Neon PostgreSQL mein `compartments`, `readings`, `alerts`, `orders` tables pehle se hain. Unko delete mat karna.

## 1) Neon mein managers table banao
Neon Console > SQL Editor > production / neondb select karo. Sirf `sql/manager_auth_migration.sql` ka content paste karo aur Run karo.

Check:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema='public' ORDER BY table_name;
```
Paanchwaan table `managers` nazar aana chahiye.

## 2) Apne laptop par manager account create karo
Update wali source files GitHub repo mein merge karo / replace karo, phir VS Code mein:
```bash
npm install
```
Project root mein `.env.local` banao. Ismein Neon ka `DATABASE_URL`, `SESSION_SECRET` aur `DEVICE_API_KEY` set karo. `MANAGER_PASSWORD` **mat** rakho.

```bash
npm run manager:create
```
Terminal mein email aur password poochhega; password type karte waqt sirf `*` nazar aayenge. Actual password sirf **hash** ban kar Neon mein jayega. Agar email existing ho to password update hoga, aur old sessions expire ho jayenge.

Database verify (password hash kisi ke saath share na karna):
```sql
SELECT email, role, active, created_at FROM managers;
```

## 3) Vercel variables
FrostTrack > Settings > Environment Variables > Production:
- `DATABASE_URL` = Neon connection string
- `SESSION_SECRET` = random secret, 32+ chars
- `DEVICE_API_KEY` = another random key, 20+ chars

Old `MANAGER_PASSWORD` Vercel se delete kar do (new login usko read nahi karta). Save karo aur **Redeploy** karo.

## 4) Test
Site open karo. Login ab **manager email + password** maangega. `npm run manager:create` mein jo credentials diye the wahi use karo. Dashboard se Keema ki reading simulate karo aur order approve kar ke Neon mein result check karo.

## Security notes
- Plain-text password ya `.env.local` GitHub par push mat karo.
- Password hash built-in Node.js `scrypt` + random salt se banta hai.
- Signed HttpOnly session mein user ID/version hai; login ab Neon table verify karta hai.
- Public deployment par brute-force attempts prevent karne ke liye Vercel WAF / rate limits configure karo. App demo-level hai, enterprise-ready identity service nahi.
- Manager ki initial creation local CLI se hogi; **website mein open public registration nahi hai**.
