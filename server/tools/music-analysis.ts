import { ToolDefinition, ToolCallResult } from "./index";
import { spotifyService } from "../domains/core/services/spotify-service";
import { 
  buildTrackFeatures, 
  computeTrendScore, 
  computeEmotionScore,
  computeExamplePlaylistFits,
  buildPlaylistProfile,
  computePlaylistFitScore,
  buildArtistSoundProfile
} from "../domains/core/services/spotify-scoring";
import {
  getTikTokTimeSeries,
  getSpotifyTimeSeries,
  computeBridgeStrength
} from "../domains/core/services/tiktok-bridge";

export const musicAnalysisTools: ToolDefinition[] = [
  {
    name: "analyze_track",
    description: "Spotify şarkısını analiz eder. Enerji, dans edilebilirlik, trend skoru, duygu analizi ve playlist uyumluluğu bilgilerini döner.",
    parameters: {
      type: "object",
      properties: {
        trackInput: {
          type: "string",
          description: "Spotify şarkı linki veya ID'si (örn: spotify:track:xxx veya https://open.spotify.com/track/xxx)"
        }
      },
      required: ["trackInput"]
    }
  },
  {
    name: "check_playlist_fit",
    description: "Bir şarkının belirli bir playlist'e uyumunu kontrol eder. Enerji, valence, danceability ve tempo uyumunu analiz eder.",
    parameters: {
      type: "object",
      properties: {
        trackInput: {
          type: "string",
          description: "Spotify şarkı linki veya ID'si"
        },
        playlistInput: {
          type: "string",
          description: "Spotify playlist linki veya ID'si"
        }
      },
      required: ["trackInput", "playlistInput"]
    }
  },
  {
    name: "get_artist_playlists",
    description: "Bir sanatçı için algoritmik playlist önerileri oluşturur. Sanatçının ses profilini analiz ederek uygun playlist konseptleri önerir.",
    parameters: {
      type: "object",
      properties: {
        artistInput: {
          type: "string",
          description: "Spotify sanatçı linki, ID'si veya ismi"
        }
      },
      required: ["artistInput"]
    }
  },
  {
    name: "search_spotify_track",
    description: "Spotify'da şarkı arar. Şarkı ismi, sanatçı veya her ikisiyle arama yapabilir.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Arama sorgusu (şarkı ismi, sanatçı veya her ikisi)"
        },
        limit: {
          type: "number",
          description: "Maksimum sonuç sayısı (varsayılan: 5)"
        }
      },
      required: ["query"]
    }
  },
  {
    name: "search_spotify_artist",
    description: "Spotify'da sanatçı arar.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Sanatçı ismi"
        },
        limit: {
          type: "number",
          description: "Maksimum sonuç sayısı (varsayılan: 5)"
        }
      },
      required: ["query"]
    }
  },
  {
    name: "tiktok_spotify_bridge",
    description: "TikTok ses ve Spotify şarkısı arasındaki köprüyü analiz eder. Viral potansiyel, korelasyon ve trend tahminleri sunar.",
    parameters: {
      type: "object",
      properties: {
        soundId: {
          type: "string",
          description: "TikTok ses ID'si"
        },
        trackInput: {
          type: "string",
          description: "Spotify şarkı linki veya ID'si"
        }
      },
      required: ["soundId", "trackInput"]
    }
  }
];

export async function executeMusicAnalysisTool(
  toolName: string,
  args: Record<string, any>
): Promise<ToolCallResult> {
  try {
    switch (toolName) {
      case "analyze_track": {
        const { trackInput } = args;
        
        const trackId = spotifyService.extractTrackId(trackInput);
        if (!trackId) {
          return { success: false, message: "Geçersiz Spotify şarkı ID veya linki" };
        }

        const trackData = await spotifyService.getTrackData(trackId);
        const features = buildTrackFeatures(trackData);
        const trendScore = computeTrendScore(features);
        const emotionScore = computeEmotionScore(features);
        const playlistFits = computeExamplePlaylistFits(features);

        return {
          success: true,
          data: {
            track: {
              id: trackData.metadata.id,
              name: trackData.metadata.name,
              artist: trackData.metadata.artists[0].name,
              album: trackData.metadata.album.name,
              releaseDate: trackData.metadata.album.release_date,
              popularity: trackData.metadata.popularity,
              duration: Math.round(trackData.audioFeatures.duration_ms / 1000),
              spotifyUrl: trackData.metadata.external_urls.spotify,
              albumArt: trackData.metadata.album.images[0]?.url,
            },
            features: {
              energy: features.energy,
              valence: features.valence,
              danceability: features.danceability,
              tempo: features.tempo,
              acousticness: features.acousticness
            },
            trendScore,
            emotionScore,
            playlistFits: playlistFits.slice(0, 3),
            artistInfo: {
              name: trackData.artist.name,
              followers: trackData.artist.followers.total,
              popularity: trackData.artist.popularity,
              genres: trackData.artist.genres.slice(0, 5),
            },
          },
          message: `"${trackData.metadata.name}" - ${trackData.metadata.artists[0].name} | Trend Skoru: ${trendScore.score}/100 (${trendScore.label}) | Duygu: ${emotionScore.mood}`
        };
      }

      case "check_playlist_fit": {
        const { trackInput, playlistInput } = args;
        
        const trackId = spotifyService.extractTrackId(trackInput);
        const playlistId = spotifyService.extractPlaylistId(playlistInput);
        
        if (!trackId) {
          return { success: false, message: "Geçersiz şarkı ID veya linki" };
        }
        if (!playlistId) {
          return { success: false, message: "Geçersiz playlist ID veya linki" };
        }

        const trackData = await spotifyService.getTrackData(trackId);
        const playlistData = await spotifyService.getPlaylistData(playlistId);
        
        const trackFeatures = buildTrackFeatures(trackData);
        const playlistProfile = buildPlaylistProfile(playlistData);
        const fitResult = computePlaylistFitScore(trackFeatures, playlistProfile);

        return {
          success: true,
          data: {
            track: {
              name: trackData.metadata.name,
              artist: trackData.metadata.artists[0].name,
            },
            playlist: {
              name: playlistData.metadata.name,
              owner: playlistData.metadata.owner.display_name,
              trackCount: playlistData.metadata.tracks.total,
            },
            fit: fitResult,
          },
          message: `"${trackData.metadata.name}" → "${playlistData.metadata.name}" | Uyum: ${fitResult.score}/100 (${fitResult.label})`
        };
      }

      case "get_artist_playlists": {
        const { artistInput } = args;
        
        let artistId = spotifyService.extractArtistId(artistInput);
        
        if (!artistId) {
          const searchResults = await spotifyService.searchArtist(artistInput, 1);
          if (searchResults.length === 0) {
            return { success: false, message: "Sanatçı bulunamadı" };
          }
          artistId = searchResults[0].id;
        }

        const artistData = await spotifyService.getArtistData(artistId);
        const soundProfile = buildArtistSoundProfile(artistData.avgFeatures, artistData.artist.genres);

        return {
          success: true,
          data: {
            artist: {
              id: artistData.artist.id,
              name: artistData.artist.name,
              followers: artistData.artist.followers.total,
              popularity: artistData.artist.popularity,
              genres: artistData.artist.genres,
            },
            soundProfile,
            topTracks: artistData.topTracks.slice(0, 5).map(t => ({
              name: t.metadata.name,
              popularity: t.metadata.popularity
            })),
          },
          message: `${artistData.artist.name} için playlist profili oluşturuldu. Tür: ${artistData.artist.genres.slice(0, 3).join(", ")} | Takipçi: ${(artistData.artist.followers.total / 1000000).toFixed(1)}M`
        };
      }

      case "search_spotify_track": {
        const { query, limit = 5 } = args;
        
        const tracks = await spotifyService.searchTrack(query, limit);
        
        return {
          success: true,
          data: {
            tracks: tracks.map(t => ({
              id: t.id,
              name: t.name,
              artist: t.artists[0]?.name,
              album: t.album.name,
              popularity: t.popularity,
              spotifyUrl: t.external_urls.spotify
            })),
            total: tracks.length
          },
          message: `"${query}" için ${tracks.length} şarkı bulundu: ${tracks.slice(0, 3).map(t => `${t.name} - ${t.artists[0]?.name}`).join(", ")}`
        };
      }

      case "search_spotify_artist": {
        const { query, limit = 5 } = args;
        
        const artists = await spotifyService.searchArtist(query, limit);
        
        return {
          success: true,
          data: {
            artists: artists.map(a => ({
              id: a.id,
              name: a.name,
              popularity: a.popularity,
              followers: a.followers.total,
              genres: a.genres.slice(0, 3)
            })),
            total: artists.length
          },
          message: `"${query}" için ${artists.length} sanatçı bulundu: ${artists.slice(0, 3).map(a => a.name).join(", ")}`
        };
      }

      case "tiktok_spotify_bridge": {
        const { soundId, trackInput } = args;
        
        const trackId = spotifyService.extractTrackId(trackInput);
        if (!trackId) {
          return { success: false, message: "Geçersiz Spotify şarkı ID veya linki" };
        }

        const trackData = await spotifyService.getTrackData(trackId);
        const tiktokSeries = getTikTokTimeSeries(soundId);
        const spotifySeries = getSpotifyTimeSeries(trackId);
        const bridgeAnalysis = computeBridgeStrength(tiktokSeries, spotifySeries);

        return {
          success: true,
          data: {
            track: {
              id: trackData.metadata.id,
              name: trackData.metadata.name,
              artist: trackData.metadata.artists[0].name,
              albumArt: trackData.metadata.album.images[0]?.url,
            },
            soundId,
            tiktokStats: {
              totalViews: tiktokSeries.totalViews,
              peakDate: tiktokSeries.peakDate,
              peakViews: tiktokSeries.peakViews,
            },
            spotifyStats: {
              totalStreams: spotifySeries.totalStreams,
              peakDate: spotifySeries.peakDate,
              peakStreams: spotifySeries.peakStreams,
            },
            bridgeAnalysis,
          },
          message: `TikTok-Spotify Köprü Analizi: "${trackData.metadata.name}" | Korelasyon: ${(bridgeAnalysis.correlation * 100).toFixed(0)}% | Köprü Gücü: ${bridgeAnalysis.bridgeStrength}/100 | ${bridgeAnalysis.verdict}`
        };
      }

      default:
        return { success: false, message: `Bilinmeyen araç: ${toolName}` };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Müzik analizi hatası";
    return { success: false, message };
  }
}
