import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, 
  Music, 
  Star, 
  Heart, 
  Plus, 
  Trash2, 
  RefreshCw,
  Calendar,
  Clock,
  Play,
  Settings,
  FolderPlus,
  UserPlus,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle
} from "lucide-react";
import { SiTiktok, SiInstagram } from "react-icons/si";

interface VistaProfile {
  id: string;
  groupId: string;
  vistaProfileId: string;
  platform: string;
  username: string;
  displayName: string | null;
  profileUrl: string | null;
  followerCount: number;
  followingCount: number;
  postCount: number;
  isVerified: number;
  bio: string | null;
  profileImageUrl: string | null;
  entityId: string | null;
  lastSyncedAt: string | null;
  syncStatus: string;
  syncError: string | null;
  isActive: number;
  createdAt: string;
}

interface VistaGroup {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string | null;
  iconName: string | null;
  targetArtist: string | null;
  totalProfiles: number;
  isActive: number;
  createdAt: string;
  profiles: VistaProfile[];
}

interface SyncSchedule {
  id: string;
  name: string;
  scheduleType: string;
  dayOfWeek: number | null;
  hourOfDay: number | null;
  targetType: string;
  targetId: string | null;
  isActive: number;
  lastRunAt: string | null;
  nextRunAt: string | null;
  runCount: number;
  lastStatus: string | null;
  lastError: string | null;
}

const iconMap: Record<string, typeof Users> = {
  Users,
  Music,
  Star,
  Heart,
};

const dayNames = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];

export default function VistaAccountsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("groups");
  const [addProfileDialogOpen, setAddProfileDialogOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [newProfileData, setNewProfileData] = useState({
    vistaProfileId: "",
    platform: "tiktok",
    username: "",
    displayName: "",
    profileUrl: "",
  });

  const [addScheduleDialogOpen, setAddScheduleDialogOpen] = useState(false);
  const [newScheduleData, setNewScheduleData] = useState({
    name: "",
    scheduleType: "weekly",
    dayOfWeek: 1,
    hourOfDay: 3,
    targetType: "all",
    targetId: "",
  });

  const { data: groups = [], isLoading: groupsLoading } = useQuery<VistaGroup[]>({
    queryKey: ["/api/vista/groups"],
  });

  const { data: schedules = [], isLoading: schedulesLoading } = useQuery<SyncSchedule[]>({
    queryKey: ["/api/behavior/schedules"],
  });

  const seedGroupsMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/vista/seed-groups"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vista/groups"] });
      toast({ title: "Varsayılan gruplar oluşturuldu" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Gruplar oluşturulamadı", variant: "destructive" });
    },
  });

  const addProfileMutation = useMutation({
    mutationFn: (data: { groupId: string; profile: typeof newProfileData }) =>
      apiRequest("POST", `/api/vista/groups/${data.groupId}/profiles`, data.profile),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vista/groups"] });
      setAddProfileDialogOpen(false);
      setNewProfileData({ vistaProfileId: "", platform: "tiktok", username: "", displayName: "", profileUrl: "" });
      toast({ title: "Profil eklendi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Profil eklenemedi", variant: "destructive" });
    },
  });

  const deleteProfileMutation = useMutation({
    mutationFn: (profileId: string) =>
      apiRequest("DELETE", `/api/vista/profiles/${profileId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vista/groups"] });
      toast({ title: "Profil silindi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Profil silinemedi", variant: "destructive" });
    },
  });

  const syncGroupMutation = useMutation({
    mutationFn: (groupId: string) =>
      apiRequest("POST", `/api/vista/groups/${groupId}/sync`),
    onSuccess: async (response: Response) => {
      const data = await response.json();
      queryClient.invalidateQueries({ queryKey: ["/api/vista/groups"] });
      toast({ title: "Senkronizasyon tamamlandı", description: `${data.synced} profil senkronize edildi` });
    },
    onError: () => {
      toast({ title: "Hata", description: "Senkronizasyon başarısız", variant: "destructive" });
    },
  });

  const createScheduleMutation = useMutation({
    mutationFn: (data: typeof newScheduleData) =>
      apiRequest("POST", "/api/behavior/schedules", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/behavior/schedules"] });
      setAddScheduleDialogOpen(false);
      setNewScheduleData({ name: "", scheduleType: "weekly", dayOfWeek: 1, hourOfDay: 3, targetType: "all", targetId: "" });
      toast({ title: "Zamanlama oluşturuldu" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Zamanlama oluşturulamadı", variant: "destructive" });
    },
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: (scheduleId: string) =>
      apiRequest("DELETE", `/api/behavior/schedules/${scheduleId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/behavior/schedules"] });
      toast({ title: "Zamanlama silindi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Zamanlama silinemedi", variant: "destructive" });
    },
  });

  const runSchedulesMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/behavior/schedules/run"),
    onSuccess: async (response: Response) => {
      const data = await response.json();
      queryClient.invalidateQueries({ queryKey: ["/api/behavior/schedules"] });
      toast({ title: "Zamanlamalar çalıştırıldı", description: `${data.executed} zamanlama tamamlandı` });
    },
    onError: () => {
      toast({ title: "Hata", description: "Zamanlamalar çalıştırılamadı", variant: "destructive" });
    },
  });

  const handleAddProfile = () => {
    if (!selectedGroupId) return;
    addProfileMutation.mutate({ groupId: selectedGroupId, profile: newProfileData });
  };

  const getGroupIcon = (iconName: string | null) => {
    const Icon = iconMap[iconName || "Users"] || Users;
    return Icon;
  };

  const getSyncStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "syncing":
        return <Loader2 className="h-4 w-4 text-primary animate-spin" />;
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const totalProfiles = groups.reduce((sum, g) => sum + g.profiles.length, 0);

  return (
    <div className="container mx-auto py-6 space-y-6" data-testid="vista-accounts-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Vista Social Hesapları</h1>
          <p className="text-muted-foreground">Fan sayfalarınızı yönetin ve senkronize edin</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-lg px-4 py-2">
            {groups.length} Grup
          </Badge>
          <Badge variant="outline" className="text-lg px-4 py-2">
            {totalProfiles} Profil
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="groups" data-testid="tab-groups">
            <Users className="h-4 w-4 mr-2" />
            Hesap Grupları
          </TabsTrigger>
          <TabsTrigger value="schedules" data-testid="tab-schedules">
            <Calendar className="h-4 w-4 mr-2" />
            Zamanlamalar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="groups" className="space-y-4">
          {groupsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : groups.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FolderPlus className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">Henüz grup yok</h3>
                <p className="text-muted-foreground mb-4">Varsayılan grupları oluşturmak için butona tıklayın</p>
                <Button onClick={() => seedGroupsMutation.mutate()} disabled={seedGroupsMutation.isPending}>
                  {seedGroupsMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Varsayılan Grupları Oluştur
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {groups.map((group) => {
                const GroupIcon = getGroupIcon(group.iconName);
                return (
                  <Card key={group.id} className="overflow-hidden" data-testid={`card-group-${group.slug}`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div 
                            className="p-2 rounded-lg" 
                            style={{ backgroundColor: group.color ? `${group.color}20` : undefined }}
                          >
                            <GroupIcon className="h-5 w-5" style={{ color: group.color || undefined }} />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{group.name}</CardTitle>
                            <CardDescription>{group.description}</CardDescription>
                          </div>
                        </div>
                        <Badge variant="secondary">{group.profiles.length} profil</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {group.targetArtist && (
                        <div className="text-sm text-muted-foreground">
                          Hedef Sanatçı: <span className="font-medium text-foreground">{group.targetArtist}</span>
                        </div>
                      )}
                      
                      {group.profiles.length > 0 && (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {group.profiles.map((profile) => (
                            <div 
                              key={profile.id} 
                              className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                              data-testid={`profile-${profile.username}`}
                            >
                              <div className="flex items-center gap-2">
                                {profile.platform === "tiktok" ? (
                                  <SiTiktok className="h-4 w-4" />
                                ) : (
                                  <SiInstagram className="h-4 w-4" />
                                )}
                                <span className="font-medium">@{profile.username}</span>
                                {profile.isVerified === 1 && (
                                  <Badge variant="secondary" className="text-xs">Doğrulanmış</Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {getSyncStatusIcon(profile.syncStatus)}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => deleteProfileMutation.mutate(profile.id)}
                                  disabled={deleteProfileMutation.isPending}
                                  data-testid={`button-delete-profile-${profile.username}`}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedGroupId(group.id);
                            setAddProfileDialogOpen(true);
                          }}
                          data-testid={`button-add-profile-${group.slug}`}
                        >
                          <UserPlus className="h-4 w-4 mr-2" />
                          Profil Ekle
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => syncGroupMutation.mutate(group.id)}
                          disabled={syncGroupMutation.isPending}
                          data-testid={`button-sync-${group.slug}`}
                        >
                          {syncGroupMutation.isPending ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4 mr-2" />
                          )}
                          Senkronize Et
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="schedules" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Otomatik Senkronizasyon Zamanlamaları</h2>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => runSchedulesMutation.mutate()}
                disabled={runSchedulesMutation.isPending}
                data-testid="button-run-schedules"
              >
                {runSchedulesMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                Şimdi Çalıştır
              </Button>
              <Dialog open={addScheduleDialogOpen} onOpenChange={setAddScheduleDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-schedule">
                    <Plus className="h-4 w-4 mr-2" />
                    Yeni Zamanlama
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Yeni Zamanlama Oluştur</DialogTitle>
                    <DialogDescription>
                      Otomatik senkronizasyon zamanlaması ayarlayın
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Zamanlama Adı</Label>
                      <Input
                        value={newScheduleData.name}
                        onChange={(e) => setNewScheduleData({ ...newScheduleData, name: e.target.value })}
                        placeholder="Haftalık Poizi Sync"
                        data-testid="input-schedule-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Zamanlama Tipi</Label>
                      <Select
                        value={newScheduleData.scheduleType}
                        onValueChange={(v) => setNewScheduleData({ ...newScheduleData, scheduleType: v })}
                      >
                        <SelectTrigger data-testid="select-schedule-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Günlük</SelectItem>
                          <SelectItem value="weekly">Haftalık</SelectItem>
                          <SelectItem value="monthly">Aylık</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {newScheduleData.scheduleType === "weekly" && (
                      <div className="space-y-2">
                        <Label>Gün</Label>
                        <Select
                          value={String(newScheduleData.dayOfWeek)}
                          onValueChange={(v) => setNewScheduleData({ ...newScheduleData, dayOfWeek: parseInt(v) })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {dayNames.map((day, i) => (
                              <SelectItem key={i} value={String(i)}>{day}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label>Saat (UTC)</Label>
                      <Select
                        value={String(newScheduleData.hourOfDay)}
                        onValueChange={(v) => setNewScheduleData({ ...newScheduleData, hourOfDay: parseInt(v) })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 24 }, (_, i) => (
                            <SelectItem key={i} value={String(i)}>{i.toString().padStart(2, "0")}:00</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Hedef</Label>
                      <Select
                        value={newScheduleData.targetType}
                        onValueChange={(v) => setNewScheduleData({ ...newScheduleData, targetType: v, targetId: "" })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tüm Gruplar</SelectItem>
                          <SelectItem value="vista_group">Belirli Grup</SelectItem>
                          <SelectItem value="chartmetric">Chartmetric</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {newScheduleData.targetType === "vista_group" && (
                      <div className="space-y-2">
                        <Label>Grup Seçin</Label>
                        <Select
                          value={newScheduleData.targetId}
                          onValueChange={(v) => setNewScheduleData({ ...newScheduleData, targetId: v })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Grup seçin" />
                          </SelectTrigger>
                          <SelectContent>
                            {groups.map((g) => (
                              <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setAddScheduleDialogOpen(false)}>İptal</Button>
                    <Button 
                      onClick={() => createScheduleMutation.mutate(newScheduleData)}
                      disabled={createScheduleMutation.isPending || !newScheduleData.name}
                      data-testid="button-create-schedule"
                    >
                      {createScheduleMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Oluştur
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {schedulesLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : schedules.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">Henüz zamanlama yok</h3>
                <p className="text-muted-foreground">Otomatik senkronizasyon için zamanlama ekleyin</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {schedules.map((schedule) => (
                <Card key={schedule.id} data-testid={`schedule-${schedule.id}`}>
                  <CardContent className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Clock className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{schedule.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {schedule.scheduleType === "daily" && "Her gün"}
                          {schedule.scheduleType === "weekly" && `Her ${dayNames[schedule.dayOfWeek || 0]}`}
                          {schedule.scheduleType === "monthly" && "Her ayın başı"}
                          {" "} - {(schedule.hourOfDay || 0).toString().padStart(2, "0")}:00 UTC
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right text-sm">
                        <div className="text-muted-foreground">Son Çalışma</div>
                        <div>{schedule.lastRunAt ? new Date(schedule.lastRunAt).toLocaleString("tr-TR") : "-"}</div>
                      </div>
                      <div className="text-right text-sm">
                        <div className="text-muted-foreground">Sonraki Çalışma</div>
                        <div>{schedule.nextRunAt ? new Date(schedule.nextRunAt).toLocaleString("tr-TR") : "-"}</div>
                      </div>
                      <Badge variant={schedule.lastStatus === "success" ? "default" : schedule.lastStatus === "failed" ? "destructive" : "secondary"}>
                        {schedule.lastStatus || "Bekliyor"}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteScheduleMutation.mutate(schedule.id)}
                        disabled={deleteScheduleMutation.isPending}
                        data-testid={`button-delete-schedule-${schedule.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={addProfileDialogOpen} onOpenChange={setAddProfileDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Profil Ekle</DialogTitle>
            <DialogDescription>
              Vista Social'dan bir profil ekleyin
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Platform</Label>
              <Select
                value={newProfileData.platform}
                onValueChange={(v) => setNewProfileData({ ...newProfileData, platform: v })}
              >
                <SelectTrigger data-testid="select-profile-platform">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tiktok">
                    <div className="flex items-center gap-2">
                      <SiTiktok className="h-4 w-4" />
                      TikTok
                    </div>
                  </SelectItem>
                  <SelectItem value="instagram">
                    <div className="flex items-center gap-2">
                      <SiInstagram className="h-4 w-4" />
                      Instagram
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Vista Profile ID</Label>
              <Input
                value={newProfileData.vistaProfileId}
                onChange={(e) => setNewProfileData({ ...newProfileData, vistaProfileId: e.target.value })}
                placeholder="Vista Social profil ID'si"
                data-testid="input-vista-profile-id"
              />
            </div>
            <div className="space-y-2">
              <Label>Kullanıcı Adı</Label>
              <Input
                value={newProfileData.username}
                onChange={(e) => setNewProfileData({ ...newProfileData, username: e.target.value })}
                placeholder="@kullaniciadi"
                data-testid="input-profile-username"
              />
            </div>
            <div className="space-y-2">
              <Label>Görünen Ad (Opsiyonel)</Label>
              <Input
                value={newProfileData.displayName}
                onChange={(e) => setNewProfileData({ ...newProfileData, displayName: e.target.value })}
                placeholder="Hesap adı"
                data-testid="input-profile-displayname"
              />
            </div>
            <div className="space-y-2">
              <Label>Profil URL (Opsiyonel)</Label>
              <Input
                value={newProfileData.profileUrl}
                onChange={(e) => setNewProfileData({ ...newProfileData, profileUrl: e.target.value })}
                placeholder="https://tiktok.com/@kullaniciadi"
                data-testid="input-profile-url"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddProfileDialogOpen(false)}>İptal</Button>
            <Button 
              onClick={handleAddProfile}
              disabled={addProfileMutation.isPending || !newProfileData.vistaProfileId || !newProfileData.username}
              data-testid="button-add-profile-confirm"
            >
              {addProfileMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Ekle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
