/**
 * Tüm Veritabanı Verilerini Yedekleme Scripti
 */

import { initDatabase } from '../server/db';
import { sql } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

const db = initDatabase();
if (!db) {
  console.error('❌ Database bağlantısı başarısız');
  process.exit(1);
}

const BACKUP_DIR = `backups/${new Date().toISOString().split('T')[0]}`;

async function exportTable(tableName: string): Promise<number> {
  try {
    const result = await db.execute(sql.raw(`SELECT * FROM ${tableName}`));
    const rows = result.rows;
    
    if (rows.length > 0) {
      const filePath = path.join(BACKUP_DIR, `${tableName}.json`);
      fs.writeFileSync(filePath, JSON.stringify(rows, null, 2));
      return rows.length;
    }
    return 0;
  } catch (error) {
    return 0;
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('          VERİTABANI YEDEKLEME');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  // Klasör oluştur
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
  
  const tables = [
    'social_videos',
    'dreams',
    'market_predictions',
    'stock_price_data',
    'conversations',
    'dejavu_entries',
    'analytics_results',
    'human_profiles',
    'datasets',
    'scrape_runs',
    'trading_signals',
    'market_structure_shifts',
    'dream_market_correlations',
    'automation_jobs',
    'fate_simulations'
  ];
  
  let totalRecords = 0;
  const results: { table: string; count: number }[] = [];
  
  for (const table of tables) {
    process.stdout.write(`📦 ${table.padEnd(30)} ... `);
    const count = await exportTable(table);
    console.log(`${count.toLocaleString()} kayıt`);
    results.push({ table, count });
    totalRecords += count;
  }
  
  // Özet raporu kaydet
  const summary = {
    backupDate: new Date().toISOString(),
    totalRecords,
    tables: results
  };
  
  fs.writeFileSync(
    path.join(BACKUP_DIR, '_summary.json'),
    JSON.stringify(summary, null, 2)
  );
  
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`✅ YEDEKLEME TAMAMLANDI`);
  console.log(`📁 Konum: ${BACKUP_DIR}/`);
  console.log(`📊 Toplam: ${totalRecords.toLocaleString()} kayıt`);
  console.log('═══════════════════════════════════════════════════════════════\n');
}

main().catch(console.error);
