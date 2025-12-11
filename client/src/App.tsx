import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import NotFound from "@/pages/not-found";
import { useState, useEffect } from "react";
import Dashboard from "@/pages/dashboard";
import AnalyticsPage from "@/pages/analytics";
import TrendsPage from "@/pages/trends";
import ComparePage from "@/pages/compare";
import TikTokDataPage from "@/pages/tiktok-data";
import PhoneConversationsPage from "@/pages/phone-conversations";
import StoryEnginePage from "@/pages/creative/story-engine";
import CharacterForgePage from "@/pages/creative/character-forge";
import WorldBuilderPage from "@/pages/creative/world-builder";
import DreamStudioPage from "@/pages/creative/dream-studio";
import ContentOptimizerPage from "@/pages/content-optimizer";
import AISentimentPage from "@/pages/ai-sentiment";
import VisualizationsPage from "@/pages/visualizations";
import HistoryPage from "@/pages/history";
import UploadPage from "@/pages/upload";
import DataSourcesPage from "@/pages/data-sources";
import WeeklyInsightsPage from "@/pages/weekly-insights";
import BriefBotPage from "@/pages/brief-bot";
import SpotifyInsightPage from "@/pages/spotify-insight";
import PlaylistFitPage from "@/pages/playlist-fit";
import TikTokBridgePage from "@/pages/tiktok-bridge";
import ArtistPlaylistsPage from "@/pages/artist-playlists";
import DreamAnalysisPage from "@/pages/dream-analysis";
import GamificationPage from "@/pages/gamification";
import NFTStudioPage from "@/pages/nft-studio";
import VeriMimarisiPage from "@/pages/veri-mimarisi";
import BulkDataCollectionPage from "@/pages/bulk-data-collection";
import QueueDashboardPage from "@/pages/queue-dashboard";
import NFTReportPage from "@/pages/nft-report";
import BehaviorDashboardPage from "@/pages/behavior-dashboard";
import VistaAccountsPage from "@/pages/vista-accounts";
import FateEnginePage from "@/pages/fate-engine";
import AIChatPage from "@/pages/ai-chat";
import GitHubPage from "@/pages/github";
import SamSegmentationPage from "@/pages/sam-segmentation";
import MarketDashboardPage from "@/pages/market-dashboard";
import NotificationSettingsPage from "@/pages/notification-settings";
import BacktestDashboardPage from "@/pages/backtest-dashboard";
import TradingDashboardPage from "@/pages/trading-dashboard";
import AlphaDashboardPage from "@/pages/alpha-dashboard";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/analytics" component={AnalyticsPage} />
      <Route path="/trends" component={TrendsPage} />
      <Route path="/compare" component={ComparePage} />
      <Route path="/ai-sentiment" component={AISentimentPage} />
      <Route path="/visualizations" component={VisualizationsPage} />
      <Route path="/history" component={HistoryPage} />
      <Route path="/upload" component={UploadPage} />
      <Route path="/data-sources" component={DataSourcesPage} />
      <Route path="/weekly-insights" component={WeeklyInsightsPage} />
      <Route path="/brief-bot" component={BriefBotPage} />
      <Route path="/spotify-insight" component={SpotifyInsightPage} />
      <Route path="/playlist-fit" component={PlaylistFitPage} />
      <Route path="/tiktok-bridge" component={TikTokBridgePage} />
      <Route path="/artist-playlists" component={ArtistPlaylistsPage} />
      <Route path="/ruya-analizi" component={DreamAnalysisPage} />
      <Route path="/gamifikasyon" component={GamificationPage} />
      <Route path="/nft-studio" component={NFTStudioPage} />
      <Route path="/nft-report" component={NFTReportPage} />
      <Route path="/veri-mimarisi" component={VeriMimarisiPage} />
      <Route path="/bulk-collection" component={BulkDataCollectionPage} />
      <Route path="/queue-dashboard" component={QueueDashboardPage} />
      <Route path="/davranis" component={BehaviorDashboardPage} />
      <Route path="/vista-hesaplari" component={VistaAccountsPage} />
      <Route path="/kader-motoru" component={FateEnginePage} />
      <Route path="/ai-chat" component={AIChatPage} />
      <Route path="/github" component={GitHubPage} />
      <Route path="/sam-segmentation" component={SamSegmentationPage} />
      <Route path="/market" component={MarketDashboardPage} />
      <Route path="/notifications" component={NotificationSettingsPage} />
      <Route path="/backtest" component={BacktestDashboardPage} />
      <Route path="/trading" component={TradingDashboardPage} />
      <Route path="/alpha" component={AlphaDashboardPage} />
      <Route path="/datasets/tiktok" component={TikTokDataPage} />
      <Route path="/datasets/phone" component={PhoneConversationsPage} />
      <Route path="/creative/story" component={StoryEnginePage} />
      <Route path="/creative/character" component={CharacterForgePage} />
      <Route path="/creative/world" component={WorldBuilderPage} />
      <Route path="/creative/dream" component={DreamStudioPage} />
      <Route path="/creative/optimizer" component={ContentOptimizerPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [location] = useLocation();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('admin') === 'true') {
      localStorage.setItem('merf-admin', 'true');
      setIsAdmin(true);
    } else if (urlParams.get('admin') === 'false') {
      localStorage.removeItem('merf-admin');
      setIsAdmin(false);
    } else {
      setIsAdmin(localStorage.getItem('merf-admin') === 'true');
    }
  }, [location]);

  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  } as React.CSSProperties;

  if (!isAdmin) {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="dark" storageKey="merf-ai-theme">
          <TooltipProvider>
            <div className="h-screen w-full">
              <AIChatPage />
            </div>
            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="merf-ai-theme">
        <TooltipProvider>
          <SidebarProvider style={sidebarStyle}>
            <div className="flex h-screen w-full">
              <AppSidebar />
              <div className="flex flex-col flex-1 overflow-hidden">
                <header className="flex h-14 items-center justify-between gap-4 px-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                  <SidebarTrigger data-testid="button-sidebar-toggle" />
                  <ThemeToggle />
                </header>
                <main className="flex-1 overflow-auto">
                  <Router />
                </main>
              </div>
            </div>
          </SidebarProvider>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
