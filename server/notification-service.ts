/**
 * Notification Service
 * Sends alerts to Telegram, Discord, and Webhook endpoints
 * Integrates with Live Signal Service for real-time notifications
 */

import { db } from './db';
import { notificationTargets } from '@shared/schema';
import type { NotificationTarget, LiveSignal } from '@shared/schema';
import { eq } from 'drizzle-orm';

function getDb() {
  if (!db) throw new Error('Database not initialized');
  return db;
}

export interface NotificationPayload {
  type: 'signal' | 'alert' | 'price_alert' | 'portfolio_update';
  title: string;
  message: string;
  symbol?: string;
  signalType?: string;
  confidence?: number;
  price?: number;
  targetPrice?: number;
  direction?: string;
  riskLevel?: string;
  timestamp: Date;
}

export interface NotificationResult {
  targetId: string;
  targetType: string;
  success: boolean;
  error?: string;
}

class NotificationService {
  private telegramBotToken: string | null = null;

  constructor() {
    this.telegramBotToken = process.env.TELEGRAM_BOT_TOKEN || null;
  }

  async sendToAllTargets(payload: NotificationPayload): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];
    
    try {
      const targets = await getDb()
        .select()
        .from(notificationTargets)
        .where(eq(notificationTargets.isActive, 1));

      for (const target of targets) {
        if (this.shouldSendToTarget(target, payload)) {
          const result = await this.sendNotification(target, payload);
          results.push(result);
        }
      }
    } catch (error) {
      console.error('[Notification] Error fetching targets:', error);
    }

    return results;
  }

  private shouldSendToTarget(target: NotificationTarget, payload: NotificationPayload): boolean {
    const filters = target.filters;
    if (!filters) return true;

    if (filters.symbols && filters.symbols.length > 0 && payload.symbol) {
      if (!filters.symbols.includes(payload.symbol)) return false;
    }

    if (filters.minConfidence && payload.confidence) {
      if (payload.confidence < filters.minConfidence) return false;
    }

    if (filters.signalTypes && filters.signalTypes.length > 0 && payload.signalType) {
      if (!filters.signalTypes.includes(payload.signalType)) return false;
    }

    return true;
  }

  async sendNotification(target: NotificationTarget, payload: NotificationPayload): Promise<NotificationResult> {
    const result: NotificationResult = {
      targetId: target.targetId,
      targetType: target.targetType,
      success: false
    };

    try {
      switch (target.targetType) {
        case 'telegram':
          await this.sendTelegram(target.targetId, payload);
          result.success = true;
          break;

        case 'discord':
          await this.sendDiscord(target.targetId, payload);
          result.success = true;
          break;

        case 'webhook':
          await this.sendWebhook(target.targetId, payload);
          result.success = true;
          break;

        default:
          result.error = `Unknown target type: ${target.targetType}`;
      }
    } catch (error) {
      result.error = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[Notification] Error sending to ${target.targetType}:`, error);
    }

    return result;
  }

  async sendTelegram(chatId: string, payload: NotificationPayload): Promise<void> {
    if (!this.telegramBotToken) {
      throw new Error('Telegram bot token not configured');
    }

    const message = this.formatTelegramMessage(payload);
    const url = `https://api.telegram.org/bot${this.telegramBotToken}/sendMessage`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Telegram API error: ${JSON.stringify(error)}`);
    }

    console.log(`[Notification] Sent Telegram message to ${chatId}`);
  }

  async sendDiscord(webhookUrl: string, payload: NotificationPayload): Promise<void> {
    const embed = this.formatDiscordEmbed(payload);

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [embed]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Discord webhook error: ${errorText}`);
    }

    console.log(`[Notification] Sent Discord message`);
  }

  async sendWebhook(webhookUrl: string, payload: NotificationPayload): Promise<void> {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Webhook error: ${response.status} ${response.statusText}`);
    }

    console.log(`[Notification] Sent webhook to ${webhookUrl}`);
  }

  private formatTelegramMessage(payload: NotificationPayload): string {
    const directionEmoji = payload.direction === 'up' ? '📈' : payload.direction === 'down' ? '📉' : '➡️';
    const signalEmoji = this.getSignalEmoji(payload.signalType);
    const riskEmoji = this.getRiskEmoji(payload.riskLevel);

    let message = `${signalEmoji} <b>${payload.title}</b>\n\n`;
    message += `${payload.message}\n\n`;

    if (payload.symbol) {
      message += `<b>Sembol:</b> ${payload.symbol}\n`;
    }
    if (payload.signalType) {
      message += `<b>Sinyal:</b> ${payload.signalType.toUpperCase()}\n`;
    }
    if (payload.direction) {
      message += `<b>Yön:</b> ${directionEmoji} ${payload.direction.toUpperCase()}\n`;
    }
    if (payload.confidence) {
      message += `<b>Güven:</b> ${payload.confidence}%\n`;
    }
    if (payload.price) {
      message += `<b>Fiyat:</b> $${payload.price.toFixed(2)}\n`;
    }
    if (payload.targetPrice) {
      message += `<b>Hedef:</b> $${payload.targetPrice.toFixed(2)}\n`;
    }
    if (payload.riskLevel) {
      message += `<b>Risk:</b> ${riskEmoji} ${payload.riskLevel.toUpperCase()}\n`;
    }

    message += `\n<i>${payload.timestamp.toLocaleString('tr-TR')}</i>`;
    message += `\n\n🤖 <i>Merf.ai Market Intelligence</i>`;

    return message;
  }

  private formatDiscordEmbed(payload: NotificationPayload): any {
    const color = this.getDiscordColor(payload.signalType, payload.direction);
    const fields: any[] = [];

    if (payload.symbol) {
      fields.push({ name: 'Sembol', value: payload.symbol, inline: true });
    }
    if (payload.signalType) {
      fields.push({ name: 'Sinyal', value: payload.signalType.toUpperCase(), inline: true });
    }
    if (payload.direction) {
      fields.push({ name: 'Yön', value: payload.direction.toUpperCase(), inline: true });
    }
    if (payload.confidence) {
      fields.push({ name: 'Güven', value: `${payload.confidence}%`, inline: true });
    }
    if (payload.price) {
      fields.push({ name: 'Fiyat', value: `$${payload.price.toFixed(2)}`, inline: true });
    }
    if (payload.targetPrice) {
      fields.push({ name: 'Hedef', value: `$${payload.targetPrice.toFixed(2)}`, inline: true });
    }
    if (payload.riskLevel) {
      fields.push({ name: 'Risk', value: payload.riskLevel.toUpperCase(), inline: true });
    }

    return {
      title: payload.title,
      description: payload.message,
      color,
      fields,
      timestamp: payload.timestamp.toISOString(),
      footer: {
        text: 'Merf.ai Market Intelligence'
      }
    };
  }

  private getSignalEmoji(signalType?: string): string {
    switch (signalType?.toLowerCase()) {
      case 'buy': return '🟢';
      case 'sell': return '🔴';
      case 'hold': return '🟡';
      case 'alert': return '⚠️';
      default: return '📊';
    }
  }

  private getRiskEmoji(riskLevel?: string): string {
    switch (riskLevel?.toLowerCase()) {
      case 'low': return '🟢';
      case 'medium': return '🟡';
      case 'high': return '🔴';
      default: return '⚪';
    }
  }

  private getDiscordColor(signalType?: string, direction?: string): number {
    if (signalType === 'buy' || direction === 'up') return 0x00ff00;
    if (signalType === 'sell' || direction === 'down') return 0xff0000;
    if (signalType === 'alert') return 0xffaa00;
    return 0x0099ff;
  }

  async notifySignal(signal: LiveSignal): Promise<NotificationResult[]> {
    const payload: NotificationPayload = {
      type: 'signal',
      title: `${signal.signalType.toUpperCase()} Sinyali - ${signal.symbol}`,
      message: `${signal.symbol} için yeni ${signal.signalType} sinyali algılandı.`,
      symbol: signal.symbol,
      signalType: signal.signalType,
      confidence: signal.confidence,
      price: signal.price || undefined,
      targetPrice: signal.targetPrice || undefined,
      direction: signal.direction,
      riskLevel: signal.riskLevel || undefined,
      timestamp: new Date()
    };

    return this.sendToAllTargets(payload);
  }

  async notifyPriceAlert(symbol: string, currentPrice: number, alertPrice: number, alertType: 'above' | 'below'): Promise<NotificationResult[]> {
    const payload: NotificationPayload = {
      type: 'price_alert',
      title: `Fiyat Uyarısı - ${symbol}`,
      message: `${symbol} fiyatı ${alertType === 'above' ? 'üstüne çıktı' : 'altına düştü'}: $${alertPrice.toFixed(2)}`,
      symbol,
      price: currentPrice,
      targetPrice: alertPrice,
      direction: alertType === 'above' ? 'up' : 'down',
      timestamp: new Date()
    };

    return this.sendToAllTargets(payload);
  }

  async testNotification(targetType: string, targetId: string): Promise<NotificationResult> {
    const testPayload: NotificationPayload = {
      type: 'alert',
      title: 'Test Bildirimi',
      message: 'Bu bir test bildirimidir. Bildirimler başarıyla yapılandırıldı!',
      symbol: 'TEST',
      signalType: 'alert',
      confidence: 100,
      timestamp: new Date()
    };

    const target: NotificationTarget = {
      id: 'test',
      userId: null,
      targetType,
      targetId,
      isActive: 1,
      filters: null,
      createdAt: new Date()
    };

    return this.sendNotification(target, testPayload);
  }

  async getTelegramBotInfo(): Promise<any> {
    if (!this.telegramBotToken) {
      return { configured: false };
    }

    try {
      const url = `https://api.telegram.org/bot${this.telegramBotToken}/getMe`;
      const response = await fetch(url);
      
      if (!response.ok) {
        return { configured: true, valid: false, error: 'Invalid token' };
      }

      const data = await response.json();
      return {
        configured: true,
        valid: true,
        botName: data.result?.username,
        botId: data.result?.id
      };
    } catch (error) {
      return { configured: true, valid: false, error: 'Connection error' };
    }
  }

  updateTelegramToken(token: string): void {
    this.telegramBotToken = token;
  }
}

export const notificationService = new NotificationService();
export default notificationService;
