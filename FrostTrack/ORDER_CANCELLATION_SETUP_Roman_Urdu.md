# FrostTrack — Cancel Order aur UI Refresh Setup (Roman Urdu)

## Important: live website automatic update nahi hoti
Updated files pehle apne GitHub `iamarsalahmed/FrostTrack` repository mein push karni hongi. **Neon database par migration pehle run karo, phir Vercel deploy karo.** Yeh ZIP tumhari live website ko directly change nahi karti.

## 1. Neon migration (existing data safe)

1. Neon Console > `frosttrack` > branch **production** > database **neondb** > SQL Editor kholo.
2. ZIP ki file **`sql/order_cancellation_migration.sql`** ka complete SQL copy karke run karo.
3. Ye SQL `orders` table mein `cancelled_at`, `cancellation_reason` add karega aur status mein `cancelled` allow karega. **Purane placed/received orders delete ya reset nahi hote.**
4. Optional verification:

```sql
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'orders'
  AND column_name IN ('cancelled_at', 'cancellation_reason');
```

Dono columns nazar aane chahiye. Alert aur inventory tables ko touch karne ki zaroorat nahi.

## 2. GitHub se Vercel deploy

Project ka updated source apne existing GitHub repo mein merge karo. `app/`, `lib/`, `sql/`, `tests/`, `README.md`, `UI_PREVIEW.html` update honge.

- **GitHub par `.env.local` kabhi push mat karna.**
- Vercel mein existing `DATABASE_URL`, `SESSION_SECRET`, `DEVICE_API_KEY` same rehenge.
- Existing Neon DB-based manager login (`managers` table) unchanged hai.
- GitHub push se Vercel redeploy usually automatically trigger hota hai; deployment dashboard mein success verify karo.

## 3. Live test

1. Manager se sign in karo: `https://frost-track.vercel.app`.
2. **Purchase Orders** tab kholo. Kisi **Placed** order par `Cancel order` dabao.
3. Confirmation modal mein optional reason likho, `Yes, cancel order` click karo.
4. Order `Cancelled` ho jayega; history mein cancellation timestamp/reason visible rahega.
5. **Cancelled** tab se filter karo.
6. Confirm karo ke cancelled order par `Mark received` aur `Cancel order` buttons na dikh rahe hon.
7. Stock abhi bhi low hoga to Overview se naya reorder create kiya ja sakta hai. Cancel karne se stock weight change nahi hota.
8. Low stock aur temperature alert test karne ke liye simulator use karo: Keema weight = 2 kg; Beef temperature = 8°C. Overview par red/pink aur amber alerts dikhenge.

## Backend details

- New protected endpoint: **POST `/api/orders/:id/cancel`**
- Optional JSON payload: `{ "reason": "Ordered by mistake" }`
- Sirf manager login ke saath, same-origin request.
- Only `placed` status cancel ho sakta hai; already received/cancelled par **409 Conflict**.
- SQL update atomic hai; order permanently delete nahi hota.
- Supplier API integration abhi nahi hai. `placed` ek internal purchase-order record hai.

## Testing limits

Local Node.js unit tests aur JSX syntax checking hui hai. Full `npm run build` aur deployed Neon/API integration environment mein run nahi ho sake (dependencies registry tak network available nahi). Vercel deployment aur live click-through tumhe verify karna hoga.
