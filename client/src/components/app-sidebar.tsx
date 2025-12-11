import { Link, useLocation } from "wouter";
import {
  TrendingUp,
  GitCompare,
  Sparkles,
  Brain,
  Upload,
  Video,
  Database,
  Calendar,
  Zap,
  BarChart3,
  Wand2,
  Music,
  ListMusic,
  ArrowRightLeft,
  Users,
  Moon,
  Trophy,
  Image,
  FileBarChart,
  Activity,
  FileText,
  Layers,
  MessageCircle,
  Bot,
  Github,
  GitBranch,
  Scan,
  LineChart,
  Bell,
  FlaskConical,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";

const mainNavItems = [
  {
    title: "AI Sohbet",
    url: "/ai-chat",
    icon: Bot,
  },
  {
    title: "Duygu Analizi",
    url: "/ai-sentiment",
    icon: Brain,
  },
  {
    title: "Trend Keşfet",
    url: "/trends",
    icon: TrendingUp,
  },
  {
    title: "Karşılaştır",
    url: "/compare",
    icon: GitCompare,
  },
];

const dataSourceItems = [
  {
    title: "Veri Yükle",
    url: "/upload",
    icon: Upload,
  },
  {
    title: "Veri Kaynakları",
    url: "/data-sources",
    icon: Database,
  },
  {
    title: "Toplu Veri Toplama",
    url: "/bulk-collection",
    icon: Zap,
  },
  {
    title: "Haftalık Analiz",
    url: "/weekly-insights",
    icon: Calendar,
  },
  {
    title: "Veri Mimarisi",
    url: "/veri-mimarisi",
    icon: FileBarChart,
  },
  {
    title: "Kuyruk Yönetimi",
    url: "/queue-dashboard",
    icon: Activity,
  },
  {
    title: "Davranış Katmanı",
    url: "/davranis",
    icon: Layers,
  },
  {
    title: "Vista Hesapları",
    url: "/vista-hesaplari",
    icon: Users,
  },
];

const creativeItems = [
  {
    title: "Brief Bot",
    url: "/brief-bot",
    icon: Wand2,
  },
  {
    title: "İçerik Optimizasyonu",
    url: "/creative/optimizer",
    icon: Video,
  },
];

const musicItems = [
  {
    title: "Şarkı Analizi",
    url: "/spotify-insight",
    icon: Music,
  },
  {
    title: "Playlist Önerileri",
    url: "/artist-playlists",
    icon: Users,
  },
  {
    title: "Playlist Uyumu",
    url: "/playlist-fit",
    icon: ListMusic,
  },
  {
    title: "TikTok Köprüsü",
    url: "/tiktok-bridge",
    icon: ArrowRightLeft,
  },
];

const dreamItems = [
  {
    title: "Kader Motoru",
    url: "/kader-motoru",
    icon: Sparkles,
  },
  {
    title: "Rüya Analizi",
    url: "/ruya-analizi",
    icon: Moon,
  },
  {
    title: "NFT Stüdyo",
    url: "/nft-studio",
    icon: Image,
  },
  {
    title: "NFT Raporu",
    url: "/nft-report",
    icon: FileText,
  },
  {
    title: "Gamifikasyon",
    url: "/gamifikasyon",
    icon: Trophy,
  },
];

const marketItems = [
  {
    title: "Trading Merkezi",
    url: "/trading",
    icon: Activity,
  },
  {
    title: "Piyasa Göstergesi",
    url: "/market",
    icon: LineChart,
  },
  {
    title: "Backtest Dashboard",
    url: "/backtest",
    icon: FlaskConical,
  },
  {
    title: "Bildirim Ayarları",
    url: "/notifications",
    icon: Bell,
  },
];

const developerItems = [
  {
    title: "GitHub",
    url: "/github",
    icon: Github,
  },
  {
    title: "Görüntü Segmentasyonu",
    url: "/sam-segmentation",
    icon: Scan,
  },
];

export function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary via-primary/80 to-primary/60 shadow-lg shadow-primary/25 group-hover:shadow-primary/40 transition-all duration-300">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/20 to-transparent" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text" data-testid="text-brand-name">
              MERF AI
            </span>
            <span className="text-[10px] text-primary font-medium tracking-wider uppercase">
              Yapay Zeka Asistanı
            </span>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider px-2">
            Keşfet
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    className="rounded-lg transition-all duration-200"
                    data-testid={`nav-${item.title.toLowerCase()}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider px-2">
            Piyasa
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {marketItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    className="rounded-lg transition-all duration-200"
                    data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider px-2">
            Veri Merkezi
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {dataSourceItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    className="rounded-lg transition-all duration-200"
                    data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider px-2">
            Yaratıcı Stüdyo
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {creativeItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    className="rounded-lg transition-all duration-200"
                    data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider px-2">
            Müzik Analizi
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {musicItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    className="rounded-lg transition-all duration-200"
                    data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider px-2">
            Bilinçaltı Analizi
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {dreamItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    className="rounded-lg transition-all duration-200"
                    data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider px-2">
            Geliştirici Araçları
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {developerItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    className="rounded-lg transition-all duration-200"
                    data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="flex items-center justify-center gap-2">
          <span className="text-xs text-muted-foreground">
            Created by <span className="text-foreground font-medium">Mert İpek</span>
          </span>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
