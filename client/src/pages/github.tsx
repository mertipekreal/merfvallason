import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Github, 
  GitBranch, 
  Star, 
  GitFork, 
  Lock, 
  Unlock,
  ExternalLink,
  Clock,
  User,
  RefreshCw
} from "lucide-react";

interface GitHubUser {
  id: number;
  login: string;
  name: string | null;
  avatarUrl: string;
  bio: string | null;
  publicRepos: number;
  followers: number;
  following: number;
}

interface GitHubRepo {
  name: string;
  fullName: string;
  description: string | null;
  stars: number;
  forks: number;
  language: string | null;
  isPrivate: boolean;
  url: string;
  updatedAt: string;
}

interface UserResponse {
  success: boolean;
  data: GitHubUser;
}

interface ReposResponse {
  success: boolean;
  data: {
    count: number;
    repos: GitHubRepo[];
  };
}

async function fetchGitHubUser(): Promise<UserResponse> {
  const res = await fetch("/api/tools/execute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ toolName: "github_get_user", args: {} }),
  });
  return res.json();
}

async function fetchGitHubRepos(): Promise<ReposResponse> {
  const res = await fetch("/api/tools/execute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ toolName: "github_list_repos", args: { limit: 10 } }),
  });
  return res.json();
}

export default function GitHubPage() {
  const { data: userData, isLoading: userLoading, refetch: refetchUser } = useQuery({
    queryKey: ["github_user"],
    queryFn: fetchGitHubUser,
  });

  const { data: reposData, isLoading: reposLoading, refetch: refetchRepos } = useQuery({
    queryKey: ["github_repos"],
    queryFn: fetchGitHubRepos,
  });

  const user = userData?.data;
  const repos = reposData?.data?.repos || [];

  const handleRefresh = () => {
    refetchUser();
    refetchRepos();
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "Bilinmiyor";
    const date = new Date(dateString);
    return date.toLocaleDateString("tr-TR", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getLanguageColor = (language: string | null) => {
    const colors: Record<string, string> = {
      TypeScript: "bg-blue-500",
      JavaScript: "bg-yellow-500",
      Python: "bg-green-500",
      HTML: "bg-orange-500",
      CSS: "bg-purple-500",
      Go: "bg-cyan-500",
      Rust: "bg-red-500",
    };
    return colors[language || ""] || "bg-gray-500";
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Github className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">GitHub Entegrasyonu</h1>
            <p className="text-muted-foreground">Repo yönetimi ve versiyon kontrolü</p>
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh}
          data-testid="button-refresh-github"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Yenile
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Bağlı Hesap
          </CardTitle>
          <CardDescription>GitHub hesap bilgileriniz</CardDescription>
        </CardHeader>
        <CardContent>
          {userLoading ? (
            <div className="flex items-center gap-4">
              <Skeleton className="w-16 h-16 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="w-32 h-5" />
                <Skeleton className="w-48 h-4" />
              </div>
            </div>
          ) : user ? (
            <div className="flex items-center gap-4">
              <img 
                src={user.avatarUrl} 
                alt={user.login}
                className="w-16 h-16 rounded-full border-2 border-primary/20"
                data-testid="img-github-avatar"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold" data-testid="text-github-username">
                    @{user.login}
                  </h3>
                  {user.name && (
                    <span className="text-muted-foreground">({user.name})</span>
                  )}
                </div>
                {user.bio && (
                  <p className="text-sm text-muted-foreground mt-1">{user.bio}</p>
                )}
                <div className="flex gap-4 mt-2 text-sm">
                  <span className="flex items-center gap-1">
                    <GitBranch className="w-4 h-4" />
                    <strong>{user.publicRepos}</strong> repo
                  </span>
                  <span className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    <strong>{user.followers}</strong> takipçi
                  </span>
                  <span className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    <strong>{user.following}</strong> takip
                  </span>
                </div>
              </div>
              <Button variant="outline" size="sm" asChild>
                <a 
                  href={`https://github.com/${user.login}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  data-testid="link-github-profile"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Profil
                </a>
              </Button>
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              GitHub hesabı bağlı değil
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="w-5 h-5" />
            Repolarınız
          </CardTitle>
          <CardDescription>
            {repos.length > 0 ? `${repos.length} repo listelendi` : "Repolar yükleniyor..."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {reposLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                  <Skeleton className="w-10 h-10 rounded" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="w-48 h-5" />
                    <Skeleton className="w-full h-4" />
                  </div>
                </div>
              ))}
            </div>
          ) : repos.length > 0 ? (
            <div className="space-y-3">
              {repos.map((repo: GitHubRepo) => (
                <div 
                  key={repo.fullName}
                  className="flex items-center gap-4 p-4 border rounded-lg hover-elevate transition-all"
                  data-testid={`card-repo-${repo.name}`}
                >
                  <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center">
                    {repo.isPrivate ? (
                      <Lock className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <Unlock className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-medium truncate">{repo.name}</h4>
                      {repo.isPrivate && (
                        <Badge variant="secondary" className="text-xs">Private</Badge>
                      )}
                      {repo.language && (
                        <Badge variant="outline" className="text-xs flex items-center gap-1">
                          <span className={`w-2 h-2 rounded-full ${getLanguageColor(repo.language)}`} />
                          {repo.language}
                        </Badge>
                      )}
                    </div>
                    {repo.description && (
                      <p className="text-sm text-muted-foreground truncate mt-1">
                        {repo.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Star className="w-3 h-3" />
                        {repo.stars}
                      </span>
                      <span className="flex items-center gap-1">
                        <GitFork className="w-3 h-3" />
                        {repo.forks}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(repo.updatedAt)}
                      </span>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" asChild>
                    <a 
                      href={repo.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      data-testid={`link-repo-${repo.name}`}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Henüz repo bulunamadı
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Hızlı Aksiyonlar</CardTitle>
          <CardDescription>AI Chat üzerinden GitHub komutları kullanabilirsiniz</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 border rounded-lg bg-muted/30">
              <p className="font-medium text-sm">Repo Ara</p>
              <p className="text-xs text-muted-foreground mt-1">
                "GitHub'da react ara" diyerek repo arayabilirsiniz
              </p>
            </div>
            <div className="p-3 border rounded-lg bg-muted/30">
              <p className="font-medium text-sm">Commit Listele</p>
              <p className="text-xs text-muted-foreground mt-1">
                "merf-ai-hub reposunun commit'lerini göster"
              </p>
            </div>
            <div className="p-3 border rounded-lg bg-muted/30">
              <p className="font-medium text-sm">Issue Takibi</p>
              <p className="text-xs text-muted-foreground mt-1">
                "açık issue'ları listele" komutuyla takip edin
              </p>
            </div>
            <div className="p-3 border rounded-lg bg-muted/30">
              <p className="font-medium text-sm">Yeni Repo</p>
              <p className="text-xs text-muted-foreground mt-1">
                "yeni-proje adında repo oluştur"
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
