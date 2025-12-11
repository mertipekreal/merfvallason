import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Activity, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Trash2, 
  RefreshCw,
  Database,
  Video,
  Cloud,
  Brain
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

interface JobStats {
  total: number;
  pending: number;
  running: number;
  completed: number;
  failed: number;
  cancelled: number;
}

interface JobSummary {
  id: string;
  jobType: string;
  status: string;
  progress: number;
  targetCount: number;
  processedCount: number;
  successCount: number;
  errorCount: number;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  errors: string[];
}

interface QueueStatsResponse {
  success: boolean;
  stats: JobStats;
  recentJobs: JobSummary[];
}

const JOB_TYPE_LABELS: Record<string, { label: string; icon: typeof Database }> = {
  tiktok_scrape: { label: "TikTok Toplama", icon: Video },
  instagram_scrape: { label: "Instagram Toplama", icon: Video },
  dreambank_ingest: { label: "DreamBank İçe Aktarım", icon: Brain },
};

const DEFAULT_JOB_TYPE = { label: "Bilinmeyen İş", icon: Database };

const STATUS_BADGES: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Bekliyor", variant: "outline" },
  queued: { label: "Kuyrukta", variant: "outline" },
  running: { label: "Çalışıyor", variant: "default" },
  retrying: { label: "Yeniden Deneniyor", variant: "default" },
  completed: { label: "Tamamlandı", variant: "secondary" },
  failed: { label: "Başarısız", variant: "destructive" },
  cancelled: { label: "İptal Edildi", variant: "outline" },
};

const DEFAULT_STATUS = { label: "Bilinmiyor", variant: "outline" as const };

function getJobTypeInfo(jobType: string) {
  return JOB_TYPE_LABELS[jobType] || { ...DEFAULT_JOB_TYPE, label: jobType };
}

function getStatusInfo(status: string) {
  return STATUS_BADGES[status] || { ...DEFAULT_STATUS, label: status };
}

function formatDate(dateString: string | null): string {
  if (!dateString) return "-";
  return format(new Date(dateString), "dd MMM yyyy HH:mm", { locale: tr });
}

function formatDuration(startedAt: string | null, completedAt: string | null): string {
  if (!startedAt) return "-";
  const start = new Date(startedAt);
  const end = completedAt ? new Date(completedAt) : new Date();
  const durationMs = end.getTime() - start.getTime();
  const seconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) return `${hours}s ${minutes % 60}d`;
  if (minutes > 0) return `${minutes}d ${seconds % 60}s`;
  return `${seconds}s`;
}

export default function QueueDashboard() {
  const { toast } = useToast();

  const { data, isLoading, refetch } = useQuery<QueueStatsResponse>({
    queryKey: ["/api/admin/queue-stats"],
    refetchInterval: 5000,
  });

  const clearCompletedMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/queue-clear/completed");
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({ title: "Başarılı", description: data.message });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/queue-stats"] });
    },
    onError: () => {
      toast({ title: "Hata", description: "İşler silinemedi", variant: "destructive" });
    },
  });

  const clearFailedMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/queue-clear/failed");
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({ title: "Başarılı", description: data.message });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/queue-stats"] });
    },
    onError: () => {
      toast({ title: "Hata", description: "İşler silinemedi", variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const stats = data?.stats || { total: 0, pending: 0, running: 0, completed: 0, failed: 0, cancelled: 0 };
  const recentJobs = data?.recentJobs || [];

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Kuyruk Yönetimi</h1>
          <p className="text-muted-foreground mt-1">
            Toplu veri toplama işlerini izleyin ve yönetin
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline" data-testid="button-refresh-stats">
          <RefreshCw className="w-4 h-4 mr-2" />
          Yenile
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Toplam</p>
                <p className="text-2xl font-bold" data-testid="text-total-jobs">{stats.total}</p>
              </div>
              <Database className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Bekliyor</p>
                <p className="text-2xl font-bold text-yellow-500" data-testid="text-pending-jobs">{stats.pending}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Çalışıyor</p>
                <p className="text-2xl font-bold text-primary" data-testid="text-running-jobs">{stats.running}</p>
              </div>
              <Activity className="w-8 h-8 text-primary animate-pulse" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tamamlandı</p>
                <p className="text-2xl font-bold text-green-500" data-testid="text-completed-jobs">{stats.completed}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Başarısız</p>
                <p className="text-2xl font-bold text-red-500" data-testid="text-failed-jobs">{stats.failed}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">İptal</p>
                <p className="text-2xl font-bold text-muted-foreground" data-testid="text-cancelled-jobs">{stats.cancelled}</p>
              </div>
              <Trash2 className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Son İşler</CardTitle>
              <CardDescription>
                Son 20 veri toplama işi
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => clearCompletedMutation.mutate()}
                disabled={clearCompletedMutation.isPending || stats.completed === 0}
                data-testid="button-clear-completed"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Tamamlananları Sil
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => clearFailedMutation.mutate()}
                disabled={clearFailedMutation.isPending || stats.failed === 0}
                data-testid="button-clear-failed"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Başarısızları Sil
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {recentJobs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Cloud className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Henüz iş bulunmuyor</p>
              <p className="text-sm mt-2">Toplu veri toplama sayfasından yeni işler başlatın</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentJobs.map((job) => {
                const jobTypeInfo = getJobTypeInfo(job.jobType);
                const statusInfo = getStatusInfo(job.status);
                const Icon = jobTypeInfo.icon;

                return (
                  <div 
                    key={job.id} 
                    className="flex items-center gap-4 p-4 rounded-lg border bg-card"
                    data-testid={`job-card-${job.id}`}
                  >
                    <Icon className="w-10 h-10 text-primary flex-shrink-0" />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{jobTypeInfo.label}</span>
                        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Hedef: {job.targetCount.toLocaleString()}</span>
                        <span>İşlenen: {job.processedCount.toLocaleString()}</span>
                        <span>Başarılı: {job.successCount.toLocaleString()}</span>
                        {job.errorCount > 0 && (
                          <span className="text-red-500">Hata: {job.errorCount}</span>
                        )}
                      </div>

                      {job.status === "running" && (
                        <div className="mt-2">
                          <Progress value={job.progress} className="h-2" />
                          <span className="text-xs text-muted-foreground mt-1">
                            %{job.progress.toFixed(1)}
                          </span>
                        </div>
                      )}

                      {job.errors.length > 0 && (
                        <div className="mt-2 text-xs text-red-500">
                          Son hata: {job.errors[job.errors.length - 1]}
                        </div>
                      )}
                    </div>

                    <div className="text-right text-sm text-muted-foreground flex-shrink-0">
                      <div>Oluşturulma: {formatDate(job.createdAt)}</div>
                      {job.startedAt && (
                        <div>Süre: {formatDuration(job.startedAt, job.completedAt)}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">Tümü</TabsTrigger>
          <TabsTrigger value="tiktok">TikTok</TabsTrigger>
          <TabsTrigger value="instagram">Instagram</TabsTrigger>
          <TabsTrigger value="dreambank">DreamBank</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>Tüm İşler</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Toplam {stats.total} iş | {stats.running} çalışıyor | {stats.completed} tamamlandı
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tiktok">
          <JobTypeStats type="tiktok_scrape" />
        </TabsContent>

        <TabsContent value="instagram">
          <JobTypeStats type="instagram_scrape" />
        </TabsContent>

        <TabsContent value="dreambank">
          <JobTypeStats type="dreambank_ingest" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function JobTypeStats({ type }: { type: string }) {
  const { data, isLoading } = useQuery<{ success: boolean; jobs: JobSummary[] }>({
    queryKey: ["/api/admin/queue-jobs", type],
  });

  const jobs = data?.jobs || [];
  const running = jobs.filter(j => j.status === "running").length;
  const completed = jobs.filter(j => j.status === "completed").length;
  const failed = jobs.filter(j => j.status === "failed").length;
  const typeInfo = JOB_TYPE_LABELS[type] || { label: type, icon: Database };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <typeInfo.icon className="w-5 h-5" />
          {typeInfo.label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin" />
          </div>
        ) : jobs.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Bu türde iş bulunmuyor</p>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-4 text-sm">
              <span>Toplam: {jobs.length}</span>
              <span className="text-primary">Çalışıyor: {running}</span>
              <span className="text-green-500">Tamamlandı: {completed}</span>
              <span className="text-red-500">Başarısız: {failed}</span>
            </div>

            <div className="space-y-2">
              {jobs.slice(0, 5).map(job => {
                const statusInfo = getStatusInfo(job.status);
                return (
                  <div key={job.id} className="flex items-center justify-between p-2 rounded bg-muted/50">
                    <div className="flex items-center gap-2">
                      <Badge variant={statusInfo.variant} className="text-xs">{statusInfo.label}</Badge>
                      <span className="text-sm">{job.processedCount.toLocaleString()} / {job.targetCount.toLocaleString()}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{formatDate(job.createdAt)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
