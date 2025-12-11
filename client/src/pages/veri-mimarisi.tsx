import { useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Radar, Doughnut, Line, Bar } from "react-chartjs-2";
import { Music, Zap, Moon, Database, Brain, BarChart3, TrendingUp, MessageSquare } from "lucide-react";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
);

const commonTooltipConfig = {
  backgroundColor: "rgba(15, 23, 42, 0.9)",
  titleColor: "#f8fafc",
  bodyColor: "#cbd5e1",
  borderColor: "#19B5B5",
  borderWidth: 1,
};

const commonOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: { color: "#cbd5e1", font: { size: 12 } },
    },
    tooltip: commonTooltipConfig,
  },
};

export default function VeriMimarisi() {
  const { data: statsData } = useQuery<{ success: boolean; stats: { total: number; dreambank: number; user: number } }>({
    queryKey: ["/api/dreambank/stats"],
  });

  const stats = statsData?.stats;

  const emotionRadarData = {
    labels: ["Beklenti", "Sevinç", "Güven", "Korku", "Şaşkınlık", "Üzüntü", "Tiksinti", "Öfke"],
    datasets: [
      {
        label: "Örnek Rüya Profili",
        data: [80, 20, 30, 65, 50, 10, 5, 15],
        fill: true,
        backgroundColor: "rgba(25, 181, 181, 0.2)",
        borderColor: "#19B5B5",
        pointBackgroundColor: "#19B5B5",
        pointBorderColor: "#fff",
        pointHoverBackgroundColor: "#fff",
        pointHoverBorderColor: "#19B5B5",
      },
    ],
  };

  const radarOptions = {
    ...commonOptions,
    scales: {
      r: {
        angleLines: { color: "rgba(255, 255, 255, 0.1)" },
        grid: { color: "rgba(255, 255, 255, 0.1)" },
        pointLabels: { color: "#cbd5e1", font: { size: 11 } },
        ticks: { display: false, backdropColor: "transparent" },
      },
    },
  };

  const metadataDonutData = {
    labels: ["Görsel Baskın", "İşitsel Baskın", "Dokunsal/Hissiyat", "Bilinçli (Lüsid)"],
    datasets: [
      {
        data: [45, 25, 20, 10],
        backgroundColor: ["#19B5B5", "#8b5cf6", "#ec4899", "#10b981"],
        borderWidth: 0,
        hoverOffset: 4,
      },
    ],
  };

  const donutOptions = {
    ...commonOptions,
    cutout: "65%",
    plugins: {
      ...commonOptions.plugins,
      legend: { position: "right" as const, labels: { color: "#cbd5e1" } },
    },
  };

  const longitudinalData = {
    labels: ["1. Ay", "2. Ay", "3. Ay", "4. Ay", "5. Ay", "6. Ay"],
    datasets: [
      {
        label: "Tahmin Doğruluğu (%)",
        data: [15, 28, 42, 65, 78, 89],
        borderColor: "#10b981",
        backgroundColor: "rgba(16, 185, 129, 0.1)",
        fill: true,
        tension: 0.4,
        pointRadius: 5,
        pointBackgroundColor: "#2D3654",
        pointBorderWidth: 2,
      },
    ],
  };

  const lineOptions = {
    ...commonOptions,
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: "rgba(255, 255, 255, 0.05)" },
        ticks: { color: "#94a3b8" },
      },
      x: {
        grid: { display: false },
        ticks: { color: "#94a3b8" },
      },
    },
  };

  const feedbackBarData = {
    labels: ["Anlamsal Eşleşme", "Duygu Analizi", "Sembol Tespiti"],
    datasets: [
      {
        label: "Ham Model",
        data: [65, 58, 70],
        backgroundColor: "#64748b",
      },
      {
        label: "RLHF (İnsan Onaylı)",
        data: [92, 88, 95],
        backgroundColor: "#19B5B5",
      },
    ],
  };

  const barOptions = {
    ...commonOptions,
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        grid: { color: "rgba(255, 255, 255, 0.05)" },
        ticks: { color: "#94a3b8" },
      },
      x: {
        grid: { display: false },
        ticks: { color: "#94a3b8" },
      },
    },
  };

  const volumeAreaData = {
    labels: ["Seed (DreamBank)", "Pilot (Social Sync)", "Beta", "Genel Lansman", "Kritik Kütle"],
    datasets: [
      {
        label: "Veri Hacmi (Girdi Sayısı)",
        data: [20000, 40000, 60000, 100000, 250000],
        borderColor: "#19B5B5",
        backgroundColor: "rgba(25, 181, 181, 0.4)",
        fill: true,
        tension: 0.3,
      },
    ],
  };

  const areaOptions = {
    ...commonOptions,
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: "rgba(255, 255, 255, 0.05)" },
        ticks: { color: "#94a3b8" },
      },
      x: {
        grid: { display: false },
        ticks: { color: "#94a3b8", maxRotation: 45, minRotation: 45 },
      },
    },
  };

  return (
    <div className="min-h-screen bg-[#2D3654] text-white">
      <header className="relative overflow-hidden py-12 md:py-20 text-center px-4">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-cyan-500 via-violet-500 to-pink-500" />
        <h1 className="text-4xl md:text-6xl font-bold mb-4 tracking-tight">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#19B5B5] to-violet-500">
            DuyguMotor
          </span>{" "}
          Veri Mimarisi
        </h1>
        <p className="text-lg md:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
          Derinlemesine duygusal analiz, DejaVu tahmini ve anlamlı NFT üretimi için yeni nesil veri stratejisi.
          Mevcut yapıyı{" "}
          <span className="text-[#19B5B5] font-semibold">derinlik, bağlam ve doğrulama</span> ile
          zenginleştiriyoruz.
        </p>

        {stats && (
          <div className="flex justify-center gap-4 mt-8" data-testid="stats-badges">
            <Badge variant="outline" className="text-lg px-4 py-2 border-[#19B5B5] text-[#19B5B5]">
              <Database className="w-4 h-4 mr-2" />
              {stats.total.toLocaleString()} Toplam Rüya
            </Badge>
            <Badge variant="outline" className="text-lg px-4 py-2 border-violet-500 text-violet-400">
              <Brain className="w-4 h-4 mr-2" />
              {stats.dreambank.toLocaleString()} DreamBank
            </Badge>
            <Badge variant="outline" className="text-lg px-4 py-2 border-pink-500 text-pink-400">
              {stats.user} Kullanıcı Rüyası
            </Badge>
          </div>
        )}
      </header>

      <main className="container mx-auto px-4 pb-12 space-y-16">
        <section>
          <div className="mb-8 border-l-4 border-violet-500 pl-4">
            <h2 className="text-3xl font-bold text-white mb-2">1. Yapılandırılmış Derinlik</h2>
            <p className="text-slate-400">
              Serbest metin yeterli değildir. Nitelikli analiz için kullanıcıdan granüler, yapılandırılmış duygu
              ve meta verileri toplamalıyız.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="bg-[#3D4766]/70 backdrop-blur-sm border-violet-500/20 hover:border-violet-500/50 transition-all">
              <CardHeader>
                <CardTitle className="text-[#19B5B5] flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Granüler Duygu Profili
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]" data-testid="chart-emotion-radar">
                  <Radar data={emotionRadarData} options={radarOptions} />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#3D4766]/70 backdrop-blur-sm border-pink-500/20 hover:border-pink-500/50 transition-all">
              <CardHeader>
                <CardTitle className="text-pink-400 flex items-center gap-2">
                  <Brain className="w-5 h-5" />
                  Rüya Meta Verileri
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]" data-testid="chart-metadata-donut">
                  <Doughnut data={metadataDonutData} options={donutOptions} />
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section>
          <div className="mb-8 border-l-4 border-[#19B5B5] pl-4">
            <h2 className="text-3xl font-bold text-white mb-2">2. Bağlamsal Entegrasyon</h2>
          </div>

          <Card className="bg-[#3D4766]/70 backdrop-blur-sm border-[#19B5B5]/20">
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-center">
                <div className="flex-1 bg-slate-800 p-4 rounded-xl border border-slate-700 w-full hover:border-blue-500 transition">
                  <Music className="w-10 h-10 mx-auto mb-2 text-blue-400" />
                  <h4 className="font-bold text-blue-400">Spotify Girdisi</h4>
                  <p className="text-xs text-slate-400 mt-2">Pazartesi 23:00</p>
                </div>
                <div className="text-2xl text-slate-500">→</div>
                <div className="flex-1 bg-slate-800 p-4 rounded-xl border border-slate-700 w-full hover:border-pink-500 transition">
                  <Zap className="w-10 h-10 mx-auto mb-2 text-pink-400" />
                  <h4 className="font-bold text-pink-400">Duygusal İnkübasyon</h4>
                  <p className="text-xs text-slate-400 mt-2">Süre: 4 Saat</p>
                </div>
                <div className="text-2xl text-slate-500">→</div>
                <div className="flex-1 bg-gradient-to-br from-violet-900 to-slate-900 p-4 rounded-xl border border-violet-500 w-full">
                  <Moon className="w-10 h-10 mx-auto mb-2 text-violet-300" />
                  <h4 className="font-bold text-violet-300">Rüya Çıktısı</h4>
                  <p className="text-xs text-slate-400 mt-2">Salı 07:30</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section>
          <div className="mb-8 border-l-4 border-emerald-500 pl-4">
            <h2 className="text-3xl font-bold text-white mb-2">3. Boylamsal Veri & Tahmin</h2>
          </div>

          <Card className="bg-[#3D4766]/70 backdrop-blur-sm border-emerald-500/20 hover:border-emerald-500/50 transition-all">
            <CardHeader>
              <CardTitle className="text-emerald-400 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Zaman İçinde Tahmin İsabeti
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[350px]" data-testid="chart-longitudinal">
                <Line data={longitudinalData} options={lineOptions} />
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <div className="mb-4 border-l-4 border-pink-500 pl-4">
              <h2 className="text-2xl font-bold text-white">4. RLHF & Doğrulama</h2>
            </div>
            <Card className="bg-[#3D4766]/70 backdrop-blur-sm border-pink-500/20 hover:border-pink-500/50 transition-all h-full">
              <CardHeader>
                <CardTitle className="text-pink-400 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Model Karşılaştırması
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]" data-testid="chart-feedback-bar">
                  <Bar data={feedbackBarData} options={barOptions} />
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <div className="mb-4 border-l-4 border-blue-500 pl-4">
              <h2 className="text-2xl font-bold text-white">5. Kritik Kütle (Hacim)</h2>
            </div>
            <Card className="bg-[#3D4766]/70 backdrop-blur-sm border-blue-500/20 hover:border-blue-500/50 transition-all h-full">
              <CardHeader>
                <CardTitle className="text-blue-400 flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Veri Hacmi Büyümesi
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]" data-testid="chart-volume-area">
                  <Line data={volumeAreaData} options={areaOptions} />
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section>
          <div className="mb-8 border-l-4 border-orange-500 pl-4">
            <h2 className="text-3xl font-bold text-white mb-2">6. Kaynaklar & Dış Entegrasyon</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-[#3D4766]/70 backdrop-blur-sm border-t-4 border-orange-400">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-white">DreamBank.net</h3>
                <p className="text-xs text-orange-400 mb-2">Rüya Veritabanı</p>
                <p className="text-sm text-slate-300">{stats?.dreambank?.toLocaleString() || "20,000"}+ rüya raporu</p>
              </CardContent>
            </Card>

            <Card className="bg-[#3D4766]/70 backdrop-blur-sm border-t-4 border-indigo-400">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-white">Google GoEmotions</h3>
                <p className="text-xs text-indigo-400 mb-2">Duygu Etiketleme</p>
                <p className="text-sm text-slate-300">58k Reddit verisi</p>
              </CardContent>
            </Card>

            <Card className="bg-[#3D4766]/70 backdrop-blur-sm border-t-4 border-[#19B5B5]">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-white">TikTok Business API</h3>
                <p className="text-xs text-[#19B5B5] mb-2">Sosyal Veri</p>
                <p className="text-sm text-slate-300">Video metadata</p>
              </CardContent>
            </Card>

            <Card className="bg-[#3D4766]/70 backdrop-blur-sm border-t-4 border-purple-400">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-white">Meta Graph API</h3>
                <p className="text-xs text-purple-400 mb-2">Instagram Verisi</p>
                <p className="text-sm text-slate-300">IG Media endpointleri</p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section>
          <div className="mb-8 border-l-4 border-[#19B5B5] pl-4">
            <h2 className="text-3xl font-bold text-white mb-2">7. Veri Şeması Örneği</h2>
          </div>

          <Card className="bg-[#3D4766]/70 backdrop-blur-sm border-[#19B5B5]/20">
            <CardContent className="p-6">
              <pre className="text-sm text-slate-300 font-mono overflow-x-auto">
{`interface EnhancedDream {
  // Temel Alanlar
  id: string;
  title: string;
  description: string;
  dreamDate: Date;
  
  // Yapılandırılmış Duygular (6-Part Slider)
  emotions: {
    anticipation: number;  // 0-100
    joy: number;
    trust: number;
    fear: number;
    surprise: number;
    sadness: number;
    disgust: number;
    anger: number;
  };
  
  // Meta Veriler
  location: string;
  themes: string[];
  motifs: string[];           // Jungian archetypes
  colorPalette: string[];     // Dominant colors
  intensity: number;          // 1-10
  isLucid: boolean;
  
  // Bağlamsal Veriler
  preEvents?: {
    spotifyTrack?: string;
    mood?: string;
    activities?: string[];
  };
  
  // DreamBank Entegrasyonu
  source: 'user' | 'dreambank';
  dreamerGender?: 'M' | 'F';
  dreamerAge?: string;
  hallVanDeCastle?: {
    emotions?: string;
    characters?: string;
  };
  
  // NFT & Gamification
  rarityScore: number;        // 0-100
  nftEligible: boolean;
  embedding?: number[];       // Semantic vector
}`}
              </pre>
            </CardContent>
          </Card>
        </section>
      </main>

      <footer className="bg-slate-900 py-8 text-center text-slate-500 border-t border-slate-800">
        <p>© 2025 DuyguMotor Strateji Raporu. Yapılandırılmış Veri Analizi.</p>
        <p className="text-sm mt-2">Created by Mert İpek</p>
      </footer>
    </div>
  );
}
