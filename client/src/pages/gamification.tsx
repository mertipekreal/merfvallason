import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Trophy, Star, Target, Zap, Crown, Award, 
  TrendingUp, Users, Sparkles, Lock, Check,
  Moon, Eye
} from "lucide-react";

interface UserPoints {
  id: number;
  username: string;
  totalPoints: number;
  dreamCount: number;
  whitelistSlots: number;
  createdAt: string;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  pointsRequired: number;
  unlocked: boolean;
  unlockedAt?: string;
}

interface LeaderboardEntry {
  rank: number;
  username: string;
  totalPoints: number;
  dreamCount: number;
  whitelistSlots: number;
}

const achievementsList: Achievement[] = [
  { id: "first_dream", name: "İlk Adım", description: "İlk rüyanızı kaydedin", icon: "moon", pointsRequired: 10, unlocked: false },
  { id: "five_dreams", name: "Rüya Gezgini", description: "5 rüya kaydedin", icon: "eye", pointsRequired: 50, unlocked: false },
  { id: "ten_dreams", name: "Rüya Ustası", description: "10 rüya kaydedin", icon: "star", pointsRequired: 100, unlocked: false },
  { id: "twenty_five_dreams", name: "Rüya Kahramanı", description: "25 rüya kaydedin", icon: "trophy", pointsRequired: 250, unlocked: false },
  { id: "fifty_dreams", name: "Bilinçaltı Kaşifi", description: "50 rüya kaydedin", icon: "crown", pointsRequired: 500, unlocked: false },
  { id: "hundred_dreams", name: "Rüya Efsanesi", description: "100 rüya kaydedin", icon: "sparkles", pointsRequired: 1000, unlocked: false },
  { id: "first_nft", name: "NFT Koleksiyoncusu", description: "İlk NFT'inizi oluşturun", icon: "zap", pointsRequired: 0, unlocked: false },
  { id: "rare_dream", name: "Nadir Rüyacı", description: "80+ rarity skorlu rüya kaydedin", icon: "award", pointsRequired: 0, unlocked: false },
];

function getAchievementIcon(icon: string) {
  switch (icon) {
    case "moon": return <Moon className="w-5 h-5" />;
    case "eye": return <Eye className="w-5 h-5" />;
    case "star": return <Star className="w-5 h-5" />;
    case "trophy": return <Trophy className="w-5 h-5" />;
    case "crown": return <Crown className="w-5 h-5" />;
    case "sparkles": return <Sparkles className="w-5 h-5" />;
    case "zap": return <Zap className="w-5 h-5" />;
    case "award": return <Award className="w-5 h-5" />;
    default: return <Target className="w-5 h-5" />;
  }
}

function getRankBadge(rank: number) {
  if (rank === 1) return <Crown className="w-5 h-5 text-yellow-400" />;
  if (rank === 2) return <Trophy className="w-5 h-5 text-gray-300" />;
  if (rank === 3) return <Award className="w-5 h-5 text-amber-600" />;
  return <span className="text-muted-foreground font-medium">#{rank}</span>;
}

export default function GamificationPage() {
  const { data: leaderboardData, isLoading: loadingLeaderboard } = useQuery<{ success: boolean; leaderboard: LeaderboardEntry[] }>({
    queryKey: ["/api/gamification/leaderboard"],
  });

  const { data: stats } = useQuery<{ totalUsers: number; totalDreams: number; totalPoints: number }>({
    queryKey: ["/api/gamification/stats"],
  });

  const leaderboard = leaderboardData?.leaderboard || [];

  const currentUser: UserPoints = {
    id: 1,
    username: "Rüyacı",
    totalPoints: 0,
    dreamCount: 0,
    whitelistSlots: 0,
    createdAt: new Date().toISOString(),
  };

  const userPointsFromLeaderboard = leaderboard.find(u => u.username === "Rüyacı") || currentUser;
  const userAchievements = achievementsList.map(a => ({
    ...a,
    unlocked: a.pointsRequired > 0 ? userPointsFromLeaderboard.totalPoints >= a.pointsRequired : false,
  }));

  const unlockedCount = userAchievements.filter(a => a.unlocked).length;
  const nextMilestone = achievementsList.find(a => !userAchievements.find(ua => ua.id === a.id && ua.unlocked));
  const progressToNext = nextMilestone && nextMilestone.pointsRequired > 0 
    ? (userPointsFromLeaderboard.totalPoints / nextMilestone.pointsRequired) * 100 
    : 100;

  return (
    <div className="min-h-screen">
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">
            Gamifikasyon Merkezi
          </h1>
          <p className="text-muted-foreground">
            Rüya kaydetme yolculuğunuzda puan kazanın, rozetler açın ve liderlik tablosunda yerinizi alın
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-primary/20 to-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary/20">
                  <Star className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Toplam Puanınız</p>
                  <p className="text-2xl font-bold" data-testid="text-user-points">
                    {userPointsFromLeaderboard.totalPoints}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 border-cyan-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-cyan-500/20">
                  <Moon className="w-6 h-6 text-cyan-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Rüya Sayınız</p>
                  <p className="text-2xl font-bold" data-testid="text-dream-count">
                    {userPointsFromLeaderboard.dreamCount}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/20 to-purple-500/5 border-purple-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-purple-500/20">
                  <Sparkles className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Whitelist Slotları</p>
                  <p className="text-2xl font-bold" data-testid="text-whitelist-slots">
                    {userPointsFromLeaderboard.whitelistSlots}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {nextMilestone && (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-primary" />
                    <span className="font-medium">Sonraki Hedef: {nextMilestone.name}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {userPointsFromLeaderboard.totalPoints} / {nextMilestone.pointsRequired} puan
                  </span>
                </div>
                <Progress value={Math.min(progressToNext, 100)} className="h-2" />
                <p className="text-sm text-muted-foreground">{nextMilestone.description}</p>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="leaderboard" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="leaderboard" data-testid="tab-leaderboard">
              <Users className="w-4 h-4 mr-2" />
              Liderlik Tablosu
            </TabsTrigger>
            <TabsTrigger value="achievements" data-testid="tab-achievements">
              <Trophy className="w-4 h-4 mr-2" />
              Rozetler ({unlockedCount}/{achievementsList.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="leaderboard">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Top Rüyacılar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  {loadingLeaderboard ? (
                    <div className="flex items-center justify-center h-40">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                    </div>
                  ) : leaderboard && leaderboard.length > 0 ? (
                    <div className="space-y-2">
                      {leaderboard.map((entry, index) => (
                        <div
                          key={entry.username}
                          className={`flex items-center justify-between p-4 rounded-lg transition-colors ${
                            index === 0 ? 'bg-yellow-500/10 border border-yellow-500/20' :
                            index === 1 ? 'bg-gray-400/10 border border-gray-400/20' :
                            index === 2 ? 'bg-amber-600/10 border border-amber-600/20' :
                            'bg-muted/50 hover-elevate'
                          }`}
                          data-testid={`row-leaderboard-${index}`}
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-8 flex justify-center">
                              {getRankBadge(entry.rank)}
                            </div>
                            <div>
                              <p className="font-medium">{entry.username}</p>
                              <p className="text-sm text-muted-foreground">
                                {entry.dreamCount} rüya
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-primary">{entry.totalPoints} puan</p>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Sparkles className="w-3 h-3" />
                              {entry.whitelistSlots} slot
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                      <Users className="w-12 h-12 mb-2 opacity-50" />
                      <p>Henüz kimse liderlik tablosuna girmedi</p>
                      <p className="text-sm">İlk rüyanızı kaydederek başlayın!</p>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="achievements">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-primary" />
                  Kazanılabilir Rozetler
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {userAchievements.map((achievement) => (
                    <div
                      key={achievement.id}
                      className={`relative p-4 rounded-lg border transition-all ${
                        achievement.unlocked
                          ? 'bg-primary/10 border-primary/30'
                          : 'bg-muted/30 border-border opacity-60'
                      }`}
                      data-testid={`card-achievement-${achievement.id}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-full ${
                          achievement.unlocked ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                        }`}>
                          {getAchievementIcon(achievement.icon)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{achievement.name}</h4>
                            {achievement.unlocked ? (
                              <Check className="w-4 h-4 text-green-500" />
                            ) : (
                              <Lock className="w-4 h-4 text-muted-foreground" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {achievement.description}
                          </p>
                          {achievement.pointsRequired > 0 && (
                            <Badge variant="secondary" className="mt-2">
                              {achievement.pointsRequired} puan gerekli
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {stats && (
          <Card>
            <CardHeader>
              <CardTitle>Platform İstatistikleri</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-primary" data-testid="text-total-users">
                    {stats.totalUsers}
                  </p>
                  <p className="text-sm text-muted-foreground">Toplam Rüyacı</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-cyan-400" data-testid="text-total-dreams">
                    {stats.totalDreams}
                  </p>
                  <p className="text-sm text-muted-foreground">Toplam Rüya</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-400" data-testid="text-total-points">
                    {stats.totalPoints}
                  </p>
                  <p className="text-sm text-muted-foreground">Toplam Puan</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
