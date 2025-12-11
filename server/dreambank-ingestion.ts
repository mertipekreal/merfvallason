import { db } from "./db";
import { dreams } from "@shared/schema";
import { v4 as uuidv4 } from "uuid";
import { eq } from "drizzle-orm";

interface DreamBankRecord {
  id: string;
  name: string;
  number: string;
  time?: string;
  date?: string;
  gender: string;
  age: string;
  report?: string;
  character?: string;
  emotion?: string;
}

interface IngestionResult {
  success: boolean;
  totalRecords: number;
  imported: number;
  skipped: number;
  errors: string[];
}

interface IngestionProgress {
  status: 'idle' | 'running' | 'completed' | 'error';
  progress: number;
  total: number;
  imported: number;
  errors: string[];
  startedAt?: Date;
  completedAt?: Date;
}

let ingestionProgress: IngestionProgress = {
  status: 'idle',
  progress: 0,
  total: 0,
  imported: 0,
  errors: []
};

function parseHallVanDeCastle(character?: string, emotion?: string) {
  return {
    characters: character || undefined,
    emotions: emotion || undefined
  };
}

function inferLocation(report: string): string {
  const locationKeywords: Record<string, string[]> = {
    'home': ['house', 'home', 'apartment', 'bedroom', 'kitchen', 'living room'],
    'building': ['building', 'office', 'store', 'shop', 'hospital', 'school'],
    'street': ['street', 'road', 'highway', 'sidewalk', 'city'],
    'forest': ['forest', 'woods', 'trees', 'jungle'],
    'water': ['ocean', 'sea', 'river', 'lake', 'pool', 'water', 'beach'],
    'sky': ['sky', 'flying', 'clouds', 'airplane', 'air'],
    'vehicle': ['car', 'bus', 'train', 'plane', 'boat', 'vehicle'],
    'nature': ['mountain', 'field', 'garden', 'park', 'countryside'],
    'room': ['room', 'hall', 'corridor']
  };
  
  const lowerReport = report.toLowerCase();
  for (const [location, keywords] of Object.entries(locationKeywords)) {
    if (keywords.some(kw => lowerReport.includes(kw))) {
      return location;
    }
  }
  return 'unknown';
}

function inferEmotion(emotionCode?: string, report?: string): string {
  if (emotionCode) {
    const code = emotionCode.toUpperCase();
    if (code.includes('HA')) return 'joy';
    if (code.includes('SD')) return 'sadness';
    if (code.includes('AN')) return 'anxiety';
    if (code.includes('AP')) return 'fear';
    if (code.includes('CO')) return 'confusion';
  }
  
  if (report) {
    const lowerReport = report.toLowerCase();
    if (lowerReport.includes('afraid') || lowerReport.includes('scared') || lowerReport.includes('fear')) return 'fear';
    if (lowerReport.includes('happy') || lowerReport.includes('joy') || lowerReport.includes('excited')) return 'joy';
    if (lowerReport.includes('sad') || lowerReport.includes('crying') || lowerReport.includes('tears')) return 'sadness';
    if (lowerReport.includes('anxious') || lowerReport.includes('worried') || lowerReport.includes('nervous')) return 'anxiety';
    if (lowerReport.includes('calm') || lowerReport.includes('peaceful') || lowerReport.includes('relaxed')) return 'calm';
    if (lowerReport.includes('confused') || lowerReport.includes('lost')) return 'confusion';
    if (lowerReport.includes('curious') || lowerReport.includes('wonder')) return 'curiosity';
  }
  
  return 'wonder';
}

function inferThemes(report: string): string[] {
  const themes: string[] = [];
  const lowerReport = report.toLowerCase();
  
  const themeKeywords: Record<string, string[]> = {
    'running': ['run', 'running', 'chase', 'chasing'],
    'flying': ['fly', 'flying', 'float', 'floating', 'soar'],
    'falling': ['fall', 'falling', 'drop', 'dropping'],
    'searching': ['search', 'searching', 'looking for', 'find', 'lost'],
    'meeting': ['meet', 'meeting', 'encounter', 'friend', 'family'],
    'escaping': ['escape', 'escaping', 'hide', 'hiding', 'run away'],
    'transforming': ['change', 'transform', 'become', 'turn into'],
    'discovering': ['discover', 'find', 'explore', 'new']
  };
  
  for (const [theme, keywords] of Object.entries(themeKeywords)) {
    if (keywords.some(kw => lowerReport.includes(kw))) {
      themes.push(theme);
    }
  }
  
  return themes.slice(0, 3);
}

function inferIntensity(report: string): number {
  const lowerReport = report.toLowerCase();
  let intensity = 5;
  
  const highIntensityWords = ['terrified', 'horrified', 'extremely', 'violent', 'intense', 'overwhelming'];
  const lowIntensityWords = ['calm', 'peaceful', 'quiet', 'gentle', 'soft'];
  
  if (highIntensityWords.some(w => lowerReport.includes(w))) intensity += 3;
  if (lowIntensityWords.some(w => lowerReport.includes(w))) intensity -= 2;
  
  if (report.length > 2000) intensity += 1;
  if (report.includes('!')) intensity += 1;
  
  return Math.max(1, Math.min(10, intensity));
}

function calculateRarityScore(record: DreamBankRecord, report: string): number {
  let score = 50;
  
  if (report.length > 1500) score += 15;
  else if (report.length > 1000) score += 10;
  else if (report.length > 500) score += 5;
  
  if (record.character && record.character.length > 20) score += 10;
  if (record.emotion && record.emotion.length > 10) score += 10;
  
  const uniqueWords = new Set(report.toLowerCase().split(/\s+/)).size;
  if (uniqueWords > 200) score += 10;
  else if (uniqueWords > 100) score += 5;
  
  return Math.min(100, score);
}

function generateTitle(report: string, name: string, number: string): string {
  const firstSentence = report.split(/[.!?]/)[0];
  if (firstSentence && firstSentence.length < 100) {
    return firstSentence.substring(0, 80).trim();
  }
  
  const words = report.split(/\s+/).slice(0, 6).join(' ');
  return `${name} #${number}: ${words}...`;
}

export async function fetchDreamBankFromHuggingFace(
  limit?: number,
  offset: number = 0
): Promise<DreamBankRecord[]> {
  // Hugging Face API has a maximum limit of 100 rows per request
  const maxLength = 100;
  const requestLength = Math.min(limit || 100, maxLength);
  const url = `https://datasets-server.huggingface.co/rows?dataset=gustavecortal%2FDreamBank-annotated&config=default&split=train&offset=${offset}&length=${requestLength}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch from Hugging Face: ${response.statusText}`);
  }
  
  const data = await response.json();
  
  return data.rows.map((row: { row: DreamBankRecord }) => row.row);
}

export async function ingestDreamBankBatch(
  records: DreamBankRecord[],
  skipExisting: boolean = true
): Promise<{ imported: number; skipped: number; errors: string[] }> {
  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];
  
  const database = db;
  if (!database) {
    throw new Error("Database not available");
  }
  
  for (const record of records) {
    try {
      if (!record.report || record.report.trim().length < 10) {
        skipped++;
        continue;
      }
      
      if (skipExisting) {
        const existing = await database
          .select()
          .from(dreams)
          .where(eq(dreams.externalId, `dreambank-${record.id}-${record.number}`))
          .limit(1);
        
        if (existing.length > 0) {
          skipped++;
          continue;
        }
      }
      
      const report = record.report.trim();
      const title = generateTitle(report, record.name, record.number);
      const location = inferLocation(report);
      const emotion = inferEmotion(record.emotion, report);
      const themes = inferThemes(report);
      const intensity = inferIntensity(report);
      const rarityScore = calculateRarityScore(record, report);
      
      let dreamDate = new Date();
      if (record.date) {
        const parsed = new Date(record.date);
        if (!isNaN(parsed.getTime())) {
          dreamDate = parsed;
        }
      }
      
      await database.insert(dreams).values({
        id: uuidv4(),
        title,
        description: report,
        location,
        emotion,
        themes,
        objects: [],
        intensity,
        dreamDate,
        source: 'dreambank',
        externalId: `dreambank-${record.id}-${record.number}`,
        dreamerGender: record.gender,
        dreamerAge: record.age,
        dreamerName: record.name,
        hallVanDeCastle: parseHallVanDeCastle(record.character, record.emotion),
        rarityScore,
        nftEligible: 1
      });
      
      imported++;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`Record ${record.id}-${record.number}: ${message}`);
    }
  }
  
  return { imported, skipped, errors };
}

export async function startFullIngestion(
  batchSize: number = 100,
  maxRecords?: number,
  startOffset: number = 0
): Promise<IngestionResult> {
  ingestionProgress = {
    status: 'running',
    progress: startOffset,
    total: (startOffset + (maxRecords || 28000)),
    imported: 0,
    errors: [],
    startedAt: new Date()
  };
  
  let totalImported = 0;
  let totalSkipped = 0;
  const allErrors: string[] = [];
  let offset = startOffset;
  
  console.log(`[DreamBank] Starting ingestion from offset ${startOffset}, target: ${maxRecords || 'all'} records`);
  
  try {
    while (true) {
      if (maxRecords && (offset - startOffset) >= maxRecords) break;
      
      const fetchLimit = maxRecords 
        ? Math.min(batchSize, maxRecords - (offset - startOffset))
        : batchSize;
      
      const records = await fetchDreamBankFromHuggingFace(fetchLimit, offset);
      
      if (records.length === 0) break;
      
      const { imported, skipped, errors } = await ingestDreamBankBatch(records);
      
      totalImported += imported;
      totalSkipped += skipped;
      allErrors.push(...errors);
      
      offset += records.length;
      
      ingestionProgress.progress = offset;
      ingestionProgress.imported = totalImported;
      ingestionProgress.errors = allErrors.slice(-10);
      
      console.log(`Ingestion progress: ${offset}/${ingestionProgress.total} (imported: ${totalImported})`);
      
      if (records.length < fetchLimit) break;
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    ingestionProgress.status = 'completed';
    ingestionProgress.completedAt = new Date();
    
    return {
      success: true,
      totalRecords: offset,
      imported: totalImported,
      skipped: totalSkipped,
      errors: allErrors
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    ingestionProgress.status = 'error';
    ingestionProgress.errors.push(message);
    
    return {
      success: false,
      totalRecords: offset,
      imported: totalImported,
      skipped: totalSkipped,
      errors: [...allErrors, message]
    };
  }
}

export function getIngestionProgress(): IngestionProgress {
  return { ...ingestionProgress };
}

export async function getDreamBankStats() {
  const database = db;
  if (!database) {
    return { total: 0, dreambank: 0, user: 0 };
  }
  
  const allDreams = await database.select().from(dreams);
  const dreamBankDreams = allDreams.filter(d => d.source === 'dreambank');
  const userDreams = allDreams.filter(d => d.source === 'user');
  
  return {
    total: allDreams.length,
    dreambank: dreamBankDreams.length,
    user: userDreams.length
  };
}
