/**
 * Canva Connect API Integration
 * OAuth 2.0 + PKCE authentication for design creation and management
 */

import crypto from 'crypto';

const CANVA_API_BASE = "https://api.canva.com/rest/v1";

interface CanvaTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

interface CanvaDesign {
  id: string;
  title: string;
  url: string;
  thumbnail?: {
    url: string;
    width: number;
    height: number;
  };
  created_at: string;
  updated_at: string;
}

interface CanvaAsset {
  id: string;
  name: string;
  type: string;
  url: string;
}

interface CanvaExport {
  id: string;
  status: string;
  urls?: string[];
}

class CanvaService {
  private clientId: string | undefined;
  private clientSecret: string | undefined;
  private redirectUri: string;
  private tokens: CanvaTokens | null = null;

  constructor() {
    this.clientId = process.env.CANVA_CLIENT_ID;
    this.clientSecret = process.env.CANVA_CLIENT_SECRET;
    this.redirectUri = process.env.CANVA_REDIRECT_URI || "http://127.0.0.1:5000/api/canva/callback";
  }

  isConfigured(): boolean {
    return !!(this.clientId && this.clientSecret);
  }

  generateCodeVerifier(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  generateCodeChallenge(verifier: string): string {
    return crypto.createHash('sha256').update(verifier).digest('base64url');
  }

  generateState(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  getAuthorizationUrl(scopes: string[] = ['design:content:read', 'design:content:write', 'asset:read', 'asset:write']): {
    url: string;
    codeVerifier: string;
    state: string;
  } {
    if (!this.clientId) {
      throw new Error("CANVA_CLIENT_ID is not configured");
    }

    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = this.generateCodeChallenge(codeVerifier);
    const state = this.generateState();

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: scopes.join(' '),
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      state,
    });

    return {
      url: `https://www.canva.com/api/oauth/authorize?${params.toString()}`,
      codeVerifier,
      state,
    };
  }

  async exchangeCodeForTokens(code: string, codeVerifier: string): Promise<CanvaTokens> {
    if (!this.clientId || !this.clientSecret) {
      throw new Error("Canva credentials not configured");
    }

    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

    const response = await fetch(`${CANVA_API_BASE}/oauth/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        code_verifier: codeVerifier,
        redirect_uri: this.redirectUri,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Token exchange failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    this.tokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + (data.expires_in * 1000),
    };

    return this.tokens;
  }

  async refreshAccessToken(): Promise<CanvaTokens> {
    if (!this.tokens?.refreshToken || !this.clientId || !this.clientSecret) {
      throw new Error("No refresh token available or credentials not configured");
    }

    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

    const response = await fetch(`${CANVA_API_BASE}/oauth/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.tokens.refreshToken,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Token refresh failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    this.tokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || this.tokens.refreshToken,
      expiresAt: Date.now() + (data.expires_in * 1000),
    };

    return this.tokens;
  }

  private async getValidToken(): Promise<string> {
    if (!this.tokens) {
      throw new Error("Not authenticated with Canva. Please authorize first.");
    }

    if (Date.now() >= this.tokens.expiresAt - 60000) {
      await this.refreshAccessToken();
    }

    return this.tokens.accessToken;
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const token = await this.getValidToken();

    const response = await fetch(`${CANVA_API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Canva API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  async listDesigns(limit: number = 20): Promise<CanvaDesign[]> {
    const data = await this.makeRequest(`/designs?limit=${limit}`);
    return data.items || [];
  }

  async getDesign(designId: string): Promise<CanvaDesign> {
    return this.makeRequest(`/designs/${designId}`);
  }

  async createDesignFromTemplate(templateId: string, data: Record<string, any> = {}): Promise<CanvaDesign> {
    return this.makeRequest('/designs', {
      method: 'POST',
      body: JSON.stringify({
        design_type: 'custom',
        template_id: templateId,
        autofill: data,
      }),
    });
  }

  async uploadAsset(name: string, url: string): Promise<CanvaAsset> {
    return this.makeRequest('/assets', {
      method: 'POST',
      body: JSON.stringify({
        name,
        url,
      }),
    });
  }

  async listAssets(limit: number = 50): Promise<CanvaAsset[]> {
    const data = await this.makeRequest(`/assets?limit=${limit}`);
    return data.items || [];
  }

  async exportDesign(designId: string, format: 'png' | 'jpg' | 'pdf' | 'mp4' = 'png'): Promise<CanvaExport> {
    const result = await this.makeRequest(`/designs/${designId}/exports`, {
      method: 'POST',
      body: JSON.stringify({
        format,
      }),
    });

    return {
      id: result.id,
      status: result.status,
      urls: result.urls,
    };
  }

  async checkExportStatus(designId: string, exportId: string): Promise<CanvaExport> {
    return this.makeRequest(`/designs/${designId}/exports/${exportId}`);
  }

  async listFolders(): Promise<any[]> {
    const data = await this.makeRequest('/folders');
    return data.items || [];
  }

  async listBrandTemplates(limit: number = 20): Promise<any[]> {
    const data = await this.makeRequest(`/brand-templates?limit=${limit}`);
    return data.items || [];
  }

  setTokens(tokens: CanvaTokens): void {
    this.tokens = tokens;
  }

  getTokens(): CanvaTokens | null {
    return this.tokens;
  }

  clearTokens(): void {
    this.tokens = null;
  }
}

export const canvaService = new CanvaService();
