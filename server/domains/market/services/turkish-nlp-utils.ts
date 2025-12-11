/**
 * Türkçe NLP Yardımcı Fonksiyonları
 * 
 * Türkçe dilinin özelliklerini işlemek için araçlar:
 * - Morfolojik analiz (ek ayrıştırma)
 * - Normalizasyon
 * - Dil tespiti
 * - Finansal terim tanıma
 */

const TURKISH_VOWELS = ['a', 'e', 'ı', 'i', 'o', 'ö', 'u', 'ü'];
const TURKISH_CONSONANTS = ['b', 'c', 'ç', 'd', 'f', 'g', 'ğ', 'h', 'j', 'k', 'l', 'm', 'n', 'p', 'r', 's', 'ş', 't', 'v', 'y', 'z'];

const TURKISH_SUFFIXES = {
  nominal: [
    'lar', 'ler',
    'ın', 'in', 'un', 'ün', 'nın', 'nin', 'nun', 'nün',
    'a', 'e', 'ya', 'ye', 'na', 'ne',
    'ı', 'i', 'u', 'ü', 'yı', 'yi', 'yu', 'yü', 'nı', 'ni', 'nu', 'nü',
    'da', 'de', 'ta', 'te', 'nda', 'nde',
    'dan', 'den', 'tan', 'ten', 'ndan', 'nden',
    'la', 'le', 'yla', 'yle',
    'lık', 'lik', 'luk', 'lük',
    'lı', 'li', 'lu', 'lü',
    'sız', 'siz', 'suz', 'süz',
    'cı', 'ci', 'cu', 'cü', 'çı', 'çi', 'çu', 'çü',
    'ca', 'ce', 'ça', 'çe',
    'daş', 'deş', 'taş', 'teş',
  ],
  verbal: [
    'mak', 'mek',
    'yor', 'iyor', 'uyor', 'üyor',
    'acak', 'ecek', 'yacak', 'yecek',
    'mış', 'miş', 'muş', 'müş', 'ymış', 'ymiş', 'ymuş', 'ymüş',
    'dı', 'di', 'du', 'dü', 'tı', 'ti', 'tu', 'tü',
    'sa', 'se', 'ysa', 'yse',
    'ır', 'ir', 'ur', 'ür', 'ar', 'er',
    'malı', 'meli',
    'abil', 'ebil',
    'ama', 'eme',
  ],
  possessive: [
    'm', 'ım', 'im', 'um', 'üm',
    'n', 'ın', 'in', 'un', 'ün',
    'sı', 'si', 'su', 'sü', 'ı', 'i', 'u', 'ü',
    'mız', 'miz', 'muz', 'müz', 'ımız', 'imiz', 'umuz', 'ümüz',
    'nız', 'niz', 'nuz', 'nüz', 'ınız', 'iniz', 'unuz', 'ünüz',
    'ları', 'leri',
  ],
};

const BIST_TERMS: Record<string, string> = {
  'bist': 'Borsa İstanbul',
  'bist100': 'BIST 100 Endeksi',
  'bist30': 'BIST 30 Endeksi',
  'xu100': 'BIST 100',
  'xu030': 'BIST 30',
  'tcmb': 'Türkiye Cumhuriyet Merkez Bankası',
  'spk': 'Sermaye Piyasası Kurulu',
  'tl': 'Türk Lirası',
  'try': 'Türk Lirası',
  'usdtry': 'Dolar/TL Paritesi',
  'eurtry': 'Euro/TL Paritesi',
  'bddk': 'Bankacılık Düzenleme ve Denetleme Kurumu',
  'tuik': 'Türkiye İstatistik Kurumu',
  'tüfe': 'Tüketici Fiyat Endeksi',
  'üfe': 'Üretici Fiyat Endeksi',
  'gsyih': 'Gayri Safi Yurt İçi Hasıla',
  'enflasyon': 'Enflasyon Oranı',
  'faiz': 'Faiz Oranı',
  'politika faizi': 'Politika Faiz Oranı',
  'repo': 'Repo Faizi',
  'gösterge': 'Gösterge Tahvil',
  'tahvil': 'Devlet Tahvili',
  'bono': 'Hazine Bonosu',
  'eurobond': 'Dış Borçlanma Senedi',
  'cds': 'Kredi Temerrüt Takası',
  'swap': 'Döviz Takası',
  'forward': 'Vadeli İşlem',
  'opsiyon': 'Opsiyon',
  'viop': 'Vadeli İşlem ve Opsiyon Piyasası',
  'halka arz': 'Halka Arz',
  'bedelli': 'Bedelli Sermaye Artırımı',
  'bedelsiz': 'Bedelsiz Sermaye Artırımı',
  'temettü': 'Temettü/Kar Payı',
  'kar payı': 'Kar Payı Dağıtımı',
};

const TURKISH_STOPWORDS = [
  've', 'veya', 'ile', 'için', 'bir', 'bu', 'şu', 'o', 'de', 'da', 'mi', 'mı', 'mu', 'mü',
  'ki', 'ise', 'gibi', 'kadar', 'daha', 'en', 'çok', 'az', 'her', 'hiç', 'bazı', 'tüm',
  'hep', 'sadece', 'yalnız', 'ancak', 'fakat', 'ama', 'lakin', 'oysa', 'halbuki',
  'ne', 'nasıl', 'neden', 'niçin', 'niye', 'kim', 'kime', 'kimin', 'nerede', 'nereden',
  'olarak', 'olan', 'oldu', 'olmuş', 'olacak', 'olmak', 'var', 'yok', 'değil',
  'ben', 'sen', 'biz', 'siz', 'onlar', 'benim', 'senin', 'onun', 'bizim', 'sizin',
];

export function detectLanguage(text: string): 'tr' | 'en' | 'unknown' {
  if (!text || text.trim().length === 0) return 'unknown';
  
  const turkishChars = ['ğ', 'ü', 'ş', 'ı', 'ö', 'ç', 'Ğ', 'Ü', 'Ş', 'İ', 'Ö', 'Ç'];
  const turkishCharCount = text.split('').filter(c => turkishChars.includes(c)).length;
  
  const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 0);
  if (words.length === 0) return 'unknown';
  
  const commonTurkishWords = [
    'borsa', 'dolar', 'euro', 'lira', 'faiz', 'hisse', 'yükseldi', 'düştü',
    'bugün', 'yarın', 'piyasa', 'artış', 'düşüş', 'kazanç', 'kayıp', 'bist',
    'günü', 'hafta', 'sonuç', 'açıkladı', 'oldu', 'geldi', 'gitti'
  ];
  
  const turkishWordCount = words.filter(w => 
    TURKISH_STOPWORDS.includes(w) || 
    Object.keys(BIST_TERMS).some(t => w.includes(t)) ||
    commonTurkishWords.some(tw => w.includes(tw))
  ).length;
  
  if (turkishCharCount > 0) return 'tr';
  
  const textLength = Math.max(text.length, 1);
  const wordCount = Math.max(words.length, 1);
  const turkishWordRatio = turkishWordCount / wordCount;
  
  if (turkishWordRatio >= 0.15) return 'tr';
  
  const turkishScore = (turkishCharCount / textLength) * 100 + turkishWordRatio * 50;
  
  if (turkishScore > 3) return 'tr';
  if (turkishScore < 1 && turkishCharCount === 0 && turkishWordCount === 0) return 'en';
  return 'en';
}

export function normalizeTurkish(text: string): string {
  let normalized = text
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .toLowerCase()
    .replace(/[^\wığüşöçĞÜŞÖÇ\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  return normalized;
}

export function removeSuffixes(word: string): string {
  let stem = word.toLowerCase();
  const allSuffixes = [
    ...TURKISH_SUFFIXES.nominal,
    ...TURKISH_SUFFIXES.verbal,
    ...TURKISH_SUFFIXES.possessive,
  ].sort((a, b) => b.length - a.length);
  
  for (const suffix of allSuffixes) {
    if (stem.endsWith(suffix) && stem.length > suffix.length + 2) {
      stem = stem.slice(0, -suffix.length);
      break;
    }
  }
  
  return stem;
}

export function tokenize(text: string): string[] {
  const normalized = normalizeTurkish(text);
  return normalized.split(/\s+/).filter(w => w.length > 1);
}

export function removeStopwords(tokens: string[]): string[] {
  return tokens.filter(t => !TURKISH_STOPWORDS.includes(t.toLowerCase()));
}

export function extractFinancialTerms(text: string): { term: string; meaning: string }[] {
  const normalized = text.toLowerCase();
  const found: { term: string; meaning: string }[] = [];
  
  for (const [term, meaning] of Object.entries(BIST_TERMS)) {
    if (normalized.includes(term)) {
      found.push({ term, meaning });
    }
  }
  
  return found;
}

export function calculateVowelHarmony(word: string): 'front' | 'back' | 'mixed' {
  const frontVowels = ['e', 'i', 'ö', 'ü'];
  const backVowels = ['a', 'ı', 'o', 'u'];
  
  let frontCount = 0;
  let backCount = 0;
  
  for (const char of word.toLowerCase()) {
    if (frontVowels.includes(char)) frontCount++;
    if (backVowels.includes(char)) backCount++;
  }
  
  if (frontCount > 0 && backCount === 0) return 'front';
  if (backCount > 0 && frontCount === 0) return 'back';
  return 'mixed';
}

export function getSyllableCount(word: string): number {
  let count = 0;
  for (const char of word.toLowerCase()) {
    if (TURKISH_VOWELS.includes(char)) count++;
  }
  return count || 1;
}

export function isFinancialText(text: string): boolean {
  const terms = extractFinancialTerms(text);
  return terms.length > 0;
}

export function extractBISTSymbols(text: string): string[] {
  const symbolPattern = /\b([A-ZĞÜŞİÖÇ]{3,5})\b/g;
  const matches = text.match(symbolPattern) || [];
  
  const commonNonSymbols = ['VE', 'VEYA', 'İLE', 'İÇİN', 'BİR', 'BU', 'ŞU'];
  
  return matches.filter(m => !commonNonSymbols.includes(m) && m.length >= 3);
}

export function getSentimentModifiers(text: string): { word: string; modifier: 'intensifier' | 'negator' | 'diminisher' }[] {
  const modifiers: { word: string; modifier: 'intensifier' | 'negator' | 'diminisher' }[] = [];
  
  const intensifiers = ['çok', 'aşırı', 'son derece', 'oldukça', 'epey', 'fazlasıyla', 'gayet'];
  const negators = ['değil', 'yok', 'asla', 'hiç', 'kesinlikle değil', 'olmaz'];
  const diminishers = ['biraz', 'az', 'hafif', 'kısmen', 'bir nebze', 'görece'];
  
  const words = text.toLowerCase().split(/\s+/);
  
  for (const word of words) {
    if (intensifiers.some(i => word.includes(i))) {
      modifiers.push({ word, modifier: 'intensifier' });
    }
    if (negators.some(n => word.includes(n))) {
      modifiers.push({ word, modifier: 'negator' });
    }
    if (diminishers.some(d => word.includes(d))) {
      modifiers.push({ word, modifier: 'diminisher' });
    }
  }
  
  return modifiers;
}

export { TURKISH_SUFFIXES, BIST_TERMS, TURKISH_STOPWORDS, TURKISH_VOWELS, TURKISH_CONSONANTS };
