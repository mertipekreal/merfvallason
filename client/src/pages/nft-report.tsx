import { useEffect } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  RadarChart,
  Radar,
  PieChart,
  Pie,
  Cell,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, Gem, Image, Users } from "lucide-react";

export default function NFTReportPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const ecosystemData = [
    { name: "PFP (Profil Resmi)", value: 45 },
    { name: "Oyun & Metaverse", value: 20 },
    { name: "Dijital Sanat", value: 15 },
    { name: "Utility/Uyelik", value: 12 },
    { name: "Diger", value: 8 },
  ];

  const ecosystemColors = ["#19B5B5", "#8b5cf6", "#e879f9", "#f472b6", "#475569"];

  const expensiveData = [
    { name: "The Merge (Pak)", value: 91.8, category: "Merge" },
    { name: "Beeple First 5000", value: 69.3, category: "Beeple1" },
    { name: "Clock (Pak & Assange)", value: 52.7, category: "Clock" },
    { name: "Human One (Beeple)", value: 28.9, category: "Beeple2" },
    { name: "CryptoPunk #5822", value: 23.7, category: "Punk" },
  ];

  const trendData = [
    { month: "Ocak 2021", volume: 0.2 },
    { month: "Nisan 2021", volume: 1.1 },
    { month: "Temmuz 2021", volume: 1.5 },
    { month: "Agustos 2021", volume: 5.8 },
    { month: "Ocak 2022", volume: 4.5 },
    { month: "Haziran 2022", volume: 1.2 },
    { month: "Ocak 2023", volume: 0.8 },
    { month: "Ocak 2024", volume: 1.1 },
    { month: "Bugun", volume: 1.3 },
  ];

  const sentimentData = [
    { category: "FOMO", "2021": 95, "2024": 40 },
    { category: "Topluluk", "2021": 80, "2024": 75 },
    { category: "Utility", "2021": 20, "2024": 85 },
    { category: "Sanat Degeri", "2021": 50, "2024": 70 },
    { category: "Spekulasyon", "2021": 95, "2024": 40 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1f35] via-[#2D3654] to-[#1a1f35] text-slate-200">
      <header className="relative min-h-[60vh] flex items-center justify-center overflow-hidden py-16 px-4">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#1a1f35]/80 to-[#1a1f35]"></div>

        <div className="relative z-10 text-center max-w-4xl mx-auto">
          <div className="inline-block py-1 px-3 rounded-full bg-[#19B5B5]/20 text-[#19B5B5] text-sm font-bold tracking-wider mb-4 border border-[#19B5B5]/30" data-testid="badge-report-year">
            DIJITAL VARLIK RAPORU 2024-2025
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold mb-6 tracking-tight text-white">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#19B5B5] via-purple-500 to-pink-500">
              NFT
            </span>{" "}
            Dunyasinin Kodlarini Cozmek
          </h1>

          <p className="text-xl md:text-2xl text-slate-300 max-w-2xl mx-auto leading-relaxed mb-12">
            Milyon dolarlik JPEG'lerden dijital mulkiyet devrimine. Piyasa verileri, en
            pahali eserler ve yatirimci psikolojisi uzerine kapsamli bir inceleme.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatsCard title="Tarihi Toplam Hacim" value="$60+ Milyar" icon={<TrendingUp className="w-5 h-5" />} />
            <StatsCard title="Aktif Cuzdanlar" value="4.5 Milyon+" icon={<Users className="w-5 h-5" />} />
            <StatsCard title="En Yuksek Satis" value="$91.8 Milyon" icon={<Gem className="w-5 h-5" />} />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-16 space-y-24">
        <Section1Intro ecosystemData={ecosystemData} ecosystemColors={ecosystemColors} />
        <Section2Expensive expensiveData={expensiveData} />
        <Section3Trend trendData={trendData} />
        <Section4Sentiment sentimentData={sentimentData} />
        <Section5ProcessFlow />

        <footer className="text-center text-slate-500 pt-12 pb-6 border-t border-slate-800">
          <p className="mb-2">2025 NFT Analiz Raporu. Yatirim tavsiyesi degildir.</p>
          <p className="text-xs">DuyguMotor Entegre NFT Pazar Analiz Modulu</p>
        </footer>
      </main>
    </div>
  );
}

function StatsCard({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="bg-[#2D3654]/50 p-6 rounded-xl shadow-lg border border-[#3D4766] hover:border-[#19B5B5]/50 transition" data-testid={`stat-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="flex items-center gap-2 text-slate-400 text-sm uppercase font-semibold mb-2">
        {icon}
        <span>{title}</span>
      </div>
      <p className="text-3xl font-bold text-white">{value}</p>
    </div>
  );
}

function Section1Intro({
  ecosystemData,
  ecosystemColors,
}: {
  ecosystemData: { name: string; value: number }[];
  ecosystemColors: string[];
}) {
  return (
    <section data-testid="section-intro">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div>
          <h2 className="text-3xl font-bold text-white mb-6 border-l-4 border-[#19B5B5] pl-4">
            NFT Nedir ve Neden Onemlidir?
          </h2>
          <p className="text-slate-300 mb-4 leading-relaxed">
            NFT (Non-Fungible Token), blokzinciri uzerinde yasayan ve "degistirilemez"
            nitelikteki dijital varliklardir. Bir Bitcoin baska bir Bitcoin ile takas
            edilebilirken, her NFT benzersiz bir dijital imzaya sahiptir.
          </p>
          <p className="text-slate-300 mb-6 leading-relaxed">
            Sanat dunyasinda baslayan bu akim, oyun ici varliklara, dijital kimliklere ve
            hatta fiziksel gayrimenkul tapularina kadar evrildi.
          </p>
        </div>
        <div className="bg-[#2D3654]/50 p-8 rounded-2xl border border-[#3D4766]">
          <h3 className="text-xl font-bold text-[#19B5B5] mb-4 text-center">
            NFT Ekosistem Dagilimi
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={ecosystemData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${value}%`}
                outerRadius={90}
                fill="#8884d8"
                dataKey="value"
              >
                {ecosystemData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={ecosystemColors[index % ecosystemColors.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value) => `${value}%`} 
                contentStyle={{ backgroundColor: "#2D3654", borderColor: "#19B5B5", color: "#fff" }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
          <p className="text-xs text-center text-slate-500 mt-4">
            Pazar payinin kategorilere gore dagilimi (Tahmini Veri)
          </p>
        </div>
      </div>
    </section>
  );
}

function Section2Expensive({ expensiveData }: { expensiveData: { name: string; value: number; category: string }[] }) {
  return (
    <section className="bg-[#2D3654]/50 p-8 md:p-12 rounded-3xl border border-[#3D4766]" data-testid="section-expensive">
      <h2 className="text-3xl md:text-4xl font-bold text-center text-white mb-4">
        Tarihin En Pahali Dijital Eserleri
      </h2>
      <p className="text-center text-slate-400 max-w-3xl mx-auto mb-12">
        Bu eserler sadece birer "resim" degil, dijital sanat tarihinin kilometre taslaridir. 
        Pak'in "The Merge" ve Beeple'in Christie's muzayedesindeki satisi, NFT'leri ana akim
        medyaya tasiyan olaylardir.
      </p>

      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={expensiveData}
          margin={{ top: 20, right: 30, left: 0, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis dataKey="name" stroke="#cbd5e1" angle={-25} textAnchor="end" height={80} fontSize={12} />
          <YAxis
            stroke="#cbd5e1"
            label={{ value: "Fiyat (Milyon USD)", angle: -90, position: "insideLeft", fill: "#cbd5e1" }}
          />
          <Tooltip
            contentStyle={{ backgroundColor: "#2D3654", borderColor: "#8b5cf6", color: "#fff" }}
            formatter={(value) => `$${value}M`}
          />
          <Bar dataKey="value" fill="#19B5B5" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 text-center">
        <div className="p-4">
          <Gem className="w-12 h-12 mx-auto mb-2 text-[#19B5B5]" />
          <h4 className="font-bold text-white">The Merge</h4>
          <p className="text-sm text-slate-400">Parcali Sahiplik Yapisi</p>
        </div>
        <div className="p-4">
          <Image className="w-12 h-12 mx-auto mb-2 text-purple-500" />
          <h4 className="font-bold text-white">Beeple</h4>
          <p className="text-sm text-slate-400">Geleneksel Muzayede Rekoru</p>
        </div>
        <div className="p-4">
          <Users className="w-12 h-12 mx-auto mb-2 text-pink-500" />
          <h4 className="font-bold text-white">CryptoPunks</h4>
          <p className="text-sm text-slate-400">OG Koleksiyon Statusu</p>
        </div>
      </div>
    </section>
  );
}

function Section3Trend({ trendData }: { trendData: { month: string; volume: number }[] }) {
  return (
    <section data-testid="section-trend">
      <div className="mb-10">
        <h2 className="text-3xl font-bold text-white mb-4 border-l-4 border-purple-500 pl-4">
          Piyasa Hacmi ve Trendler
        </h2>
        <p className="text-slate-300 max-w-4xl">
          2021 yilindaki "Altina Hucum" doneminden sonra piyasa ciddi bir duzeltme yasadi.
          Aylik islem hacimlerindeki dramatik yukselisi ve ardindan gelen stabilizasyon
          surecini gormekteyiz. Spekulasyonun yerini yavas yavas "Fayda" odakli projelere
          biraktigini goruyoruz.
        </p>
      </div>
      <div className="bg-[#2D3654]/50 p-6 rounded-2xl shadow-2xl border border-[#3D4766]">
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={trendData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="month" stroke="#cbd5e1" fontSize={12} />
            <YAxis
              stroke="#cbd5e1"
              label={{ value: "Hacim (Milyar USD)", angle: -90, position: "insideLeft", fill: "#cbd5e1" }}
            />
            <Tooltip
              contentStyle={{ backgroundColor: "#2D3654", borderColor: "#19B5B5", color: "#fff" }}
              formatter={(value) => `$${value}B`}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="volume"
              stroke="#19B5B5"
              strokeWidth={3}
              dot={{ fill: "#fff", r: 4 }}
              name="Aylik Hacim"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function Section4Sentiment({ sentimentData }: { sentimentData: { category: string; "2021": number; "2024": number }[] }) {
  return (
    <section className="grid grid-cols-1 lg:grid-cols-2 gap-16" data-testid="section-sentiment">
      <div className="bg-[#2D3654]/50 p-8 rounded-2xl border border-[#3D4766] flex items-center justify-center order-2 lg:order-1">
        <ResponsiveContainer width="100%" height={400}>
          <RadarChart data={sentimentData}>
            <PolarGrid stroke="rgba(255,255,255,0.1)" />
            <PolarAngleAxis dataKey="category" stroke="#cbd5e1" fontSize={12} />
            <PolarRadiusAxis stroke="#cbd5e1" />
            <Radar
              name="2021 Boga"
              dataKey="2021"
              stroke="#e879f9"
              fill="#e879f9"
              fillOpacity={0.25}
            />
            <Radar
              name="2024 Olgunluk"
              dataKey="2024"
              stroke="#19B5B5"
              fill="#19B5B5"
              fillOpacity={0.25}
            />
            <Legend />
            <Tooltip contentStyle={{ backgroundColor: "#2D3654", borderColor: "#8b5cf6", color: "#fff" }} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-col justify-center order-1 lg:order-2">
        <h2 className="text-3xl font-bold text-white mb-6 border-l-4 border-pink-500 pl-4">
          Yatirimci Psikolojisi ve Duygu Analizi
        </h2>
        <p className="text-slate-300 mb-6 leading-relaxed">
          NFT piyasasi, geleneksel borsalardan cok daha fazla "duygu" ile hareket eder.
          Analizimiz iki farkli donemi kiyasliyor:
        </p>
        <ul className="space-y-4">
          <li className="flex items-start">
            <span className="w-4 h-4 mt-1 rounded-full bg-pink-500 mr-3 shrink-0"></span>
            <div>
              <strong className="text-white block">2021 "Boga" Psikolojisi</strong>
              <span className="text-slate-400 text-sm">
                FOMO ve Spekulasyon zirvedeydi. Topluluk aidiyeti gucluydu.
              </span>
            </div>
          </li>
          <li className="flex items-start">
            <span className="w-4 h-4 mt-1 rounded-full bg-[#19B5B5] mr-3 shrink-0"></span>
            <div>
              <strong className="text-white block">2024 "Ayi/Insa" Psikolojisi</strong>
              <span className="text-slate-400 text-sm">
                Yatirimcilar "Fayda" (Utility) ve gercek dunya kullanim talep ediyor.
                Spekulasyon azaldi, secicilik artti.
              </span>
            </div>
          </li>
        </ul>
      </div>
    </section>
  );
}

function Section5ProcessFlow() {
  const steps = [
    {
      num: "1",
      icon: <Users className="w-10 h-10 text-[#19B5B5]" />,
      title: "Cuzdan Kurulumu",
      desc: "MetaMask veya Phantom gibi dijital cuzdan olusturun.",
    },
    {
      num: "2",
      icon: <Gem className="w-10 h-10 text-purple-500" />,
      title: "Kripto Transferi",
      desc: "Ethereum (ETH) veya Solana (SOL) satin alip cuzdana transfer edin.",
    },
    {
      num: "3",
      icon: <Image className="w-10 h-10 text-pink-500" />,
      title: "Pazar Yeri",
      desc: "OpenSea, Blur veya Magic Eden'e cuzdaninizla baglanin.",
    },
    {
      num: "4",
      icon: <TrendingUp className="w-10 h-10 text-green-500" />,
      title: "Satin Alma",
      desc: "Begendiginiz eseri alin veya muzayede icin teklif verin.",
    },
  ];

  return (
    <section className="bg-gradient-to-r from-[#1a1f35] to-indigo-950 p-10 rounded-3xl border border-indigo-500/30" data-testid="section-process">
      <h2 className="text-3xl font-bold text-white text-center mb-12">
        NFT Ekosistemine Giris Sureci
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {steps.map((step, idx) => (
          <div key={idx} className="bg-[#2D3654]/50 p-6 rounded-xl border border-[#3D4766] hover:border-[#19B5B5]/30 transition" data-testid={`step-${idx + 1}`}>
            <div className="mb-4">{step.icon}</div>
            <h3 className="text-xl font-bold text-[#19B5B5] mb-2">
              {step.num}. {step.title}
            </h3>
            <p className="text-sm text-slate-400">{step.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
