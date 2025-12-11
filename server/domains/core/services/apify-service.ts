import { ApifyClient } from 'apify-client';

interface ApifyConfig {
  token: string;
}

interface RegionConfig {
  turkey: number;
  global: number;
}

interface ScrapeJob {
  id: string;
  platform: 'tiktok' | 'instagram' | 'twitter' | 'linkedin' | 'spotify';
  type: 'hashtag' | 'profile' | 'search' | 'trending';
  query: string;
  region?: 'turkey' | 'global' | 'mixed';
  status: 'pending' | 'running' | 'completed' | 'failed';
  resultsCount?: number;
  createdAt: Date;
  completedAt?: Date;
  error?: string;
  datasetId?: string;
}

const TURKEY_HASHTAGS = {
  tiktok: ['keşfet', 'türkiye', 'türk', 'istanbul', 'ankara', 'izmir', 'fyptr', 'kesfet', 'turkiye', 'turk', 'viral_turkiye', 'tiktokturkiye'],
  instagram: ['türkiye', 'istanbul', 'ankara', 'izmir', 'keşfet', 'turkiye', 'turkey', 'turkeyphoto', 'turkishfollowers', 'istanbulturkey'],
  twitter: ['Türkiye', 'Turkey', 'İstanbul', 'Ankara', 'gündem', 'türk'],
};

const GLOBAL_HASHTAGS = {
  tiktok: ['fyp', 'foryou', 'viral', 'trending', 'foryoupage', 'explore', 'trend'],
  instagram: ['explore', 'viral', 'trending', 'instagood', 'instadaily', 'explorepage', 'reels'],
  twitter: ['trending', 'viral', 'explore', 'fyp', 'breaking'],
};

interface TikTokScrapeInput {
  hashtags?: string[];
  profiles?: string[];
  resultsPerPage?: number;
}

interface InstagramScrapeInput {
  hashtags?: string[];
  profiles?: string[];
  resultsLimit?: number;
}

interface TwitterScrapeInput {
  searchTerms?: string[];
  profiles?: string[];
  maxTweets?: number;
}

const ACTOR_IDS = {
  tiktok: {
    hashtag: 'clockworks/tiktok-hashtag-scraper',
    profile: 'clockworks/tiktok-profile-scraper',
    general: 'clockworks/tiktok-scraper',
  },
  instagram: {
    hashtag: 'apify/instagram-hashtag-scraper',
    profile: 'apify/instagram-profile-scraper',
    post: 'apify/instagram-post-scraper',
  },
  twitter: {
    search: 'quacker/twitter-scraper',
    profile: 'apidojo/twitter-user-scraper',
  },
  linkedin: {
    profile: 'anchor/linkedin-profile-scraper',
    company: 'anchor/linkedin-company-scraper',
  },
  spotify: {
    artist: 'scrapearchitect/spotify-artist-scraper',
    monthlyListeners: 'scrapestorm/spotify-artist-monthly-listeners-contact-info-scraper',
    playCount: 'beatanalytics/spotify-play-count-scraper',
    general: 'web-scraper/spotify-scraper',
    tracks: 'easyapi/spotify-tracks-scraper',
    albums: 'easyapi/spotify-albums-scraper',
    playlists: 'jupri/spotify-playlist-scraper',
  },
};

export interface SpotifyArtistApifyData {
  artistId: string;
  name: string;
  monthlyListeners?: number;
  followers?: number;
  topCities?: Array<{ city: string; country: string; listeners: number }>;
  biography?: string;
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    wikipedia?: string;
  };
  featuredPlaylists?: Array<{ name: string; followers: number; url: string }>;
  relatedArtists?: Array<{ name: string; id: string }>;
  albums?: Array<{
    id: string;
    name: string;
    releaseDate: string;
    totalTracks: number;
    type: 'album' | 'single' | 'compilation';
  }>;
  tracks?: Array<{
    id: string;
    name: string;
    playCount?: number;
    popularity: number;
    durationMs: number;
    albumName: string;
  }>;
  verified?: boolean;
  imageUrl?: string;
  headerImageUrl?: string;
  genres?: string[];
  scrapedAt: Date;
}

export interface SpotifyPlayCountData {
  trackId: string;
  trackName: string;
  artistName: string;
  playCount: number;
  popularity: number;
  albumName: string;
  releaseDate: string;
  durationMs: number;
}

class ApifyService {
  private client: ApifyClient | null = null;
  private jobs: Map<string, ScrapeJob> = new Map();
  private regionConfig: RegionConfig = { turkey: 70, global: 30 };

  initialize(token: string): void {
    if (!token) {
      throw new Error('Apify API token is required');
    }
    this.client = new ApifyClient({ token });
    console.log('[Apify] Service initialized');
  }

  isInitialized(): boolean {
    return this.client !== null;
  }

  setRegionConfig(turkey: number, global: number): void {
    if (turkey + global !== 100) {
      throw new Error('Region percentages must add up to 100');
    }
    this.regionConfig = { turkey, global };
    console.log(`[Apify] Region config updated: Turkey ${turkey}%, Global ${global}%`);
  }

  getRegionConfig(): RegionConfig {
    return { ...this.regionConfig };
  }

  private getHashtagsByRegion(platform: 'tiktok' | 'instagram' | 'twitter', totalCount: number): { turkey: string[]; global: string[] } {
    const turkeyCount = Math.round(totalCount * (this.regionConfig.turkey / 100));
    const globalCount = totalCount - turkeyCount;

    const turkeyHashtags = TURKEY_HASHTAGS[platform] || [];
    const globalHashtags = GLOBAL_HASHTAGS[platform] || [];

    const shuffleArray = <T>(array: T[]): T[] => {
      const shuffled = [...array];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    };

    return {
      turkey: shuffleArray(turkeyHashtags).slice(0, Math.max(turkeyCount, 3)),
      global: shuffleArray(globalHashtags).slice(0, Math.max(globalCount, 2)),
    };
  }

  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async scrapeByRegion(platform: 'tiktok' | 'instagram' | 'twitter', totalResults: number = 100): Promise<ScrapeJob[]> {
    if (!this.client) throw new Error('Apify client not initialized');

    const turkeyResults = Math.round(totalResults * (this.regionConfig.turkey / 100));
    const globalResults = totalResults - turkeyResults;

    const { turkey: turkeyTags, global: globalTags } = this.getHashtagsByRegion(platform, 5);

    console.log(`[Apify] Regional scrape: ${platform} - Turkey (${turkeyResults}), Global (${globalResults})`);
    console.log(`[Apify] Turkey hashtags: ${turkeyTags.join(', ')}`);
    console.log(`[Apify] Global hashtags: ${globalTags.join(', ')}`);

    const jobs: ScrapeJob[] = [];

    if (turkeyResults > 0 && turkeyTags.length > 0) {
      try {
        let turkeyJob: ScrapeJob;
        if (platform === 'tiktok') {
          turkeyJob = await this.scrapeTikTokHashtag(turkeyTags, turkeyResults);
        } else if (platform === 'instagram') {
          turkeyJob = await this.scrapeInstagramHashtag(turkeyTags, turkeyResults);
        } else {
          turkeyJob = await this.scrapeTwitterSearch(turkeyTags, turkeyResults);
        }
        turkeyJob.region = 'turkey';
        jobs.push(turkeyJob);
      } catch (error: any) {
        console.error(`[Apify] Turkey scrape failed:`, error.message);
      }
    }

    if (globalResults > 0 && globalTags.length > 0) {
      try {
        let globalJob: ScrapeJob;
        if (platform === 'tiktok') {
          globalJob = await this.scrapeTikTokHashtag(globalTags, globalResults);
        } else if (platform === 'instagram') {
          globalJob = await this.scrapeInstagramHashtag(globalTags, globalResults);
        } else {
          globalJob = await this.scrapeTwitterSearch(globalTags, globalResults);
        }
        globalJob.region = 'global';
        jobs.push(globalJob);
      } catch (error: any) {
        console.error(`[Apify] Global scrape failed:`, error.message);
      }
    }

    return jobs;
  }

  async scrapeTikTokHashtag(hashtags: string[], resultsPerPage: number = 50): Promise<ScrapeJob> {
    if (!this.client) throw new Error('Apify client not initialized');

    const jobId = this.generateJobId();
    const job: ScrapeJob = {
      id: jobId,
      platform: 'tiktok',
      type: 'hashtag',
      query: hashtags.join(', '),
      status: 'running',
      createdAt: new Date(),
    };
    this.jobs.set(jobId, job);

    try {
      console.log(`[Apify] Starting TikTok hashtag scrape: ${hashtags.join(', ')}`);
      
      const run = await this.client.actor(ACTOR_IDS.tiktok.hashtag).call({
        hashtags: hashtags.map(h => h.replace('#', '')),
        resultsPerPage,
      });

      const { items } = await this.client.dataset(run.defaultDatasetId).listItems();

      job.status = 'completed';
      job.resultsCount = items.length;
      job.completedAt = new Date();
      job.datasetId = run.defaultDatasetId;

      console.log(`[Apify] TikTok scrape completed: ${items.length} results`);
      
      return job;
    } catch (error: any) {
      job.status = 'failed';
      job.error = error.message;
      console.error(`[Apify] TikTok scrape failed:`, error.message);
      throw error;
    }
  }

  async scrapeTikTokProfile(profiles: string[], resultsPerProfile: number = 100): Promise<ScrapeJob> {
    if (!this.client) throw new Error('Apify client not initialized');

    const jobId = this.generateJobId();
    const job: ScrapeJob = {
      id: jobId,
      platform: 'tiktok',
      type: 'profile',
      query: profiles.join(', '),
      status: 'running',
      createdAt: new Date(),
    };
    this.jobs.set(jobId, job);

    try {
      console.log(`[Apify] Starting TikTok profile scrape: ${profiles.join(', ')}`);
      
      const run = await this.client.actor(ACTOR_IDS.tiktok.profile).call({
        profiles,
        resultsPerProfile,
      });

      const { items } = await this.client.dataset(run.defaultDatasetId).listItems();

      job.status = 'completed';
      job.resultsCount = items.length;
      job.completedAt = new Date();
      job.datasetId = run.defaultDatasetId;

      console.log(`[Apify] TikTok profile scrape completed: ${items.length} results`);
      
      return job;
    } catch (error: any) {
      job.status = 'failed';
      job.error = error.message;
      console.error(`[Apify] TikTok profile scrape failed:`, error.message);
      throw error;
    }
  }

  async scrapeInstagramHashtag(hashtags: string[], resultsLimit: number = 100): Promise<ScrapeJob> {
    if (!this.client) throw new Error('Apify client not initialized');

    const jobId = this.generateJobId();
    const job: ScrapeJob = {
      id: jobId,
      platform: 'instagram',
      type: 'hashtag',
      query: hashtags.join(', '),
      status: 'running',
      createdAt: new Date(),
    };
    this.jobs.set(jobId, job);

    try {
      console.log(`[Apify] Starting Instagram hashtag scrape: ${hashtags.join(', ')}`);
      
      const run = await this.client.actor(ACTOR_IDS.instagram.hashtag).call({
        hashtags: hashtags.map(h => h.replace('#', '')),
        resultsLimit,
      });

      const { items } = await this.client.dataset(run.defaultDatasetId).listItems();

      job.status = 'completed';
      job.resultsCount = items.length;
      job.completedAt = new Date();
      job.datasetId = run.defaultDatasetId;

      console.log(`[Apify] Instagram scrape completed: ${items.length} results`);
      
      return job;
    } catch (error: any) {
      job.status = 'failed';
      job.error = error.message;
      console.error(`[Apify] Instagram scrape failed:`, error.message);
      throw error;
    }
  }

  async scrapeInstagramProfile(profiles: string[], resultsLimit: number = 100): Promise<ScrapeJob> {
    if (!this.client) throw new Error('Apify client not initialized');

    const jobId = this.generateJobId();
    const job: ScrapeJob = {
      id: jobId,
      platform: 'instagram',
      type: 'profile',
      query: profiles.join(', '),
      status: 'running',
      createdAt: new Date(),
    };
    this.jobs.set(jobId, job);

    try {
      console.log(`[Apify] Starting Instagram profile scrape: ${profiles.join(', ')}`);
      
      const run = await this.client.actor(ACTOR_IDS.instagram.profile).call({
        usernames: profiles,
        resultsLimit,
      });

      const { items } = await this.client.dataset(run.defaultDatasetId).listItems();

      job.status = 'completed';
      job.resultsCount = items.length;
      job.completedAt = new Date();
      job.datasetId = run.defaultDatasetId;

      console.log(`[Apify] Instagram profile scrape completed: ${items.length} results`);
      
      return job;
    } catch (error: any) {
      job.status = 'failed';
      job.error = error.message;
      console.error(`[Apify] Instagram profile scrape failed:`, error.message);
      throw error;
    }
  }

  async scrapeTwitterSearch(searchTerms: string[], maxTweets: number = 100): Promise<ScrapeJob> {
    if (!this.client) throw new Error('Apify client not initialized');

    const jobId = this.generateJobId();
    const job: ScrapeJob = {
      id: jobId,
      platform: 'twitter',
      type: 'search',
      query: searchTerms.join(', '),
      status: 'running',
      createdAt: new Date(),
    };
    this.jobs.set(jobId, job);

    try {
      console.log(`[Apify] Starting Twitter search: ${searchTerms.join(', ')}`);
      
      const run = await this.client.actor(ACTOR_IDS.twitter.search).call({
        searchTerms,
        maxTweets,
        addUserInfo: true,
      });

      const { items } = await this.client.dataset(run.defaultDatasetId).listItems();

      job.status = 'completed';
      job.resultsCount = items.length;
      job.completedAt = new Date();
      job.datasetId = run.defaultDatasetId;

      console.log(`[Apify] Twitter scrape completed: ${items.length} results`);
      
      return job;
    } catch (error: any) {
      job.status = 'failed';
      job.error = error.message;
      console.error(`[Apify] Twitter scrape failed:`, error.message);
      throw error;
    }
  }

  async scrapeTwitterProfile(profiles: string[], maxTweets: number = 100): Promise<ScrapeJob> {
    if (!this.client) throw new Error('Apify client not initialized');

    const jobId = this.generateJobId();
    const job: ScrapeJob = {
      id: jobId,
      platform: 'twitter',
      type: 'profile',
      query: profiles.join(', '),
      status: 'running',
      createdAt: new Date(),
    };
    this.jobs.set(jobId, job);

    try {
      console.log(`[Apify] Starting Twitter profile scrape: ${profiles.join(', ')}`);
      
      const run = await this.client.actor(ACTOR_IDS.twitter.profile).call({
        handles: profiles,
        tweetsDesired: maxTweets,
      });

      const { items } = await this.client.dataset(run.defaultDatasetId).listItems();

      job.status = 'completed';
      job.resultsCount = items.length;
      job.completedAt = new Date();
      job.datasetId = run.defaultDatasetId;

      console.log(`[Apify] Twitter profile scrape completed: ${items.length} results`);
      
      return job;
    } catch (error: any) {
      job.status = 'failed';
      job.error = error.message;
      console.error(`[Apify] Twitter profile scrape failed:`, error.message);
      throw error;
    }
  }

  async getDatasetItems(datasetId: string): Promise<any[]> {
    if (!this.client) throw new Error('Apify client not initialized');

    const { items } = await this.client.dataset(datasetId).listItems();
    return items;
  }

  getJob(jobId: string): ScrapeJob | undefined {
    return this.jobs.get(jobId);
  }

  getAllJobs(): ScrapeJob[] {
    return Array.from(this.jobs.values()).sort((a, b) => 
      b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  async getAccountInfo(): Promise<any> {
    if (!this.client) throw new Error('Apify client not initialized');
    
    try {
      const user = await this.client.user().get();
      return user;
    } catch (error: any) {
      console.error('[Apify] Failed to get account info:', error.message);
      throw error;
    }
  }

  async scrapeSpotifyArtist(artistUrlOrId: string): Promise<SpotifyArtistApifyData | null> {
    if (!this.client) throw new Error('Apify client not initialized');

    const jobId = this.generateJobId();
    const job: ScrapeJob = {
      id: jobId,
      platform: 'spotify',
      type: 'profile',
      query: artistUrlOrId,
      status: 'running',
      createdAt: new Date(),
    };
    this.jobs.set(jobId, job);

    try {
      console.log(`[Apify] Starting Spotify artist scrape: ${artistUrlOrId}`);
      
      const artistUrl = artistUrlOrId.includes('spotify.com') 
        ? artistUrlOrId 
        : `https://open.spotify.com/artist/${artistUrlOrId}`;

      const run = await this.client.actor(ACTOR_IDS.spotify.artist).call({
        startUrls: [{ url: artistUrl }],
        maxResults: 1,
      });

      const { items } = await this.client.dataset(run.defaultDatasetId).listItems();

      job.status = 'completed';
      job.resultsCount = items.length;
      job.completedAt = new Date();
      job.datasetId = run.defaultDatasetId;

      if (items.length === 0) {
        console.log('[Apify] No Spotify artist data found');
        return null;
      }

      const data = items[0] as any;
      console.log(`[Apify] Spotify artist scrape completed: ${data.name || artistUrlOrId}`);
      
      return {
        artistId: data.id || artistUrlOrId,
        name: data.name || 'Unknown',
        monthlyListeners: data.monthlyListeners || data.stats?.monthlyListeners,
        followers: data.followers || data.stats?.followers,
        verified: data.verified,
        imageUrl: data.image || data.images?.[0]?.url,
        headerImageUrl: data.headerImage,
        genres: data.genres || [],
        biography: data.biography || data.bio,
        topCities: data.topCities || data.stats?.topCities?.map((c: any) => ({
          city: c.city,
          country: c.country,
          listeners: c.numberOfListeners || c.listeners,
        })),
        socialLinks: {
          facebook: data.facebook || data.externalLinks?.facebook,
          instagram: data.instagram || data.externalLinks?.instagram,
          twitter: data.twitter || data.externalLinks?.twitter,
          wikipedia: data.wikipedia || data.externalLinks?.wikipedia,
        },
        featuredPlaylists: data.featuredPlaylists || data.playlists?.map((p: any) => ({
          name: p.name,
          followers: p.followers,
          url: p.url || p.uri,
        })),
        relatedArtists: data.relatedArtists?.map((a: any) => ({
          name: a.name,
          id: a.id,
        })),
        albums: data.albums?.map((a: any) => ({
          id: a.id,
          name: a.name,
          releaseDate: a.releaseDate || a.release_date,
          totalTracks: a.totalTracks || a.total_tracks,
          type: a.albumType || a.type || 'album',
        })),
        tracks: data.tracks || data.topTracks?.map((t: any) => ({
          id: t.id,
          name: t.name,
          playCount: t.playCount || t.playcount,
          popularity: t.popularity,
          durationMs: t.duration_ms || t.durationMs,
          albumName: t.album?.name || t.albumName,
        })),
        scrapedAt: new Date(),
      };
    } catch (error: any) {
      job.status = 'failed';
      job.error = error.message;
      console.error(`[Apify] Spotify artist scrape failed:`, error.message);
      return null;
    }
  }

  async scrapeSpotifyMonthlyListeners(artistUrlOrId: string): Promise<{
    monthlyListeners: number;
    topCities: Array<{ city: string; country: string; listeners: number }>;
    featuredPlaylists: Array<{ name: string; followers: number }>;
    biography: string;
    socialLinks: Record<string, string>;
  } | null> {
    if (!this.client) throw new Error('Apify client not initialized');

    try {
      console.log(`[Apify] Starting Spotify monthly listeners scrape: ${artistUrlOrId}`);
      
      const artistUrl = artistUrlOrId.includes('spotify.com') 
        ? artistUrlOrId 
        : `https://open.spotify.com/artist/${artistUrlOrId}`;

      const run = await this.client.actor(ACTOR_IDS.spotify.monthlyListeners).call({
        artistUrls: [artistUrl],
      });

      const { items } = await this.client.dataset(run.defaultDatasetId).listItems();

      if (items.length === 0) {
        console.log('[Apify] No monthly listeners data found');
        return null;
      }

      const data = items[0] as any;
      console.log(`[Apify] Monthly listeners: ${data.monthlyListeners?.toLocaleString() || 'N/A'}`);
      
      return {
        monthlyListeners: data.monthlyListeners || 0,
        topCities: data.topCities?.map((c: any) => ({
          city: c.city,
          country: c.country,
          listeners: c.numberOfListeners || c.listeners || 0,
        })) || [],
        featuredPlaylists: data.featuredPlaylists?.map((p: any) => ({
          name: p.name,
          followers: p.followers || 0,
        })) || [],
        biography: data.biography || '',
        socialLinks: data.socialLinks || {},
      };
    } catch (error: any) {
      console.error(`[Apify] Spotify monthly listeners scrape failed:`, error.message);
      return null;
    }
  }

  async scrapeSpotifyPlayCounts(artistUrlOrId: string): Promise<SpotifyPlayCountData[]> {
    if (!this.client) throw new Error('Apify client not initialized');

    try {
      console.log(`[Apify] Starting Spotify play count scrape: ${artistUrlOrId}`);
      
      const artistUrl = artistUrlOrId.includes('spotify.com') 
        ? artistUrlOrId 
        : `https://open.spotify.com/artist/${artistUrlOrId}`;

      const run = await this.client.actor(ACTOR_IDS.spotify.playCount).call({
        artistUrls: [artistUrl],
        includeAlbums: true,
      });

      const { items } = await this.client.dataset(run.defaultDatasetId).listItems();

      console.log(`[Apify] Play count scrape completed: ${items.length} tracks`);
      
      return items.map((item: any) => ({
        trackId: item.id || item.trackId,
        trackName: item.name || item.trackName,
        artistName: item.artistName || item.artist,
        playCount: item.playCount || item.playcount || 0,
        popularity: item.popularity || 0,
        albumName: item.albumName || item.album?.name || '',
        releaseDate: item.releaseDate || item.release_date || '',
        durationMs: item.durationMs || item.duration_ms || 0,
      }));
    } catch (error: any) {
      console.error(`[Apify] Spotify play count scrape failed:`, error.message);
      return [];
    }
  }

  async scrapeSpotifyTracks(searchKeywords: string[], maxResults: number = 50): Promise<any[]> {
    if (!this.client) throw new Error('Apify client not initialized');

    try {
      console.log(`[Apify] Starting Spotify tracks search: ${searchKeywords.join(', ')}`);
      
      const run = await this.client.actor(ACTOR_IDS.spotify.tracks).call({
        keywords: searchKeywords,
        maxResults,
      });

      const { items } = await this.client.dataset(run.defaultDatasetId).listItems();

      console.log(`[Apify] Tracks search completed: ${items.length} results`);
      
      return items;
    } catch (error: any) {
      console.error(`[Apify] Spotify tracks search failed:`, error.message);
      return [];
    }
  }

  async scrapeSpotifyPlaylist(playlistUrlOrId: string): Promise<{
    name: string;
    description: string;
    followers: number;
    owner: string;
    totalTracks: number;
    tracks: Array<{
      id: string;
      name: string;
      artistName: string;
      popularity: number;
      durationMs: number;
    }>;
  } | null> {
    if (!this.client) throw new Error('Apify client not initialized');

    try {
      console.log(`[Apify] Starting Spotify playlist scrape: ${playlistUrlOrId}`);
      
      const playlistUrl = playlistUrlOrId.includes('spotify.com') 
        ? playlistUrlOrId 
        : `https://open.spotify.com/playlist/${playlistUrlOrId}`;

      const run = await this.client.actor(ACTOR_IDS.spotify.playlists).call({
        playlistUrls: [playlistUrl],
      });

      const { items } = await this.client.dataset(run.defaultDatasetId).listItems();

      if (items.length === 0) {
        console.log('[Apify] No playlist data found');
        return null;
      }

      const data = items[0] as any;
      console.log(`[Apify] Playlist scrape completed: ${data.name}`);
      
      return {
        name: data.name || 'Unknown Playlist',
        description: data.description || '',
        followers: data.followers || 0,
        owner: data.owner?.displayName || data.ownerName || 'Unknown',
        totalTracks: data.totalTracks || data.tracks?.length || 0,
        tracks: data.tracks?.map((t: any) => ({
          id: t.id,
          name: t.name,
          artistName: t.artists?.[0]?.name || t.artistName || 'Unknown',
          popularity: t.popularity || 0,
          durationMs: t.duration_ms || t.durationMs || 0,
        })) || [],
      };
    } catch (error: any) {
      console.error(`[Apify] Spotify playlist scrape failed:`, error.message);
      return null;
    }
  }

  async getFullSpotifyArtistData(artistUrlOrId: string): Promise<SpotifyArtistApifyData | null> {
    if (!this.client) throw new Error('Apify client not initialized');

    console.log(`[Apify] Starting full Spotify artist data collection: ${artistUrlOrId}`);

    const artistData = await this.scrapeSpotifyArtist(artistUrlOrId);
    
    if (!artistData) {
      return null;
    }

    try {
      const [monthlyData, playCounts] = await Promise.all([
        this.scrapeSpotifyMonthlyListeners(artistUrlOrId).catch(() => null),
        this.scrapeSpotifyPlayCounts(artistUrlOrId).catch(() => []),
      ]);

      if (monthlyData) {
        artistData.monthlyListeners = monthlyData.monthlyListeners || artistData.monthlyListeners;
        artistData.topCities = monthlyData.topCities.length > 0 ? monthlyData.topCities : artistData.topCities;
        artistData.featuredPlaylists = monthlyData.featuredPlaylists.length > 0 
          ? monthlyData.featuredPlaylists.map(p => ({ ...p, url: '' }))
          : artistData.featuredPlaylists;
        artistData.biography = monthlyData.biography || artistData.biography;
        artistData.socialLinks = { ...artistData.socialLinks, ...monthlyData.socialLinks };
      }

      if (playCounts.length > 0 && artistData.tracks) {
        const playCountMap = new Map(playCounts.map(pc => [pc.trackId, pc.playCount]));
        artistData.tracks = artistData.tracks.map(track => ({
          ...track,
          playCount: playCountMap.get(track.id) || track.playCount,
        }));
      }

      console.log(`[Apify] Full Spotify data collected for: ${artistData.name}`);
      console.log(`  - Monthly listeners: ${artistData.monthlyListeners?.toLocaleString() || 'N/A'}`);
      console.log(`  - Top cities: ${artistData.topCities?.length || 0}`);
      console.log(`  - Tracks with play counts: ${playCounts.length}`);

      return artistData;
    } catch (error: any) {
      console.error('[Apify] Error enriching artist data:', error.message);
      return artistData;
    }
  }
}

export const apifyService = new ApifyService();
export type { ScrapeJob };
