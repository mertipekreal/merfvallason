import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Sparkles, Image, Wand2, Loader2, Check, AlertCircle, AlertTriangle,
  Eye, Star, Clock, Palette, Moon, Zap, Crown, Flame,
  Brain, Orbit, Diamond, Atom
} from "lucide-react";

interface Dream {
  id: string;
  title: string;
  description: string;
  emotion: string;
  createdAt: string;
  userId?: string;
  intensity?: number;
}

interface NFTAsset {
  id: string;
  dreamId: string;
  userId?: string;
  title: string;
  description?: string;
  imageUrl?: string;
  rarityScore: number;
  status: 'pending' | 'generating' | 'ready' | 'minted';
  metadata?: Record<string, unknown>;
  createdAt: string;
  mintedAt?: string;
}

interface GenesisNFT {
  id: string;
  dreamId: string;
  imageUrl?: string;
  rarityScore: number;
  status: 'pending' | 'generating' | 'ready' | 'minted' | 'failed';
  metadata?: {
    name?: string;
    description?: string;
    rarityTier?: string;
    elementalAffinity?: string;
    cosmicSignature?: string;
    kaderAttributes?: {
      consciousnessLevel?: string;
      consciousnessScore?: number;
      synchronicityType?: string;
      synchronicityScore?: number;
      fateTrajectory?: string;
      fateScore?: number;
      prophetic?: boolean;
      butterflyEffects?: string[];
    };
    archetypeAttributes?: {
      primaryArchetype?: string;
      secondaryArchetypes?: string[];
      narrativePattern?: string;
      psychologicalInsight?: string;
      symbols?: Array<{ symbol: string; meaning: string }>;
    };
    attributes?: Array<{
      trait_type: string;
      value: string | number;
      display_type?: string;
    }>;
  };
  createdAt: string;
}

// Helper to get display values from Genesis NFT metadata
function getGenesisDisplayValues(nft: GenesisNFT) {
  const meta = nft.metadata;
  return {
    title: meta?.name || 'Genesis NFT',
    consciousness: meta?.kaderAttributes?.consciousnessLevel || 'NPC',
    synchronicity: meta?.kaderAttributes?.synchronicityType || 'NONE',
    archetype: meta?.archetypeAttributes?.primaryArchetype || '',
    element: meta?.elementalAffinity || '',
    cosmicSignature: meta?.cosmicSignature || '',
    kaderScore: meta?.kaderAttributes?.fateScore || 0,
  };
}

interface NFTStats {
  totalNFTs: number;
  avgRarityScore: number;
  byStatus: Record<string, number>;
  byConsciousness: Record<string, number>;
  topArchetypes: string[];
}

function getRarityBadge(score: number) {
  if (score >= 90) return { label: "Efsanevi", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", icon: Crown };
  if (score >= 75) return { label: "Epik", color: "bg-purple-500/20 text-purple-400 border-purple-500/30", icon: Diamond };
  if (score >= 50) return { label: "Nadir", color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30", icon: Star };
  if (score >= 25) return { label: "Olağan", color: "bg-green-500/20 text-green-400 border-green-500/30", icon: Sparkles };
  return { label: "Yaygın", color: "bg-gray-500/20 text-gray-400 border-gray-500/30", icon: Atom };
}

function getConsciousnessInfo(level: string) {
  const levels: Record<string, { label: string; color: string; icon: typeof Brain }> = {
    NPC: { label: "NPC", color: "text-gray-400", icon: Atom },
    AWAKENING: { label: "Uyanış", color: "text-blue-400", icon: Eye },
    PLAYER: { label: "Oyuncu", color: "text-green-400", icon: Sparkles },
    ARCHITECT: { label: "Mimar", color: "text-purple-400", icon: Brain },
    ASCENDED: { label: "Yükselmiş", color: "text-yellow-400", icon: Crown },
  };
  return levels[level] || levels.NPC;
}

function getStatusInfo(status: string | undefined) {
  switch (status) {
    case 'pending': return { label: "Beklemede", color: "text-muted-foreground", icon: Clock };
    case 'generating': return { label: "Üretiliyor", color: "text-yellow-400", icon: Loader2 };
    case 'ready': return { label: "Hazır", color: "text-green-400", icon: Check };
    case 'minted': return { label: "Mintlendi", color: "text-primary", icon: Sparkles };
    case 'failed': return { label: "Hata", color: "text-red-400", icon: AlertTriangle };
    default: return { label: "Beklemede", color: "text-muted-foreground", icon: Clock };
  }
}

function DreamCard({ dream, onCreateNFT, onCreateGenesis, isCreating, isCreatingGenesis }: { 
  dream: Dream; 
  onCreateNFT: (dreamId: string) => void;
  onCreateGenesis: (dreamId: string) => void;
  isCreating: boolean;
  isCreatingGenesis: boolean;
}) {
  return (
    <Card className="hover-elevate transition-all">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base line-clamp-1">{dream.title}</CardTitle>
            <CardDescription className="line-clamp-2 mt-1">
              {(dream.description || '').substring(0, 100)}...
            </CardDescription>
          </div>
          <Badge variant="secondary" className="shrink-0">
            {dream.emotion}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">
            {new Date(dream.createdAt).toLocaleDateString('tr-TR')}
          </span>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => onCreateNFT(dream.id)}
              disabled={isCreating || isCreatingGenesis}
              data-testid={`button-create-nft-${dream.id}`}
            >
              {isCreating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Wand2 className="w-4 h-4 mr-2" />
              )}
              NFT
            </Button>
            <Button 
              size="sm" 
              onClick={() => onCreateGenesis(dream.id)}
              disabled={isCreating || isCreatingGenesis}
              data-testid={`button-create-genesis-${dream.id}`}
              className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700"
            >
              {isCreatingGenesis ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Orbit className="w-4 h-4 mr-2" />
              )}
              Genesis
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function NFTAssetCard({ asset, onGenerate, isGenerating }: { 
  asset: NFTAsset; 
  onGenerate: (assetId: string) => void;
  isGenerating: boolean;
}) {
  const rarity = getRarityBadge(asset.rarityScore);
  const status = getStatusInfo(asset.status);
  const StatusIcon = status.icon;

  return (
    <Card className="overflow-hidden">
      <div className="aspect-square relative bg-muted/50">
        {asset.imageUrl ? (
          <img 
            src={asset.imageUrl} 
            alt={asset.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center p-4">
              <Palette className="w-12 h-12 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">Görsel üretilmedi</p>
            </div>
          </div>
        )}
        <Badge className={`absolute top-2 right-2 ${rarity.color} border`}>
          {rarity.label}
        </Badge>
      </div>
      <CardContent className="p-4">
        <div className="space-y-3">
          <div>
            <h4 className="font-medium line-clamp-1">{asset.title}</h4>
            <div className={`flex items-center gap-1 text-sm ${status.color}`}>
              <StatusIcon className={`w-4 h-4 ${asset.status === 'generating' ? 'animate-spin' : ''}`} />
              <span>{status.label}</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">{asset.rarityScore}%</span>
            </div>
            
            {asset.status === 'pending' && (
              <Button 
                size="sm" 
                onClick={() => onGenerate(asset.id)}
                disabled={isGenerating}
                data-testid={`button-generate-art-${asset.id}`}
              >
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Image className="w-4 h-4 mr-2" />
                )}
                Sanat Üret
              </Button>
            )}
            
            {asset.status === 'ready' && (
              <Button size="sm" disabled className="opacity-50">
                <Zap className="w-4 h-4 mr-2" />
                Mint (Yakında)
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function GenesisNFTCard({ nft, onGenerateArt, isGenerating }: { nft: GenesisNFT; onGenerateArt: (id: string) => void; isGenerating: boolean }) {
  const displayValues = getGenesisDisplayValues(nft);
  const rarity = getRarityBadge(nft.rarityScore || 0);
  const status = getStatusInfo(nft.status || 'pending');
  const StatusIcon = status?.icon || Clock;
  const RarityIcon = rarity?.icon || Atom;
  
  const consciousnessInfo = getConsciousnessInfo(displayValues.consciousness);
  const ConsciousnessIcon = consciousnessInfo?.icon || Atom;

  return (
    <Card className="overflow-hidden bg-gradient-to-br from-card to-muted/30" data-testid={`card-genesis-nft-${nft.id}`}>
      <div className="aspect-square relative bg-gradient-to-br from-purple-900/20 to-cyan-900/20">
        {nft.imageUrl ? (
          <img 
            src={nft.imageUrl} 
            alt={displayValues.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center p-4">
              <Orbit className="w-12 h-12 mx-auto mb-2 text-primary/50 animate-pulse" />
              <p className="text-sm text-muted-foreground">Genesis Sanatı</p>
              {nft.status === 'generating' && (
                <p className="text-xs text-yellow-400 mt-1">Üretiliyor...</p>
              )}
              {nft.status === 'pending' && (
                <p className="text-xs text-muted-foreground mt-1">Sanat Bekliyor</p>
              )}
            </div>
          </div>
        )}
        <div className="absolute top-2 right-2 flex flex-col gap-1">
          <Badge className={`${rarity.color} border`}>
            <RarityIcon className="w-3 h-3 mr-1" />
            {rarity.label}
          </Badge>
          <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 border">
            <ConsciousnessIcon className="w-3 h-3 mr-1" />
            {consciousnessInfo.label}
          </Badge>
        </div>
      </div>
      <CardContent className="p-4">
        <div className="space-y-3">
          <div>
            <h4 className="font-medium line-clamp-1">{displayValues.title}</h4>
            <div className={`flex items-center gap-1 text-sm ${status?.color || 'text-muted-foreground'}`}>
              <StatusIcon className={`w-4 h-4 ${nft.status === 'generating' ? 'animate-spin' : ''}`} />
              <span>{status?.label || 'Beklemede'}</span>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-1">
            {displayValues.archetype && (
              <Badge variant="outline" className="text-xs">
                {displayValues.archetype}
              </Badge>
            )}
            {displayValues.element && (
              <Badge variant="outline" className="text-xs">
                {displayValues.element}
              </Badge>
            )}
            {displayValues.synchronicity && displayValues.synchronicity !== 'NONE' && (
              <Badge variant="outline" className="text-xs bg-cyan-500/10">
                {displayValues.synchronicity}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">{nft.rarityScore}%</span>
              </div>
              {displayValues.kaderScore > 0 && (
                <div className="flex items-center gap-1">
                  <Flame className="w-4 h-4 text-orange-400" />
                  <span className="text-sm font-medium">{displayValues.kaderScore.toFixed(1)}</span>
                </div>
              )}
            </div>
            
            {nft.status === 'pending' && (
              <Button 
                size="sm" 
                onClick={() => onGenerateArt(nft.id)}
                disabled={isGenerating}
                data-testid={`button-generate-genesis-art-${nft.id}`}
                className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700"
              >
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Image className="w-4 h-4 mr-2" />
                )}
                Sanat Üret
              </Button>
            )}
            
            {nft.status === 'ready' && (
              <Button size="sm" disabled className="opacity-50">
                <Zap className="w-4 h-4 mr-2" />
                Mint
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function NFTStudioPage() {
  const { toast } = useToast();
  const [creatingDreamId, setCreatingDreamId] = useState<string | null>(null);
  const [creatingGenesisDreamId, setCreatingGenesisDreamId] = useState<string | null>(null);
  const [generatingAssetId, setGeneratingAssetId] = useState<string | null>(null);

  const { data: dreamsData, isLoading: loadingDreams } = useQuery<{ success: boolean; dreams: Dream[] }>({
    queryKey: ["/api/dreams"],
  });

  const { data: nftAssetsData, isLoading: loadingAssets } = useQuery<{ success: boolean; assets: NFTAsset[] }>({
    queryKey: ["/api/nft/user/assets"],
  });

  const { data: genesisData, isLoading: loadingGenesis } = useQuery<{ success: boolean; assets: GenesisNFT[] }>({
    queryKey: ["/api/nft/genesis/list"],
  });

  const { data: statsData } = useQuery<{ success: boolean; stats: NFTStats }>({
    queryKey: ["/api/nft/genesis/stats"],
  });

  const dreams = dreamsData?.dreams || [];
  const nftAssets = nftAssetsData?.assets || [];
  const genesisNFTs = genesisData?.assets || [];
  const stats = statsData?.stats;

  const createNFTMutation = useMutation({
    mutationFn: async (dreamId: string) => {
      const response = await apiRequest("POST", "/api/nft/create", { dreamId });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "NFT Oluşturuldu",
        description: `${data.asset?.title || 'NFT'} başarıyla oluşturuldu. Şimdi sanat üretebilirsiniz.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/nft/user/assets"] });
      setCreatingDreamId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Hata",
        description: error.message || "NFT oluşturulamadı",
        variant: "destructive",
      });
      setCreatingDreamId(null);
    },
  });

  const createGenesisMutation = useMutation({
    mutationFn: async (dreamId: string) => {
      const response = await apiRequest("POST", "/api/nft/genesis/create", { 
        dreamId,
        config: { generateImage: true }
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Genesis NFT Oluşturuldu",
        description: `${data.asset?.title || 'Genesis NFT'} Kader Motoru entegrasyonuyla oluşturuldu!`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/nft/genesis/list"] });
      queryClient.invalidateQueries({ queryKey: ["/api/nft/genesis/stats"] });
      setCreatingGenesisDreamId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Hata",
        description: error.message || "Genesis NFT oluşturulamadı",
        variant: "destructive",
      });
      setCreatingGenesisDreamId(null);
    },
  });

  const generateArtMutation = useMutation({
    mutationFn: async (assetId: string) => {
      setGeneratingAssetId(assetId);
      const response = await apiRequest("POST", `/api/nft/generate/${assetId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sanat Üretildi",
        description: "AI görseliniz başarıyla oluşturuldu!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/nft/user/assets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/nft/genesis/list"] });
      queryClient.invalidateQueries({ queryKey: ["/api/nft/genesis/stats"] });
      setGeneratingAssetId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Hata",
        description: error.message || "Sanat üretilemedi",
        variant: "destructive",
      });
      setGeneratingAssetId(null);
    },
  });

  const handleCreateNFT = (dreamId: string) => {
    setCreatingDreamId(dreamId);
    createNFTMutation.mutate(dreamId);
  };

  const handleCreateGenesis = (dreamId: string) => {
    setCreatingGenesisDreamId(dreamId);
    createGenesisMutation.mutate(dreamId);
  };

  const handleGenerateArt = (assetId: string) => {
    setGeneratingAssetId(assetId);
    generateArtMutation.mutate(assetId);
  };

  const pendingAssets = nftAssets.filter(a => a.status === 'pending');
  const readyAssets = nftAssets.filter(a => a.status === 'ready' || a.status === 'minted');

  return (
    <div className="min-h-screen">
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">
            NFT Stüdyo
          </h1>
          <p className="text-muted-foreground">
            Rüyalarınızı AI sanatına dönüştürün ve NFT olarak kaydedin
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-primary/20 to-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary/20">
                  <Moon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Toplam Rüya</p>
                  <p className="text-2xl font-bold" data-testid="text-dream-count">
                    {dreams?.length || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 border-cyan-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-cyan-500/20">
                  <Image className="w-6 h-6 text-cyan-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">NFT Varlıkları</p>
                  <p className="text-2xl font-bold" data-testid="text-nft-count">
                    {nftAssets.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/20 to-purple-500/5 border-purple-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-purple-500/20">
                  <Orbit className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Genesis NFT</p>
                  <p className="text-2xl font-bold" data-testid="text-genesis-count">
                    {genesisNFTs.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-500/20 to-yellow-500/5 border-yellow-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-yellow-500/20">
                  <Star className="w-6 h-6 text-yellow-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ort. Nadirlik</p>
                  <p className="text-2xl font-bold" data-testid="text-avg-rarity">
                    {stats?.avgRarityScore?.toFixed(1) || '0'}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="genesis" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="genesis" data-testid="tab-genesis" className="gap-2">
              <Orbit className="w-4 h-4" />
              Genesis ({genesisNFTs.length})
            </TabsTrigger>
            <TabsTrigger value="dreams" data-testid="tab-dreams" className="gap-2">
              <Moon className="w-4 h-4" />
              Rüyalar ({dreams?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="pending" data-testid="tab-pending" className="gap-2">
              <Clock className="w-4 h-4" />
              Bekleyen ({pendingAssets.length})
            </TabsTrigger>
            <TabsTrigger value="ready" data-testid="tab-ready" className="gap-2">
              <Check className="w-4 h-4" />
              Hazır ({readyAssets.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="genesis">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Orbit className="w-5 h-5 text-purple-400" />
                  Genesis NFT Koleksiyonu
                </CardTitle>
                <CardDescription>
                  Kader Motoru + Rüya Analizi + Runway AI ile oluşturulan benzersiz NFT'ler
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingGenesis ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => (
                      <Card key={i}>
                        <Skeleton className="aspect-square" />
                        <CardContent className="p-4">
                          <Skeleton className="h-4 w-3/4 mb-2" />
                          <Skeleton className="h-3 w-1/2" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : genesisNFTs.length > 0 ? (
                  <ScrollArea className="h-[600px]">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pr-4">
                      {genesisNFTs.map(nft => (
                        <GenesisNFTCard 
                          key={nft.id} 
                          nft={nft} 
                          onGenerateArt={(id) => generateArtMutation.mutate(id)}
                          isGenerating={generatingAssetId === nft.id}
                        />
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="flex flex-col items-center justify-center h-60 text-muted-foreground">
                    <Orbit className="w-16 h-16 mb-4 opacity-50" />
                    <h3 className="text-lg font-medium mb-2">Henüz Genesis NFT yok</h3>
                    <p className="text-sm text-center max-w-md mb-4">
                      Genesis NFT'ler, Kader Motoru bilinç seviyeleri, Jung arketipleri ve 
                      kozmik senkronisite ile zenginleştirilmiş özel NFT'lerdir.
                    </p>
                    <Button 
                      variant="outline" 
                      onClick={() => document.querySelector('[data-testid="tab-dreams"]')?.dispatchEvent(new MouseEvent('click'))}
                    >
                      <Moon className="w-4 h-4 mr-2" />
                      Rüya Seç ve Başla
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="dreams">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Moon className="w-5 h-5 text-primary" />
                  Rüyalarınız
                </CardTitle>
                <CardDescription>
                  NFT'ye dönüştürmek istediğiniz rüyayı seçin - Genesis veya Standart
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingDreams ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => (
                      <Card key={i}>
                        <CardContent className="p-4">
                          <Skeleton className="h-4 w-3/4 mb-2" />
                          <Skeleton className="h-3 w-full mb-1" />
                          <Skeleton className="h-3 w-2/3" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : dreams && dreams.length > 0 ? (
                  <ScrollArea className="h-[500px]">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pr-4">
                      {dreams.map(dream => (
                        <DreamCard
                          key={dream.id}
                          dream={dream}
                          onCreateNFT={handleCreateNFT}
                          onCreateGenesis={handleCreateGenesis}
                          isCreating={creatingDreamId === dream.id}
                          isCreatingGenesis={creatingGenesisDreamId === dream.id}
                        />
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                    <Moon className="w-12 h-12 mb-2 opacity-50" />
                    <p>Henüz rüya kaydınız yok</p>
                    <p className="text-sm">Rüya Analizi sayfasından ilk rüyanızı ekleyin</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pending">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-yellow-400" />
                  Bekleyen NFT'ler
                </CardTitle>
                <CardDescription>
                  AI sanat üretimi için bekleyen NFT varlıkları
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingAssets ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => (
                      <Card key={i}>
                        <Skeleton className="aspect-square" />
                        <CardContent className="p-4">
                          <Skeleton className="h-4 w-3/4 mb-2" />
                          <Skeleton className="h-3 w-1/2" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : pendingAssets.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {pendingAssets.map(asset => (
                      <NFTAssetCard
                        key={asset.id}
                        asset={asset}
                        onGenerate={handleGenerateArt}
                        isGenerating={generatingAssetId === asset.id}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                    <Wand2 className="w-12 h-12 mb-2 opacity-50" />
                    <p>Bekleyen NFT yok</p>
                    <p className="text-sm">Rüyalarınızdan NFT oluşturarak başlayın</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ready">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-green-400" />
                  Hazır NFT'ler
                </CardTitle>
                <CardDescription>
                  Mintlenmeye hazır veya mintlenmiş NFT sanat eserleri
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingAssets ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => (
                      <Card key={i}>
                        <Skeleton className="aspect-square" />
                        <CardContent className="p-4">
                          <Skeleton className="h-4 w-3/4 mb-2" />
                          <Skeleton className="h-3 w-1/2" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : readyAssets.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {readyAssets.map(asset => (
                      <NFTAssetCard
                        key={asset.id}
                        asset={asset}
                        onGenerate={handleGenerateArt}
                        isGenerating={false}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                    <Image className="w-12 h-12 mb-2 opacity-50" />
                    <p>Hazır NFT yok</p>
                    <p className="text-sm">Bekleyen NFT'leriniz için sanat üretin</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Card className="bg-gradient-to-br from-purple-900/20 to-cyan-900/20 border-purple-500/20">
          <CardContent className="py-8">
            <div className="text-center space-y-4">
              <div className="flex justify-center gap-4">
                <div className="p-4 rounded-full bg-purple-500/20">
                  <Brain className="w-8 h-8 text-purple-400" />
                </div>
                <div className="p-4 rounded-full bg-primary/20">
                  <Moon className="w-8 h-8 text-primary" />
                </div>
                <div className="p-4 rounded-full bg-cyan-500/20">
                  <Orbit className="w-8 h-8 text-cyan-400" />
                </div>
                <div className="p-4 rounded-full bg-yellow-500/20">
                  <Sparkles className="w-8 h-8 text-yellow-400" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold">Genesis NFT Akışı</h3>
                <p className="text-muted-foreground max-w-lg mx-auto">
                  1. Rüyanızı seçin ve Genesis NFT oluşturun
                  <br />
                  2. Kader Motoru bilinç seviyesi ve arketip analizi
                  <br />
                  3. Runway AI ile benzersiz sanat eseri üretimi
                  <br />
                  4. Polygon ağında mintleme (yakında)
                </p>
              </div>
              <div className="flex justify-center gap-4 flex-wrap">
                <Badge variant="outline" className="bg-purple-500/10">
                  NPC → Yükselmiş Bilinç
                </Badge>
                <Badge variant="outline" className="bg-cyan-500/10">
                  Jung Arketipleri
                </Badge>
                <Badge variant="outline" className="bg-primary/10">
                  Kozmik Senkronisite
                </Badge>
                <Badge variant="outline" className="bg-yellow-500/10">
                  Elementel Afinite
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
