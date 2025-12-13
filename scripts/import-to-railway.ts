/**
 * Railway PostgreSQL'e Veri Import Scripti
 * Backups klasöründen Railway'e veri yükler
 */

import { db } from '../server/db';
import { 
  socialVideos, dreams, marketPredictions, stockPriceData, 
  conversations, dejavuEntries, humanProfiles, automationJobs, 
  fateSimulations 
} from '../shared/schema';
import * as fs from 'fs';
import * as path from 'path';

const BACKUP_DIR = 'backups/2025-12-09';

async function importTable(tableName: string, drizzleTable: any): Promise<number> {
  try {
    const filePath = path.join(BACKUP_DIR, `${tableName}.json`);
    
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  ${tableName}.json bulunamadı, atlanıyor...`);
      return 0;
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    
    if (!Array.isArray(data) || data.length === 0) {
      console.log(`⚠️  ${tableName} boş, atlanıyor...`);
      return 0;
    }

    console.log(`📥 ${tableName} import ediliyor... (${data.length} kayıt)`);
    
    // Batch insert (her seferinde 100 kayıt)
    const batchSize = 100;
    let imported = 0;
    
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      await db.insert(drizzleTable).values(batch).onConflictDoNothing();
      imported += batch.length;
      process.stdout.write(`\r   ${imported}/${data.length} kayıt...`);
    }
    
    console.log(`\n✅ ${tableName} tamamlandı!`);
    return data.length;

  } catch (error: any) {
    console.error(`❌ ${tableName} hatası:`, error.message);
    return 0;
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('          RAILWAY POSTGRESQL\'E VERİ IMPORT');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  const tables = [
    { name: 'social_videos', table: socialVideos },
    { name: 'dreams', table: dreams },
    { name: 'market_predictions', table: marketPredictions },
    { name: 'stock_price_data', table: stockPriceData },
    { name: 'conversations', table: conversations },
    { name: 'dejavu_entries', table: dejavuEntries },
    { name: 'human_profiles', table: humanProfiles },
    { name: 'automation_jobs', table: automationJobs },
    { name: 'fate_simulations', table: fateSimulations },
  ];
  
  let totalImported = 0;
  
  for (const { name, table } of tables) {
    const count = await importTable(name, table);
    totalImported += count;
  }
  
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`✅ IMPORT TAMAMLANDI`);
  console.log(`📊 Toplam: ${totalImported.toLocaleString()} kayıt`);
  console.log('═══════════════════════════════════════════════════════════════\n');
}

main().catch(console.error);

