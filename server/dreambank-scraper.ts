import { db } from './db';
import { dreams } from '@shared/schema';
import { v4 as uuidv4 } from 'uuid';
import { eq, and, gte, lte, count } from 'drizzle-orm';

interface DreamEntry {
  id: string;
  content: string;
  date: Date;
  source: string;
  year: number;
  month?: number;
  day?: number;
  keywords: string[];
  sentimentScore: number;
}

const FEAR_KEYWORDS = [
  'karanlık', 'darkness', 'dark', 'fear', 'korku',
  'düşüş', 'falling', 'fall', 'drop', 'düşmek',
  'kaos', 'chaos', 'panic', 'panik',
  'ölüm', 'death', 'dead', 'die', 'öldürmek',
  'kaçmak', 'escape', 'run', 'running', 'flee',
  'savaş', 'war', 'bomb', 'bomba', 'explosion',
  'uçak', 'plane', 'airplane', 'crash', 'çarpışma',
  'deprem', 'earthquake', 'flood', 'sel', 'disaster',
  'kaybolmak', 'lost', 'trapped', 'sıkışmak', 'tıkanmak',
  'boğulmak', 'drown', 'drowning', 'suffocate',
  'kan', 'blood', 'bleeding', 'yaralanmak', 'injury',
  'takip', 'chase', 'chased', 'being chased', 'kovalamak',
  'kabus', 'nightmare', 'terror', 'terör', 'horror'
];

const HOPE_KEYWORDS = [
  'uçmak', 'flying', 'fly', 'soar',
  'yükselmek', 'rising', 'rise', 'climb',
  'ışık', 'light', 'bright', 'parlak',
  'mutluluk', 'happiness', 'happy', 'joy', 'sevinç',
  'huzur', 'peace', 'calm', 'peaceful', 'sakin',
  'güzel', 'beautiful', 'lovely', 'wonderful',
  'aşk', 'love', 'loving', 'sevgi',
  'özgürlük', 'freedom', 'free', 'liberation',
  'başarı', 'success', 'win', 'winning', 'kazanmak',
  'zenginlik', 'wealth', 'rich', 'money', 'para',
  'doğum', 'birth', 'baby', 'bebek', 'new life'
];

export class DreamBankScraper {
  
  analyzeSentiment(text: string): { score: number; fearKeywords: string[]; hopeKeywords: string[] } {
    const lowerText = text.toLowerCase();
    const foundFear: string[] = [];
    const foundHope: string[] = [];
    
    for (const keyword of FEAR_KEYWORDS) {
      if (lowerText.includes(keyword.toLowerCase())) {
        foundFear.push(keyword);
      }
    }
    
    for (const keyword of HOPE_KEYWORDS) {
      if (lowerText.includes(keyword.toLowerCase())) {
        foundHope.push(keyword);
      }
    }
    
    const fearScore = foundFear.length;
    const hopeScore = foundHope.length;
    const totalKeywords = fearScore + hopeScore;
    
    let score = 0;
    if (totalKeywords > 0) {
      score = (hopeScore - fearScore) / totalKeywords;
    }
    
    return {
      score,
      fearKeywords: foundFear,
      hopeKeywords: foundHope
    };
  }

  async importDreamBankArchive(archiveData: string): Promise<{ imported: number; skipped: number }> {
    const lines = archiveData.split('\n').filter(line => line.trim());
    let imported = 0;
    let skipped = 0;
    
    for (const line of lines) {
      try {
        const parts = line.split('\t');
        if (parts.length < 2) continue;
        
        const [dateStr, content] = parts;
        if (!content || content.length < 20) {
          skipped++;
          continue;
        }
        
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
          skipped++;
          continue;
        }
        
        const sentiment = this.analyzeSentiment(content);
        
        await db!.insert(dreams).values({
          id: uuidv4(),
          title: content.substring(0, 100),
          description: content.trim(),
          location: 'unknown',
          emotion: sentiment.score > 0.2 ? 'happy' : sentiment.score < -0.2 ? 'fearful' : 'neutral',
          themes: [...sentiment.fearKeywords, ...sentiment.hopeKeywords],
          objects: [],
          intensity: Math.min(10, Math.max(1, Math.round(5 + sentiment.score * 5))),
          dreamDate: date,
          source: 'dreambank'
        });
        
        imported++;
      } catch (error: any) {
        console.error('Error importing dream:', error.message);
        skipped++;
      }
    }
    
    console.log(`📚 DreamBank: Imported ${imported} dreams, skipped ${skipped}`);
    return { imported, skipped };
  }

  async getDreamsByDateRange(from: string, to: string): Promise<DreamEntry[]> {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    
    const results = await db!.select()
      .from(dreams)
      .where(and(
        gte(dreams.dreamDate, fromDate),
        lte(dreams.dreamDate, toDate)
      ));
    
    return results.map(dream => {
      const sentiment = this.analyzeSentiment(dream.description || '');
      return {
        id: dream.id,
        content: dream.description || '',
        date: dream.dreamDate || new Date(),
        source: dream.source || 'unknown',
        year: (dream.dreamDate || new Date()).getFullYear(),
        month: (dream.dreamDate || new Date()).getMonth() + 1,
        day: (dream.dreamDate || new Date()).getDate(),
        keywords: [...sentiment.fearKeywords, ...sentiment.hopeKeywords],
        sentimentScore: sentiment.score
      };
    });
  }

  async getDailySentimentScore(date: string): Promise<{
    date: string;
    dreamCount: number;
    avgSentiment: number;
    fearCount: number;
    hopeCount: number;
    topFearKeywords: string[];
    topHopeKeywords: string[];
  }> {
    const targetDate = new Date(date);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);
    
    const dreamsForDay = await this.getDreamsByDateRange(
      targetDate.toISOString().split('T')[0],
      nextDay.toISOString().split('T')[0]
    );
    
    if (dreamsForDay.length === 0) {
      return {
        date,
        dreamCount: 0,
        avgSentiment: 0,
        fearCount: 0,
        hopeCount: 0,
        topFearKeywords: [],
        topHopeKeywords: []
      };
    }
    
    const allFearKeywords: string[] = [];
    const allHopeKeywords: string[] = [];
    let totalSentiment = 0;
    
    for (const dream of dreamsForDay) {
      const sentiment = this.analyzeSentiment(dream.content);
      totalSentiment += sentiment.score;
      allFearKeywords.push(...sentiment.fearKeywords);
      allHopeKeywords.push(...sentiment.hopeKeywords);
    }
    
    const fearCounts = this.countKeywords(allFearKeywords);
    const hopeCounts = this.countKeywords(allHopeKeywords);
    
    return {
      date,
      dreamCount: dreamsForDay.length,
      avgSentiment: totalSentiment / dreamsForDay.length,
      fearCount: allFearKeywords.length,
      hopeCount: allHopeKeywords.length,
      topFearKeywords: Object.entries(fearCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([k]) => k),
      topHopeKeywords: Object.entries(hopeCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([k]) => k)
    };
  }

  private countKeywords(keywords: string[]): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const keyword of keywords) {
      counts[keyword] = (counts[keyword] || 0) + 1;
    }
    return counts;
  }

  async getSentimentTimeSeries(from: string, to: string): Promise<Array<{
    date: string;
    avgSentiment: number;
    dreamCount: number;
    fearKeywordCount: number;
    hopeKeywordCount: number;
  }>> {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    const results: Array<{
      date: string;
      avgSentiment: number;
      dreamCount: number;
      fearKeywordCount: number;
      hopeKeywordCount: number;
    }> = [];
    
    const currentDate = new Date(fromDate);
    while (currentDate <= toDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const dailyStats = await this.getDailySentimentScore(dateStr);
      
      if (dailyStats.dreamCount > 0) {
        results.push({
          date: dateStr,
          avgSentiment: dailyStats.avgSentiment,
          dreamCount: dailyStats.dreamCount,
          fearKeywordCount: dailyStats.fearCount,
          hopeKeywordCount: dailyStats.hopeCount
        });
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return results;
  }

  async getDreamStats(): Promise<{
    totalDreams: number;
    byYear: Record<number, number>;
    bySource: Record<string, number>;
    avgSentiment: number;
  }> {
    const allDreams = await db!.select().from(dreams);
    
    const byYear: Record<number, number> = {};
    const bySource: Record<string, number> = {};
    let totalSentiment = 0;
    
    for (const dream of allDreams) {
      const year = dream.dreamDate?.getFullYear() || 0;
      byYear[year] = (byYear[year] || 0) + 1;
      
      const source = dream.source || 'unknown';
      bySource[source] = (bySource[source] || 0) + 1;
      
      const sentiment = this.analyzeSentiment(dream.description || '');
      totalSentiment += sentiment.score;
    }
    
    return {
      totalDreams: allDreams.length,
      byYear,
      bySource,
      avgSentiment: allDreams.length > 0 ? totalSentiment / allDreams.length : 0
    };
  }

  async findDreamsWithKeyword(keyword: string, from?: string, to?: string): Promise<DreamEntry[]> {
    let allDreams = await db!.select().from(dreams);
    
    if (from && to) {
      const fromDate = new Date(from);
      const toDate = new Date(to);
      allDreams = allDreams.filter(d => {
        const date = d.dreamDate;
        return date && date >= fromDate && date <= toDate;
      });
    }
    
    const keywordLower = keyword.toLowerCase();
    const matchingDreams = allDreams.filter(d => 
      (d.description || '').toLowerCase().includes(keywordLower)
    );
    
    return matchingDreams.map(dream => {
      const sentiment = this.analyzeSentiment(dream.description || '');
      return {
        id: dream.id,
        content: dream.description || '',
        date: dream.dreamDate || new Date(),
        source: dream.source || 'unknown',
        year: (dream.dreamDate || new Date()).getFullYear(),
        keywords: [...sentiment.fearKeywords, ...sentiment.hopeKeywords],
        sentimentScore: sentiment.score
      };
    });
  }
}

export const dreamBankScraper = new DreamBankScraper();
