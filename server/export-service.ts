import * as XLSX from 'xlsx';
import PdfPrinter from 'pdfmake';
import type { TDocumentDefinitions } from 'pdfmake/interfaces';

interface AnalyticsData {
  totalRecords?: number;
  totalViews?: number;
  totalLikes?: number;
  totalComments?: number;
  totalShares?: number;
  avgEngagementRate?: number;
  sentimentBreakdown?: Record<string, number> | Array<{ sentiment: string; count: number }>;
  topHashtags?: Array<{ hashtag?: string; tag?: string; count: number; percentage?: number }>;
  topCreators?: Array<{ username?: string; name?: string; videoCount?: number; followers?: number; totalViews?: number }>;
  categoryBreakdown?: Record<string, number> | Array<{ category: string; count: number }>;
  activeHours?: Array<{ hour: number; count: number }>;
}

function normalizeSentimentBreakdown(data: AnalyticsData['sentimentBreakdown'], totalRecords?: number): Record<string, number> {
  if (!data) return {};
  const result: Record<string, number> = {};
  
  if (Array.isArray(data)) {
    const total = totalRecords || data.reduce((sum, item) => sum + item.count, 0);
    data.forEach(item => {
      result[item.sentiment] = total > 0 ? Math.round((item.count / total) * 100) : 0;
    });
  } else {
    const total = totalRecords || Object.values(data).reduce((sum, val) => sum + val, 0);
    Object.entries(data).forEach(([sentiment, count]) => {
      result[sentiment] = total > 0 ? Math.round((count / total) * 100) : 0;
    });
  }
  return result;
}

function normalizeCategoryBreakdown(data: AnalyticsData['categoryBreakdown']): Record<string, number> {
  if (!data) return {};
  if (Array.isArray(data)) {
    const result: Record<string, number> = {};
    data.forEach(item => {
      result[item.category] = item.count;
    });
    return result;
  }
  return data;
}

function safeNumber(val: number | undefined | null): number {
  return val ?? 0;
}

function safeToLocaleString(val: number | undefined | null): string {
  return (val ?? 0).toLocaleString();
}

const fonts = {
  Roboto: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique'
  }
};

const printer = new PdfPrinter(fonts);

export function generateExcelReport(datasetName: string, analytics: AnalyticsData): Buffer {
  const workbook = XLSX.utils.book_new();
  
  const totalRecords = safeNumber(analytics.totalRecords);
  const totalViews = safeNumber(analytics.totalViews);
  const totalLikes = safeNumber(analytics.totalLikes);
  const totalComments = safeNumber(analytics.totalComments);
  const totalShares = safeNumber(analytics.totalShares);
  const avgEngagementRate = safeNumber(analytics.avgEngagementRate);
  const sentimentBreakdown = normalizeSentimentBreakdown(analytics.sentimentBreakdown, totalRecords);
  const topHashtags = analytics.topHashtags || [];
  const topCreators = analytics.topCreators || [];
  const categoryBreakdown = normalizeCategoryBreakdown(analytics.categoryBreakdown);
  const activeHours = analytics.activeHours || [];
  const totalHashtagPosts = topHashtags.reduce((sum, h) => sum + safeNumber(h.count), 0);
  
  const summaryData = [
    ['MERF AI Hub - Analytics Report'],
    ['Dataset:', formatDatasetName(datasetName)],
    ['Generated:', new Date().toLocaleString()],
    [''],
    ['Summary Metrics'],
    ['Total Records', totalRecords],
    ['Total Views', totalViews],
    ['Total Likes', totalLikes],
    ['Total Comments', totalComments],
    ['Total Shares', totalShares],
    ['Avg Engagement Rate', `${avgEngagementRate.toFixed(2)}%`],
  ];
  
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet['!cols'] = [{ wch: 25 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
  
  const sentimentData = [
    ['Sentiment Analysis'],
    ['Sentiment', 'Percentage'],
    ...Object.entries(sentimentBreakdown).map(([sentiment, value]) => [
      sentiment.charAt(0).toUpperCase() + sentiment.slice(1),
      `${value}%`
    ])
  ];
  
  const sentimentSheet = XLSX.utils.aoa_to_sheet(sentimentData);
  sentimentSheet['!cols'] = [{ wch: 15 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(workbook, sentimentSheet, 'Sentiment');
  
  const hashtagData = [
    ['Top Hashtags'],
    ['Rank', 'Hashtag', 'Count', 'Share %'],
    ...topHashtags.map((h, i) => {
      const count = safeNumber(h.count);
      const percentage = h.percentage !== undefined 
        ? h.percentage 
        : (totalHashtagPosts > 0 ? Math.round((count / totalHashtagPosts) * 100) : 0);
      return [
        i + 1,
        h.hashtag || h.tag || '',
        count,
        `${percentage}%`
      ];
    })
  ];
  
  const hashtagSheet = XLSX.utils.aoa_to_sheet(hashtagData);
  hashtagSheet['!cols'] = [{ wch: 6 }, { wch: 25 }, { wch: 10 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(workbook, hashtagSheet, 'Hashtags');
  
  const creatorData = [
    ['Top Creators'],
    ['Rank', 'Creator', 'Videos', 'Total Views'],
    ...topCreators.map((c, i) => [
      i + 1,
      c.username || c.name || 'Unknown',
      safeNumber(c.videoCount) || 1,
      safeToLocaleString(c.totalViews)
    ])
  ];
  
  const creatorSheet = XLSX.utils.aoa_to_sheet(creatorData);
  creatorSheet['!cols'] = [{ wch: 6 }, { wch: 25 }, { wch: 15 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(workbook, creatorSheet, 'Creators');
  
  const categoryData = [
    ['Content Categories'],
    ['Category', 'Count'],
    ...Object.entries(categoryBreakdown).map(([category, count]) => [
      category,
      count
    ])
  ];
  
  const categorySheet = XLSX.utils.aoa_to_sheet(categoryData);
  categorySheet['!cols'] = [{ wch: 20 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(workbook, categorySheet, 'Categories');
  
  const hoursData = [
    ['Activity by Hour'],
    ['Hour', 'Post Count'],
    ...activeHours.map(h => [
      `${safeNumber(h.hour).toString().padStart(2, '0')}:00`,
      safeNumber(h.count)
    ])
  ];
  
  const hoursSheet = XLSX.utils.aoa_to_sheet(hoursData);
  hoursSheet['!cols'] = [{ wch: 10 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(workbook, hoursSheet, 'Active Hours');
  
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  return buffer;
}

export function generatePdfReport(datasetName: string, analytics: AnalyticsData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const totalRecords = safeNumber(analytics.totalRecords);
    const totalViews = safeNumber(analytics.totalViews);
    const totalLikes = safeNumber(analytics.totalLikes);
    const totalComments = safeNumber(analytics.totalComments);
    const totalShares = safeNumber(analytics.totalShares);
    const avgEngagementRate = safeNumber(analytics.avgEngagementRate);
    const sentimentBreakdown = normalizeSentimentBreakdown(analytics.sentimentBreakdown, totalRecords);
    const topHashtags = analytics.topHashtags || [];
    const topCreators = analytics.topCreators || [];
    const categoryBreakdown = normalizeCategoryBreakdown(analytics.categoryBreakdown);
    const totalHashtagPosts = topHashtags.reduce((sum, h) => sum + safeNumber(h.count), 0);
    
    const docDefinition: TDocumentDefinitions = {
      content: [
        {
          text: 'MERF AI Hub',
          style: 'header',
          alignment: 'center' as const,
          margin: [0, 0, 0, 5]
        },
        {
          text: 'Analytics Report',
          style: 'subheader',
          alignment: 'center' as const,
          margin: [0, 0, 0, 20]
        },
        {
          columns: [
            { text: `Dataset: ${formatDatasetName(datasetName)}`, width: '*' },
            { text: `Generated: ${new Date().toLocaleString()}`, width: 'auto', alignment: 'right' as const }
          ],
          margin: [0, 0, 0, 20]
        },
        
        { text: 'Summary Metrics', style: 'sectionHeader' },
        {
          table: {
            widths: ['*', '*', '*'],
            body: [
              [
                { text: 'Total Records', style: 'tableHeader' },
                { text: 'Total Views', style: 'tableHeader' },
                { text: 'Total Likes', style: 'tableHeader' }
              ],
              [
                totalRecords.toLocaleString(),
                totalViews.toLocaleString(),
                totalLikes.toLocaleString()
              ]
            ]
          },
          margin: [0, 0, 0, 10]
        },
        {
          table: {
            widths: ['*', '*', '*'],
            body: [
              [
                { text: 'Total Comments', style: 'tableHeader' },
                { text: 'Total Shares', style: 'tableHeader' },
                { text: 'Engagement Rate', style: 'tableHeader' }
              ],
              [
                totalComments.toLocaleString(),
                totalShares.toLocaleString(),
                `${avgEngagementRate.toFixed(2)}%`
              ]
            ]
          },
          margin: [0, 0, 0, 20]
        },
        
        { text: 'Sentiment Analysis', style: 'sectionHeader' },
        {
          table: {
            widths: ['*', 'auto'],
            body: [
              [{ text: 'Sentiment', style: 'tableHeader' }, { text: 'Percentage', style: 'tableHeader' }],
              ...Object.entries(sentimentBreakdown).map(([sentiment, value]) => [
                sentiment.charAt(0).toUpperCase() + sentiment.slice(1),
                `${value}%`
              ])
            ]
          },
          margin: [0, 0, 0, 20]
        },
        
        { text: 'Top Hashtags', style: 'sectionHeader' },
        {
          table: {
            widths: ['auto', '*', 'auto', 'auto'],
            body: [
              [
                { text: '#', style: 'tableHeader' },
                { text: 'Hashtag', style: 'tableHeader' },
                { text: 'Count', style: 'tableHeader' },
                { text: 'Share', style: 'tableHeader' }
              ],
              ...topHashtags.slice(0, 10).map((h, i) => {
                const count = safeNumber(h.count);
                const percentage = h.percentage !== undefined 
                  ? h.percentage 
                  : (totalHashtagPosts > 0 ? Math.round((count / totalHashtagPosts) * 100) : 0);
                return [
                  (i + 1).toString(),
                  h.hashtag || h.tag || '',
                  count.toString(),
                  `${percentage}%`
                ];
              })
            ]
          },
          margin: [0, 0, 0, 20]
        },
        
        { text: 'Top Creators', style: 'sectionHeader' },
        {
          table: {
            widths: ['auto', '*', 'auto', 'auto'],
            body: [
              [
                { text: '#', style: 'tableHeader' },
                { text: 'Creator', style: 'tableHeader' },
                { text: 'Videos', style: 'tableHeader' },
                { text: 'Views', style: 'tableHeader' }
              ],
              ...topCreators.slice(0, 10).map((c, i) => [
                (i + 1).toString(),
                c.username || c.name || 'Unknown',
                (safeNumber(c.videoCount) || 1).toString(),
                formatNumber(safeNumber(c.totalViews))
              ])
            ]
          },
          margin: [0, 0, 0, 20]
        },
        
        { text: 'Content Categories', style: 'sectionHeader' },
        {
          table: {
            widths: ['*', 'auto'],
            body: [
              [{ text: 'Category', style: 'tableHeader' }, { text: 'Count', style: 'tableHeader' }],
              ...Object.entries(categoryBreakdown).map(([cat, count]) => [
                cat,
                count.toString()
              ])
            ]
          },
          margin: [0, 0, 0, 20]
        }
      ],
      styles: {
        header: {
          fontSize: 24,
          bold: true,
          color: '#7c3aed'
        },
        subheader: {
          fontSize: 16,
          color: '#6b7280'
        },
        sectionHeader: {
          fontSize: 14,
          bold: true,
          margin: [0, 10, 0, 8] as [number, number, number, number],
          color: '#374151'
        },
        tableHeader: {
          bold: true,
          fillColor: '#f3f4f6',
          color: '#374151'
        }
      },
      defaultStyle: {
        fontSize: 10
      },
      pageMargins: [40, 40, 40, 40] as [number, number, number, number]
    };

    try {
      const pdfDoc = printer.createPdfKitDocument(docDefinition);
      const chunks: Buffer[] = [];
      
      pdfDoc.on('data', (chunk: Buffer) => chunks.push(chunk));
      pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
      pdfDoc.on('error', reject);
      
      pdfDoc.end();
    } catch (error) {
      reject(error);
    }
  });
}

function formatDatasetName(name: string): string {
  switch (name) {
    case 'tiktok_json':
      return 'TikTok Data (JSON)';
    case 'tiktok_csv':
      return 'TikTok Data (CSV)';
    case 'phone_conversations':
      return 'Phone Conversations';
    default:
      return name;
  }
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}
