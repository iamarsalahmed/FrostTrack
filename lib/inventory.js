import { db } from './db';
import { COMPARTMENTS, HIGH_TEMP_C, finiteNumber, reorderQty } from './config';

export async function applyReading(input, source, deviceId='mega-01') {
  const code = String(input.compartment || '').toLowerCase();
  const weight = finiteNumber(input.weightKg, 0, 100);
  const temp = finiteNumber(input.temperatureC, -30, 60);
  if (!COMPARTMENTS.includes(code) || weight === null || temp === null) {
    const error = new Error('Invalid compartment, weightKg (0–100), or temperatureC (-30–60).');
    error.status = 400; throw error;
  }
  const sql = db();
  const updated = await sql`
    UPDATE compartments
    SET weight_kg=${weight}, temperature_c=${temp}, last_source=${source}, updated_at=now()
    WHERE code=${code}
    RETURNING code,label,weight_kg,temperature_c,threshold_kg,capacity_kg
  `;
  if (updated.length !== 1) throw new Error('Database not initialized. Run sql/schema.sql.');
  const c = updated[0];
  // Keep a bounded history on hobby plan (only recent 2,000 readings are required for the demo).
  await sql`INSERT INTO readings(compartment_code,device_id,weight_kg,temperature_c,source)
    VALUES (${code},${deviceId},${weight},${temp},${source})`;
  // Idempotent open-alert creation using database partial unique index.
  if (weight <= Number(c.threshold_kg)) {
    await sql`INSERT INTO alerts(compartment_code,alert_type,message)
      VALUES (${code},'low_stock',${`${c.label} stock is below threshold. Refill needed.`})
      ON CONFLICT (compartment_code,alert_type) WHERE status='open' DO NOTHING`;
  } else {
    await sql`UPDATE alerts SET status='resolved',resolved_at=now()
      WHERE compartment_code=${code} AND alert_type='low_stock' AND status='open'`;
  }
  if (temp > HIGH_TEMP_C) {
    await sql`INSERT INTO alerts(compartment_code,alert_type,message)
      VALUES (${code},'high_temp',${`${c.label} temperature above ${HIGH_TEMP_C}°C.`})
      ON CONFLICT (compartment_code,alert_type) WHERE status='open' DO NOTHING`;
  } else {
    await sql`UPDATE alerts SET status='resolved',resolved_at=now()
      WHERE compartment_code=${code} AND alert_type='high_temp' AND status='open'`;
  }
  return {compartment:code,weightKg:weight,temperatureC:temp,lowStock:weight<=Number(c.threshold_kg),suggestedOrderKg:reorderQty(c.capacity_kg,weight)};
}

export async function dashboardSnapshot() {
  const sql=db();
  const [compartments,alerts,orders,history] = await Promise.all([
    sql`SELECT code,label,capacity_kg,threshold_kg,weight_kg,temperature_c,last_source,updated_at FROM compartments ORDER BY CASE code WHEN 'chicken' THEN 1 WHEN 'beef' THEN 2 WHEN 'mutton' THEN 3 ELSE 4 END`,
    sql`SELECT id,compartment_code,alert_type,status,message,created_at FROM alerts WHERE status='open' ORDER BY created_at DESC LIMIT 30`,
    sql`SELECT o.id,o.compartment_code,c.label,o.quantity_kg,o.status,o.approved_at,o.received_at FROM orders o JOIN compartments c ON o.compartment_code=c.code ORDER BY o.id DESC LIMIT 30`,
    sql`SELECT compartment_code,weight_kg,temperature_c,received_at,source FROM readings ORDER BY received_at DESC LIMIT 12`
  ]);
  return {compartments:compartments.map(c=>({code:c.code,label:c.label,capacityKg:Number(c.capacity_kg),thresholdKg:Number(c.threshold_kg),weightKg:Number(c.weight_kg),temperatureC:c.temperature_c==null?null:Number(c.temperature_c),updatedAt:c.updated_at,source:c.last_source})),alerts,orders:orders.map(o=>({...o,quantity_kg:Number(o.quantity_kg)})),history:history.map(h=>({...h,weight_kg:Number(h.weight_kg),temperature_c:Number(h.temperature_c)})),serverTime:new Date().toISOString()};
}
