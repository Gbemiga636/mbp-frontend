// Usage: node restore-mbp-backup.js mbp-backup-2026-01-14T18-03-38-464Z.json
// Overwrites mbp_kv table in Railway MySQL with backup data and individual items

const fs = require('fs');
const mysql = require('mysql2/promise');

const MYSQL_URL = process.env.MYSQL_URL || 'mysql://root:rQWvQwCwoaWsZWwbUCFYwDvajANtNvCT@shortline.proxy.rlwy.net:27704/railway';
const MYSQL_TABLE = 'mbp_kv';

async function main() {
  const backupPath = process.argv[2];
  if (!backupPath) throw new Error('Usage: node restore-mbp-backup.js <backup.json>');
  const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));

  const pool = await mysql.createPool(MYSQL_URL);

  // Helper to upsert a key/value
  async function dbSetJson(key, value) {
    const raw = JSON.stringify(value ?? null);
    await pool.query(
      `INSERT INTO ${MYSQL_TABLE} (k, v) VALUES (?, ?) ON DUPLICATE KEY UPDATE v = VALUES(v), updated_at = CURRENT_TIMESTAMP`,
      [String(key || ''), raw]
    );
  }

  // Content
  if (backup.content && typeof backup.content === 'object') {
    await dbSetJson('content', backup.content);
    for (const section of ['home', 'store', 'gallery']) {
      if (backup.content[section]) {
        await dbSetJson(section, backup.content[section]);
      }
    }
  }

  // Settings
  if (backup.settings) {
    await dbSetJson('settings', backup.settings);
  }

  // Orders
  if (Array.isArray(backup.orders)) {
    await dbSetJson('orders', backup.orders);
    for (const order of backup.orders) {
      if (order && order.id) {
        await dbSetJson(`order_${order.id}`, order);
      }
    }
  }

  // Order Status
  if (backup.orderStatus && typeof backup.orderStatus === 'object') {
    await dbSetJson('orderStatus', backup.orderStatus);
    for (const [statusKey, statusValue] of Object.entries(backup.orderStatus)) {
      await dbSetJson(`orderStatus_${statusKey}`, statusValue);
    }
  }

  // Processed
  if (Array.isArray(backup.processed)) {
    await dbSetJson('processed', backup.processed);
    for (const item of backup.processed) {
      if (item && item.id) {
        await dbSetJson(`processed_${item.id}`, item);
      }
    }
  }

  await pool.end();
  console.log('Restore complete: All data overwritten in mbp_kv table.');
}

main().catch(e => { console.error(e); process.exit(1); });
