// Spotify Service - supports both Replit Connector and custom credentials
import { SpotifyApi } from "@spotify/web-api-ts-sdk";

// Check if custom Spotify credentials are configured
function hasCustomCredentials(): boolean {
  return !!(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET);
}

interface SpotifyAudioFeatures {
  energy: number;
  valence: number;
  danceability: number;
  tempo: number;
  acousticness: number;
  instrumentalness: number;
  speechiness: number;
  liveness: number;
  loudness: number;
  key: number;
  mode: number;
  time_signature: number;
  duration_ms: number;
}

interface SpotifyArtist {
  id: string;
  name: string;
  popularity: number;
  followers: { total: number };
  genres: string[];
}

interface SpotifyTrack {
  id: string;
  name: string;
  artists: Array<{ id: string; name: string }>;
  album: {
    id: string;
    name: string;
    release_date: string;
    images: Array<{ url: string; width: number; height: number }>;
  };
  popularity: number;
  duration_ms: number;
  explicit: boolean;
  external_urls: { spotify: string };
  preview_url: string | null;
}

interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string;
  owner: { display_name: string };
  followers: { total: number };
  images: Array<{ url: string }>;
  tracks: {
    total: number;
    items: Array<{ track: SpotifyTrack }>;
  };
}

export interface TrackData {
  metadata: SpotifyTrack;
  audioFeatures: SpotifyAudioFeatures;
  artist: SpotifyArtist;
}

export interface PlaylistData {
  metadata: SpotifyPlaylist;
  tracks: TrackData[];
}

let connectionSettings: any = null;
let cachedSpotifyClient: SpotifyApi | null = null;
let clientCacheTime: number = 0;
const CLIENT_CACHE_DURATION = 3000000; // 50 minutes (tokens expire in 1 hour)

// Get Spotify client using custom credentials (Client Credentials Flow)
async function getSpotifyClientWithCustomCredentials(): Promise<SpotifyApi> {
  const now = Date.now();
  
  // Return cached client if still valid
  if (cachedSpotifyClient && (now - clientCacheTime) < CLIENT_CACHE_DURATION) {
    return cachedSpotifyClient;
  }
  
  const clientId = process.env.SPOTIFY_CLIENT_ID!;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET!;
  
  console.log('[Spotify] Using custom credentials (Client Credentials Flow)');
  
  // Use Client Credentials Flow for server-to-server authentication
  cachedSpotifyClient = SpotifyApi.withClientCredentials(clientId, clientSecret);
  clientCacheTime = now;
  
  return cachedSpotifyClient;
}

// Get Spotify client using Replit Connector
async function getSpotifyClientWithConnector(): Promise<SpotifyApi> {
  // Always fetch fresh token from connector
  connectionSettings = null;
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('Replit token bulunamadı');
  }

  const response = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=spotify',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  );
  
  const data = await response.json();
  connectionSettings = data.items?.[0];

  const refreshToken = connectionSettings?.settings?.oauth?.credentials?.refresh_token;
  const accessToken = connectionSettings?.settings?.access_token || connectionSettings?.settings?.oauth?.credentials?.access_token;
  const clientId = connectionSettings?.settings?.oauth?.credentials?.client_id;
  const expiresIn = connectionSettings?.settings?.oauth?.credentials?.expires_in;

  if (!connectionSettings || (!accessToken || !clientId || !refreshToken)) {
    throw new Error('Spotify bağlantısı kurulmamış');
  }

  const spotify = SpotifyApi.withAccessToken(clientId, {
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: expiresIn || 3600,
    refresh_token: refreshToken,
  });

  return spotify;
}

// Clear cache when OAuth errors occur
export function clearSpotifyCache() {
  connectionSettings = null;
  cachedSpotifyClient = null;
  clientCacheTime = 0;
}

// Main function to get Spotify client - tries custom credentials first, then connector
async function getSpotifyClient(): Promise<SpotifyApi> {
  if (hasCustomCredentials()) {
    return getSpotifyClientWithCustomCredentials();
  }
  return getSpotifyClientWithConnector();
}

class SpotifyService {
  async getTrackData(trackId: string): Promise<TrackData> {
    const client = await getSpotifyClient();
    
    // Get track info first
    const track = await client.tracks.get(trackId);
    const artist = await client.artists.get(track.artists[0].id);

    // Try to get audio features, but fallback to estimated values if not available
    // Note: Audio features may not be available with Client Credentials Flow for some apps
    let audioFeatures: SpotifyAudioFeatures;
    try {
      const audioFeaturesArr = await client.tracks.audioFeatures([trackId]);
      audioFeatures = audioFeaturesArr[0] || this.estimateAudioFeatures(track, artist);
    } catch (error) {
      console.log('[Spotify] Audio features not available, using estimates based on track/artist data');
      audioFeatures = this.estimateAudioFeatures(track, artist);
    }

    return {
      metadata: {
        id: track.id,
        name: track.name,
        artists: track.artists.map(a => ({ id: a.id, name: a.name })),
        album: {
          id: track.album.id,
          name: track.album.name,
          release_date: track.album.release_date,
          images: track.album.images,
        },
        popularity: track.popularity,
        duration_ms: track.duration_ms,
        explicit: track.explicit,
        external_urls: track.external_urls,
        preview_url: track.preview_url,
      },
      audioFeatures: {
        energy: audioFeatures.energy,
        valence: audioFeatures.valence,
        danceability: audioFeatures.danceability,
        tempo: audioFeatures.tempo,
        acousticness: audioFeatures.acousticness,
        instrumentalness: audioFeatures.instrumentalness,
        speechiness: audioFeatures.speechiness,
        liveness: audioFeatures.liveness,
        loudness: audioFeatures.loudness,
        key: audioFeatures.key,
        mode: audioFeatures.mode,
        time_signature: audioFeatures.time_signature,
        duration_ms: audioFeatures.duration_ms,
      },
      artist: {
        id: artist.id,
        name: artist.name,
        popularity: artist.popularity,
        followers: { total: artist.followers.total },
        genres: artist.genres,
      },
    };
  }

  // Estimate audio features based on track popularity, artist genres, and other available data
  private estimateAudioFeatures(track: any, artist: any): SpotifyAudioFeatures {
    const genres = artist.genres || [];
    const popularity = track.popularity || 50;
    
    // Base values
    let energy = 0.6;
    let valence = 0.5;
    let danceability = 0.6;
    let tempo = 120;
    let acousticness = 0.3;
    let instrumentalness = 0.05;
    let speechiness = 0.1;
    let loudness = -8;
    
    // Adjust based on genres
    const genreStr = genres.join(' ').toLowerCase();
    
    if (genreStr.includes('rap') || genreStr.includes('hip hop') || genreStr.includes('hip-hop')) {
      energy = 0.75;
      speechiness = 0.25;
      danceability = 0.75;
      tempo = 130;
    }
    if (genreStr.includes('pop')) {
      valence = 0.65;
      danceability = 0.7;
      energy = 0.7;
    }
    if (genreStr.includes('rock') || genreStr.includes('metal')) {
      energy = 0.85;
      loudness = -5;
      tempo = 140;
    }
    if (genreStr.includes('chill') || genreStr.includes('lo-fi') || genreStr.includes('ambient')) {
      energy = 0.35;
      valence = 0.4;
      tempo = 90;
      acousticness = 0.6;
    }
    if (genreStr.includes('turkish') || genreStr.includes('arabesk')) {
      valence = 0.45;
      acousticness = 0.4;
    }
    if (genreStr.includes('electronic') || genreStr.includes('edm') || genreStr.includes('dance')) {
      energy = 0.85;
      danceability = 0.8;
      tempo = 128;
    }
    
    // Adjust based on popularity - popular tracks tend to be more energetic and danceable
    if (popularity > 70) {
      energy = Math.min(1, energy + 0.1);
      danceability = Math.min(1, danceability + 0.1);
    }
    
    return {
      energy,
      valence,
      danceability,
      tempo,
      acousticness,
      instrumentalness,
      speechiness,
      liveness: 0.15,
      loudness,
      key: 0,
      mode: 1,
      time_signature: 4,
      duration_ms: track.duration_ms,
    };
  }

  async getPlaylistData(playlistId: string, limit: number = 50): Promise<PlaylistData> {
    const client = await getSpotifyClient();
    
    const playlist = await client.playlists.getPlaylist(playlistId);
    
    const trackIds = playlist.tracks.items
      .filter(item => item.track && 'id' in item.track && item.track.id)
      .map(item => (item.track as any).id)
      .slice(0, limit);

    if (trackIds.length === 0) {
      return {
        metadata: {
          id: playlist.id,
          name: playlist.name,
          description: playlist.description || '',
          owner: { display_name: playlist.owner.display_name || 'Unknown' },
          followers: { total: playlist.followers.total },
          images: playlist.images,
          tracks: {
            total: playlist.tracks.total,
            items: [],
          },
        },
        tracks: [],
      };
    }

    // Try to get audio features, but fallback gracefully if not available
    let audioFeaturesArr: any[] = [];
    try {
      audioFeaturesArr = await client.tracks.audioFeatures(trackIds);
    } catch (error) {
      console.log('[Spotify] Audio features not available for playlist tracks, using default values');
      audioFeaturesArr = [];
    }

    const defaultAudioFeatures = {
      energy: 0.5,
      valence: 0.5,
      danceability: 0.5,
      tempo: 120,
      acousticness: 0.5,
      instrumentalness: 0,
      speechiness: 0.1,
      liveness: 0.2,
      loudness: -10,
      key: 0,
      mode: 1,
      time_signature: 4,
      duration_ms: 200000,
    };

    const tracks: TrackData[] = playlist.tracks.items
      .filter(item => item.track && 'id' in item.track && item.track.id)
      .slice(0, limit)
      .map((item, index) => {
        const track = item.track as any;
        const audioFeatures = audioFeaturesArr[index] || defaultAudioFeatures;

        return {
          metadata: {
            id: track.id,
            name: track.name,
            artists: track.artists?.map((a: any) => ({ id: a.id, name: a.name })) || [],
            album: {
              id: track.album?.id || '',
              name: track.album?.name || '',
              release_date: track.album?.release_date || '',
              images: track.album?.images || [],
            },
            popularity: track.popularity || 50,
            duration_ms: track.duration_ms || 200000,
            explicit: track.explicit || false,
            external_urls: track.external_urls || { spotify: '' },
            preview_url: track.preview_url || null,
          },
          audioFeatures: {
            energy: audioFeatures.energy,
            valence: audioFeatures.valence,
            danceability: audioFeatures.danceability,
            tempo: audioFeatures.tempo,
            acousticness: audioFeatures.acousticness,
            instrumentalness: audioFeatures.instrumentalness,
            speechiness: audioFeatures.speechiness,
            liveness: audioFeatures.liveness,
            loudness: audioFeatures.loudness,
            key: audioFeatures.key,
            mode: audioFeatures.mode,
            time_signature: audioFeatures.time_signature,
            duration_ms: audioFeatures.duration_ms,
          },
          artist: {
            id: track.artists?.[0]?.id || '',
            name: track.artists?.[0]?.name || 'Unknown',
            popularity: 50,
            followers: { total: 0 },
            genres: [],
          },
        };
      });

    return {
      metadata: {
        id: playlist.id,
        name: playlist.name,
        description: playlist.description || '',
        owner: { display_name: playlist.owner.display_name || 'Unknown' },
        followers: { total: playlist.followers.total },
        images: playlist.images,
        tracks: {
          total: playlist.tracks.total,
          items: tracks.map(t => ({ track: t.metadata })),
        },
      },
      tracks,
    };
  }

  async searchTrack(query: string, limit: number = 5): Promise<SpotifyTrack[]> {
    const client = await getSpotifyClient();
    const results = await client.search(query, ['track'], undefined, limit as 5);
    
    return results.tracks.items.map(track => ({
      id: track.id,
      name: track.name,
      artists: track.artists.map(a => ({ id: a.id, name: a.name })),
      album: {
        id: track.album.id,
        name: track.album.name,
        release_date: track.album.release_date,
        images: track.album.images,
      },
      popularity: track.popularity,
      duration_ms: track.duration_ms,
      explicit: track.explicit,
      external_urls: track.external_urls,
      preview_url: track.preview_url,
    }));
  }

  extractTrackId(input: string): string | null {
    if (input.includes("spotify.com/track/")) {
      const match = input.match(/track\/([a-zA-Z0-9]+)/);
      return match ? match[1] : null;
    }
    if (input.match(/^[a-zA-Z0-9]{22}$/)) {
      return input;
    }
    return null;
  }

  extractPlaylistId(input: string): string | null {
    if (input.includes("spotify.com/playlist/")) {
      const match = input.match(/playlist\/([a-zA-Z0-9]+)/);
      return match ? match[1] : null;
    }
    if (input.match(/^[a-zA-Z0-9]{22}$/)) {
      return input;
    }
    return null;
  }

  extractArtistId(input: string): string | null {
    if (input.includes("spotify.com/artist/")) {
      const match = input.match(/artist\/([a-zA-Z0-9]+)/);
      return match ? match[1] : null;
    }
    if (input.match(/^[a-zA-Z0-9]{22}$/)) {
      return input;
    }
    return null;
  }

  async searchArtist(query: string, limit: number = 5): Promise<SpotifyArtist[]> {
    const client = await getSpotifyClient();
    const results = await client.search(query, ['artist'], undefined, limit as 5);
    
    return results.artists.items.map(artist => ({
      id: artist.id,
      name: artist.name,
      popularity: artist.popularity,
      followers: { total: artist.followers.total },
      genres: artist.genres,
    }));
  }

  async getArtistData(artistId: string): Promise<{
    artist: SpotifyArtist;
    topTracks: TrackData[];
    avgFeatures: {
      energy: number;
      valence: number;
      danceability: number;
      tempo: number;
      acousticness: number;
      instrumentalness: number;
      speechiness: number;
      liveness: number;
    };
  }> {
    const client = await getSpotifyClient();
    
    // Get artist info first
    const artist = await client.artists.get(artistId);
    
    // Try to get top tracks, fallback to search if not available (Client Credentials limitation)
    let tracks: any[] = [];
    try {
      const topTracksResult = await client.artists.topTracks(artistId, 'TR');
      tracks = topTracksResult.tracks.slice(0, 10);
    } catch (error) {
      console.log('[Spotify] Top tracks not available via API, using search as fallback');
      // Fallback: search for artist's tracks
      const searchResults = await client.search(`artist:${artist.name}`, ['track'], undefined, 10);
      tracks = searchResults.tracks.items
        .filter(t => t.artists.some(a => a.id === artistId))
        .slice(0, 10);
    }

    // If still no tracks, create estimated data based on artist info
    if (tracks.length === 0) {
      console.log('[Spotify] No tracks found, generating estimated playlist data');
      const estimatedFeatures = this.estimateAudioFeatures({ popularity: artist.popularity, duration_ms: 200000 }, artist);
      
      return {
        artist: {
          id: artist.id,
          name: artist.name,
          popularity: artist.popularity,
          followers: { total: artist.followers.total },
          genres: artist.genres,
        },
        topTracks: [],
        avgFeatures: {
          energy: estimatedFeatures.energy,
          valence: estimatedFeatures.valence,
          danceability: estimatedFeatures.danceability,
          tempo: estimatedFeatures.tempo,
          acousticness: estimatedFeatures.acousticness,
          instrumentalness: estimatedFeatures.instrumentalness,
          speechiness: estimatedFeatures.speechiness,
          liveness: estimatedFeatures.liveness,
        },
      };
    }

    const topTracks: TrackData[] = tracks.map((track) => {
      const audioFeatures = this.estimateAudioFeatures(track, artist);

      return {
        metadata: {
          id: track.id,
          name: track.name,
          artists: track.artists.map((a: any) => ({ id: a.id, name: a.name })),
          album: {
            id: track.album.id,
            name: track.album.name,
            release_date: track.album.release_date,
            images: track.album.images,
          },
          popularity: track.popularity,
          duration_ms: track.duration_ms,
          explicit: track.explicit,
          external_urls: track.external_urls,
          preview_url: track.preview_url,
        },
        audioFeatures: {
          energy: audioFeatures.energy,
          valence: audioFeatures.valence,
          danceability: audioFeatures.danceability,
          tempo: audioFeatures.tempo,
          acousticness: audioFeatures.acousticness,
          instrumentalness: audioFeatures.instrumentalness,
          speechiness: audioFeatures.speechiness,
          liveness: audioFeatures.liveness,
          loudness: audioFeatures.loudness,
          key: audioFeatures.key,
          mode: audioFeatures.mode,
          time_signature: audioFeatures.time_signature,
          duration_ms: audioFeatures.duration_ms,
        },
        artist: {
          id: artist.id,
          name: artist.name,
          popularity: artist.popularity,
          followers: { total: artist.followers.total },
          genres: artist.genres,
        },
      };
    });

    const avgFeatures = {
      energy: topTracks.reduce((sum, t) => sum + t.audioFeatures.energy, 0) / topTracks.length,
      valence: topTracks.reduce((sum, t) => sum + t.audioFeatures.valence, 0) / topTracks.length,
      danceability: topTracks.reduce((sum, t) => sum + t.audioFeatures.danceability, 0) / topTracks.length,
      tempo: topTracks.reduce((sum, t) => sum + t.audioFeatures.tempo, 0) / topTracks.length,
      acousticness: topTracks.reduce((sum, t) => sum + t.audioFeatures.acousticness, 0) / topTracks.length,
      instrumentalness: topTracks.reduce((sum, t) => sum + t.audioFeatures.instrumentalness, 0) / topTracks.length,
      speechiness: topTracks.reduce((sum, t) => sum + t.audioFeatures.speechiness, 0) / topTracks.length,
      liveness: topTracks.reduce((sum, t) => sum + t.audioFeatures.liveness, 0) / topTracks.length,
    };

    return {
      artist: {
        id: artist.id,
        name: artist.name,
        popularity: artist.popularity,
        followers: { total: artist.followers.total },
        genres: artist.genres,
      },
      topTracks,
      avgFeatures,
    };
  }
}

export const spotifyService = new SpotifyService();
