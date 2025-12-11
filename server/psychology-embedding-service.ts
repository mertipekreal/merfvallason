/**
 * Psychology Embedding Service
 * Manages trading psychology and money management knowledge base
 * 
 * Features:
 * - Curated articles from trading psychology masters (Mark Douglas, Van Tharp, etc.)
 * - Bilingual content (English + Turkish)
 * - Semantic search for context-aware article retrieval
 * - Integration with enhanced signal combiner for trader guidance
 */

import { v4 as uuidv4 } from 'uuid';
import { generateEmbedding, cosineSimilarity } from './domains/core/services/huggingface-service';
import { db } from './db';
import { tradingPsychologyArticles, tradingContexts } from '@shared/schema';
import type { TradingPsychologyArticle, InsertTradingPsychologyArticle } from '@shared/schema';
import { eq, desc, sql } from 'drizzle-orm';

// ============================================================================
// BUILT-IN PSYCHOLOGY/MONEY MANAGEMENT ARTICLES
// ============================================================================

export const PSYCHOLOGY_ARTICLES: InsertTradingPsychologyArticle[] = [
  // === MARK DOUGLAS - TRADING IN THE ZONE ===
  {
    category: 'psychology',
    title: 'Think in Probabilities, Not Certainties',
    titleTr: 'Olasılıklarla Düşün, Kesinliklerle Değil',
    content: `The market is a neutral arena where anything can happen at any time. Every trade is simply one of many in a series - each with an uncertain outcome. Professional traders understand that even the best setups fail. What separates winners from losers is not the quality of their analysis, but their ability to think in probabilities. When you truly accept that any trade can lose, you eliminate fear and become free to execute your edge without emotional interference. A 60% win rate means 4 out of 10 trades will lose - and that's perfectly fine. The edge manifests over many trades, not on any single trade.`,
    contentTr: `Piyasa, her an her şeyin olabileceği tarafsız bir arenadır. Her işlem, belirsiz sonucu olan bir serinin sadece bir parçasıdır. Profesyonel traderlar en iyi setapların bile başarısız olabileceğini bilir. Kazananları kaybedenlerden ayıran şey analiz kalitesi değil, olasılıklarla düşünme yetenekleridir. Herhangi bir işlemin kaybedebileceğini gerçekten kabul ettiğinizde, korkuyu ortadan kaldırır ve avantajınızı duygusal müdahale olmadan uygulama özgürlüğü kazanırsınız. %60 kazanma oranı, 10 işlemden 4'ünün kaybedeceği anlamına gelir - ve bu gayet normaldir. Avantaj, tek bir işlemde değil, birçok işlem üzerinden kendini gösterir.`,
    keyPrinciples: [
      'Every trade has an uncertain outcome',
      'Edge manifests over a series of trades',
      'Accept losses as part of the process',
      'Fear comes from expecting certainty'
    ],
    tags: ['probability', 'mindset', 'fear', 'edge', 'acceptance'],
    author: 'Mark Douglas',
    sourceBook: 'Trading in the Zone'
  },
  {
    category: 'psychology',
    title: 'The Five Fundamental Truths of Trading',
    titleTr: 'Tradingde Beş Temel Gerçek',
    content: `1) Anything can happen in the market - there is no certainty. 2) You don't need to know what's going to happen next to make money. 3) There is a random distribution between wins and losses for any given set of variables that define an edge. 4) An edge is nothing more than an indication of a higher probability of one thing happening over another. 5) Every moment in the market is unique - no pattern is ever exactly like another. Internalizing these truths transforms your relationship with the market from adversarial to collaborative.`,
    contentTr: `1) Piyasada her şey olabilir - kesinlik yoktur. 2) Para kazanmak için bir sonraki ne olacağını bilmeniz gerekmez. 3) Bir avantajı tanımlayan herhangi bir değişken seti için kazançlar ve kayıplar arasında rastgele bir dağılım vardır. 4) Avantaj, bir şeyin diğerine göre daha yüksek olasılıkla gerçekleşeceğinin bir göstergesinden başka bir şey değildir. 5) Piyasadaki her an benzersizdir - hiçbir formasyonu bir diğerinin aynısı değildir. Bu gerçekleri içselleştirmek, piyasayla ilişkinizi düşmanca olmaktan işbirlikçi olmaya dönüştürür.`,
    keyPrinciples: [
      'Anything can happen',
      'You dont need certainty to profit',
      'Random distribution of wins/losses',
      'Edge is just probability',
      'Every moment is unique'
    ],
    tags: ['fundamentals', 'truth', 'probability', 'uniqueness', 'acceptance'],
    author: 'Mark Douglas',
    sourceBook: 'Trading in the Zone'
  },
  {
    category: 'emotions',
    title: 'Eliminating Fear from Your Trading',
    titleTr: 'Tradingden Korkuyu Ortadan Kaldırmak',
    content: `Fear in trading comes from unreconciled expectations. When you expect a trade to win, losing creates fear. When you expect certainty, uncertainty creates anxiety. The solution is not to overcome fear with willpower, but to eliminate its source by fully accepting the random nature of individual trade outcomes. Define your risk before entering. Accept that the stop loss may be hit. Release all expectation of this specific trade winning. With nothing to fear, you become free to execute your edge mechanically. Fear causes hesitation, late entries, early exits, and missed opportunities - all behaviors that destroy edge.`,
    contentTr: `Tradingdeki korku, uzlaşmamış beklentilerden gelir. Bir işlemin kazanmasını beklediğinizde, kaybetmek korku yaratır. Kesinlik beklediğinizde, belirsizlik kaygı yaratır. Çözüm, korkuyu irade gücüyle yenmek değil, bireysel işlem sonuçlarının rastgele doğasını tam olarak kabul ederek kaynağını ortadan kaldırmaktır. Girmeden önce riskinizi tanımlayın. Stop loss'un tetiklenebileceğini kabul edin. Bu spesifik işlemin kazanacağına dair tüm beklentileri bırakın. Korkacak bir şey kalmadığında, avantajınızı mekanik olarak uygulama özgürlüğü kazanırsınız. Korku, tereddüt, geç girişler, erken çıkışlar ve kaçırılan fırsatlara neden olur - tüm bunlar avantajı yok eden davranışlardır.`,
    keyPrinciples: [
      'Fear comes from unmet expectations',
      'Accept random nature of outcomes',
      'Define risk before entry',
      'Release outcome expectation',
      'Fear destroys edge execution'
    ],
    tags: ['fear', 'acceptance', 'risk', 'psychology', 'execution'],
    author: 'Mark Douglas',
    sourceBook: 'Trading in the Zone'
  },

  // === VAN THARP - POSITION SIZING ===
  {
    category: 'money_management',
    title: 'Position Sizing: The Key to Long-Term Success',
    titleTr: 'Pozisyon Büyüklüğü: Uzun Vadeli Başarının Anahtarı',
    content: `Position sizing is not about how much money you can make - it's about how much you can afford to lose. The 1-2% rule exists for a reason: risking 1% of your account per trade means you need 100 consecutive losers to blow your account. With 2%, you need 50 consecutive losers. Professional traders rarely risk more than 1%. This mathematical reality is why position sizing matters more than entry signals. A mediocre system with excellent position sizing will outperform an excellent system with poor position sizing. Calculate your position size based on your predetermined stop loss and maximum risk percentage.`,
    contentTr: `Pozisyon büyüklüğü ne kadar para kazanabileceğinizle değil, ne kadar kaybetmeyi göze alabileceğinizle ilgilidir. %1-2 kuralı bir nedenden dolayı var: işlem başına hesabınızın %1'ini riske atmak, hesabınızı sıfırlamak için 100 ardışık kayıp gerektiği anlamına gelir. %2 ile 50 ardışık kayıp gerekir. Profesyonel traderlar nadiren %1'den fazla risk alır. Bu matematiksel gerçek, pozisyon büyüklüğünün giriş sinyallerinden daha önemli olmasının nedenidir. Mükemmel pozisyon büyüklüğüne sahip vasat bir sistem, zayıf pozisyon büyüklüğüne sahip mükemmel bir sistemi geçecektir. Pozisyon büyüklüğünüzü önceden belirlenmiş stop loss ve maksimum risk yüzdenize göre hesaplayın.`,
    keyPrinciples: [
      'Risk 1-2% maximum per trade',
      'Position sizing matters more than entries',
      'Calculate size from stop loss distance',
      'Protect capital above all else',
      'Mediocre system + great sizing beats reverse'
    ],
    tags: ['position_sizing', 'risk', 'capital', 'percentage', 'survival'],
    author: 'Van K. Tharp',
    sourceBook: 'Trade Your Way to Financial Freedom'
  },
  {
    category: 'money_management',
    title: 'Expectancy: The Core of Your Trading System',
    titleTr: 'Beklenti: Trading Sisteminizin Özü',
    content: `Expectancy tells you how much you can expect to make on average per dollar risked over many trades. It's calculated as: (Win% × Avg Win) - (Loss% × Avg Loss). A positive expectancy system will make money over time; a negative one will lose money. What matters is not win rate alone, but the relationship between win rate and reward-to-risk ratio. A 30% win rate system can be highly profitable if winners are 4x larger than losers. Conversely, a 70% win rate system can lose money if losers are 3x larger than winners. Always know your system's expectancy before trading it.`,
    contentTr: `Beklenti, birçok işlem üzerinden riske atılan dolar başına ortalama ne kadar kazanmayı bekleyebileceğinizi söyler. Hesaplama: (Kazanç% × Ort. Kazanç) - (Kayıp% × Ort. Kayıp). Pozitif beklentili bir sistem zamanla para kazanır; negatif olan kaybeder. Önemli olan sadece kazanma oranı değil, kazanma oranı ile ödül-risk oranı arasındaki ilişkidir. %30 kazanma oranlı bir sistem, kazananlar kaybedenlerden 4 kat büyükse son derece karlı olabilir. Tersine, %70 kazanma oranlı bir sistem, kaybedenler kazananlardan 3 kat büyükse para kaybedebilir. Trading yapmadan önce her zaman sisteminizin beklentisini bilin.`,
    keyPrinciples: [
      'Expectancy = (Win% × Avg Win) - (Loss% × Avg Loss)',
      'Win rate alone means nothing',
      'Reward:risk ratio is crucial',
      'Low win rate can be profitable',
      'High win rate can lose money'
    ],
    tags: ['expectancy', 'win_rate', 'reward_risk', 'system', 'math'],
    author: 'Van K. Tharp',
    sourceBook: 'Trade Your Way to Financial Freedom'
  },

  // === DISCIPLINE & RULES ===
  {
    category: 'discipline',
    title: 'Trading Rules: Your Edge Requires Consistency',
    titleTr: 'Trading Kuralları: Avantajınız Tutarlılık Gerektirir',
    content: `A trading edge only manifests when applied consistently over time. Breaking your rules even occasionally destroys the statistical validity of your system. If you take trades outside your system, you're not testing your edge - you're gambling. Create a clear, written trading plan with specific entry rules, exit rules, and position sizing rules. Follow them mechanically without exception. When you feel the urge to deviate, that's exactly when you should not. The discipline to follow rules through drawdowns and winning streaks alike is what separates professionals from amateurs. Your rules ARE your edge.`,
    contentTr: `Bir trading avantajı ancak zaman içinde tutarlı bir şekilde uygulandığında ortaya çıkar. Kurallarınızı ara sıra bile ihlal etmek, sisteminizin istatistiksel geçerliliğini yok eder. Sisteminizin dışında işlem yaparsanız, avantajınızı test etmiyorsunuz - kumar oynuyorsunuz. Net, yazılı bir trading planı oluşturun: spesifik giriş kuralları, çıkış kuralları ve pozisyon büyüklüğü kuralları. İstisna olmaksızın bunları mekanik olarak takip edin. Sapma dürtüsü hissettiğinizde, tam da o zaman sapmamalısınız. Düşüşler ve kazanç serileri boyunca kurallara uyma disiplini, profesyonelleri amatörlerden ayıran şeydir. Kurallarınız avantajınızdır.`,
    keyPrinciples: [
      'Edge requires consistent application',
      'Rule breaking destroys statistical validity',
      'Written trading plan is essential',
      'Follow rules mechanically',
      'Discipline through drawdowns and wins'
    ],
    tags: ['discipline', 'rules', 'consistency', 'edge', 'plan'],
    author: 'Various',
    sourceBook: 'Trading Psychology Principles'
  },
  {
    category: 'discipline',
    title: 'Revenge Trading: The Account Killer',
    titleTr: 'Rövanş Tradesi: Hesap Katili',
    content: `After a loss, the urge to immediately "make it back" is one of the most destructive forces in trading. Revenge trading leads to: 1) Larger position sizes to recover faster, 2) Taking suboptimal setups, 3) Abandoning stop losses, 4) Emotional decision making. The solution is simple but not easy: After a losing trade, step away. The market will be there tomorrow. Your edge doesn't disappear because of one loss. In fact, statistically, a loss makes the next trade MORE likely to win (regression to the mean). But only if you wait for a proper setup. The next trade should be smaller, not larger.`,
    contentTr: `Bir kayıptan sonra, hemen "geri kazanma" dürtüsü tradingdeki en yıkıcı güçlerden biridir. Rövanş tradesi şunlara yol açar: 1) Daha hızlı toparlanmak için daha büyük pozisyon büyüklükleri, 2) Optimalin altında setaplar almak, 3) Stop lossları terk etmek, 4) Duygusal karar verme. Çözüm basit ama kolay değil: Kaybeden bir işlemden sonra uzaklaşın. Piyasa yarın da orada olacak. Bir kayıp nedeniyle avantajınız kaybolmaz. Aslında, istatistiksel olarak, bir kayıp sonraki işlemin kazanma olasılığını ARTIRIR (ortalamaya regresyon). Ama sadece uygun bir setup beklerseniz. Sonraki işlem daha büyük değil, daha küçük olmalı.`,
    keyPrinciples: [
      'Step away after losses',
      'Market is always there tomorrow',
      'Next trade should be smaller',
      'Wait for proper setup',
      'Revenge trading compounds losses'
    ],
    tags: ['revenge', 'losses', 'discipline', 'emotions', 'recovery'],
    author: 'Various',
    sourceBook: 'Trading Psychology Principles'
  },

  // === RISK MANAGEMENT ===
  {
    category: 'risk',
    title: 'Risk First, Reward Second',
    titleTr: 'Önce Risk, Sonra Ödül',
    content: `Amateur traders ask "How much can I make?" Professional traders ask "How much can I lose?" This fundamental shift in thinking is what separates survivors from casualties. Before entering any trade, define your exit point for a losing trade (stop loss). Calculate the dollar amount at risk. Ensure it's within your risk parameters (1-2% of account). Only THEN consider the potential reward. If the reward doesn't justify the risk (minimum 1:1, preferably 2:1 or higher), don't take the trade. The best traders are the best risk managers. They protect capital first and let profits take care of themselves.`,
    contentTr: `Amatör traderlar "Ne kadar kazanabilirim?" diye sorar. Profesyonel traderlar "Ne kadar kaybedebilirim?" diye sorar. Bu temel düşünce değişikliği, hayatta kalanları kayıplardan ayıran şeydir. Herhangi bir işleme girmeden önce, kaybeden bir işlem için çıkış noktanızı (stop loss) tanımlayın. Risk altındaki dolar miktarını hesaplayın. Risk parametreleriniz dahilinde olduğundan emin olun (hesabın %1-2'si). Ancak O ZAMAN potansiyel ödülü düşünün. Ödül riski haklı çıkarmıyorsa (minimum 1:1, tercihen 2:1 veya daha yüksek), işlemi almayın. En iyi traderlar en iyi risk yöneticileridir. Önce sermayeyi korurlar ve karların kendi kendilerine hallolmasına izin verirler.`,
    keyPrinciples: [
      'Ask "How much can I lose?" first',
      'Define stop loss before entry',
      'Calculate dollar risk',
      'Require minimum 1:1 reward:risk',
      'Protect capital above profits'
    ],
    tags: ['risk', 'stop_loss', 'reward_risk', 'capital', 'protection'],
    author: 'Various',
    sourceBook: 'Trading Risk Management'
  },
  {
    category: 'risk',
    title: 'Maximum Daily Loss Limit',
    titleTr: 'Maksimum Günlük Kayıp Limiti',
    content: `Setting a maximum daily loss limit is essential for survival. When you hit your limit (typically 2-3% of account or 3 consecutive losses), stop trading for the day. No exceptions. Bad days happen. The difference between professionals and amateurs is that professionals live to trade another day. One bad day can undo weeks of profitable trading if unchecked. The market doesn't know you're having a bad day - it will keep taking your money. Protect yourself from yourself. The stop-loss for your trading day is just as important as the stop-loss for your trades.`,
    contentTr: `Maksimum günlük kayıp limiti belirlemek hayatta kalmak için esastır. Limitinize ulaştığınızda (genellikle hesabın %2-3'ü veya ardışık 3 kayıp), gün için trading yapmayı bırakın. İstisna yok. Kötü günler olur. Profesyoneller ile amatörler arasındaki fark, profesyonellerin başka bir gün trading yapmak için yaşamalarıdır. Kontrol edilmezse kötü bir gün haftalarca karlı ticareti geri alabilir. Piyasa kötü bir gün geçirdiğinizi bilmez - paranızı almaya devam edecektir. Kendinizi kendinizden koruyun. Trading gününüz için stop-loss, işlemleriniz için stop-loss kadar önemlidir.`,
    keyPrinciples: [
      'Set daily loss limit (2-3%)',
      'Stop after 3 consecutive losses',
      'One bad day can undo weeks',
      'Protect yourself from yourself',
      'Live to trade another day'
    ],
    tags: ['daily_limit', 'stop_trading', 'survival', 'discipline', 'protection'],
    author: 'Various',
    sourceBook: 'Trading Risk Management'
  },

  // === EMOTIONAL STATES ===
  {
    category: 'emotions',
    title: 'FOMO: Fear of Missing Out',
    titleTr: 'FOMO: Kaçırma Korkusu',
    content: `FOMO drives traders to chase moves after they've already happened. The fear of missing profits leads to entries at the worst possible times - after the move has extended, with poor risk:reward, and without proper analysis. Remember: The market offers new opportunities every day. Missing one trade means nothing over a career of thousands of trades. The best trades come to those who wait. When you feel FOMO, ask: "Would I take this trade if I hadn't seen the recent move?" If not, you're chasing, not trading. Let FOMO trades pass. There will always be another setup.`,
    contentTr: `FOMO, traderları zaten gerçekleşmiş hareketleri kovalamaya iter. Karları kaçırma korkusu, mümkün olan en kötü zamanlarda girişlere yol açar - hareket uzadıktan sonra, zayıf risk:ödül ile ve uygun analiz olmadan. Unutmayın: Piyasa her gün yeni fırsatlar sunar. Binlerce işlemlik bir kariyer boyunca bir işlemi kaçırmak hiçbir şey ifade etmez. En iyi işlemler bekleyenlere gelir. FOMO hissettiğinizde, sorun: "Son hareketi görmemiş olsam bu işlemi alır mıydım?" Hayırsa, trading yapmıyorsunuz, kovalıyorsunuz. FOMO işlemlerini geçin. Her zaman başka bir setup olacak.`,
    keyPrinciples: [
      'New opportunities come daily',
      'Missing one trade is meaningless',
      'Best trades come to those who wait',
      'Ask: Would I take this without the move?',
      'Chasing is not trading'
    ],
    tags: ['fomo', 'chasing', 'patience', 'emotions', 'discipline'],
    author: 'Various',
    sourceBook: 'Trading Psychology Principles'
  },
  {
    category: 'emotions',
    title: 'Overconfidence After Winning Streaks',
    titleTr: 'Kazanma Serileri Sonrası Aşırı Güven',
    content: `Winning streaks are statistically inevitable and psychologically dangerous. After several wins, traders tend to: 1) Increase position sizes aggressively, 2) Lower their entry standards, 3) Feel invincible and ignore risk. This is exactly when large losses occur. Remember: Winning streaks are followed by losing streaks. Your win rate hasn't permanently improved - you're just seeing the positive side of variance. The solution: Never increase position size after wins. In fact, consider reducing it. Stay humble. Stick to your rules. The market humbles everyone eventually.`,
    contentTr: `Kazanma serileri istatistiksel olarak kaçınılmaz ve psikolojik olarak tehlikelidir. Birkaç kazançtan sonra, traderlar şunları yapma eğilimindedir: 1) Pozisyon büyüklüklerini agresif bir şekilde artırmak, 2) Giriş standartlarını düşürmek, 3) Yenilmez hissetmek ve riski görmezden gelmek. Tam da o zaman büyük kayıplar meydana gelir. Unutmayın: Kazanma serileri, kaybetme serileri tarafından takip edilir. Kazanma oranınız kalıcı olarak iyileşmedi - sadece varyansın pozitif tarafını görüyorsunuz. Çözüm: Kazançlardan sonra asla pozisyon büyüklüğünü artırmayın. Aslında, azaltmayı düşünün. Mütevazı kalın. Kurallarınıza sadık kalın. Piyasa eninde sonunda herkesi tevazu eder.`,
    keyPrinciples: [
      'Winning streaks precede losing streaks',
      'Never increase size after wins',
      'Your win rate hasnt improved',
      'Youre seeing positive variance',
      'Stay humble, follow rules'
    ],
    tags: ['overconfidence', 'winning', 'variance', 'humility', 'position_sizing'],
    author: 'Various',
    sourceBook: 'Trading Psychology Principles'
  },
  {
    category: 'emotions',
    title: 'Managing Trading Anxiety',
    titleTr: 'Trading Anksiyetesini Yönetmek',
    content: `Trading anxiety often stems from: 1) Position size too large, 2) Undefined risk, 3) Trading beyond your skill level, 4) External pressures (needing the money). The solutions: 1) Reduce position size until you're comfortable - if you can't sleep, you're trading too big, 2) Always define your stop loss before entry, 3) Trade smaller and simpler until you're profitable, 4) Only trade with money you can afford to lose. Anxiety is a signal that something is wrong with your approach. Don't ignore it - it's your subconscious telling you the risk is too high.`,
    contentTr: `Trading anksiyetesi genellikle şunlardan kaynaklanır: 1) Pozisyon büyüklüğü çok fazla, 2) Tanımlanmamış risk, 3) Beceri seviyenizin ötesinde trading, 4) Dış baskılar (paraya ihtiyaç duymak). Çözümler: 1) Rahat olana kadar pozisyon büyüklüğünü azaltın - uyuyamıyorsanız, çok büyük işlem yapıyorsunuz, 2) Her zaman girişten önce stop lossunuzu tanımlayın, 3) Karlı olana kadar daha küçük ve basit işlem yapın, 4) Yalnızca kaybetmeyi göze alabileceğiniz parayla işlem yapın. Anksiyete, yaklaşımınızla ilgili bir şeylerin yanlış olduğunun sinyalidir. Görmezden gelmeyin - bilinçaltınız size riskin çok yüksek olduğunu söylüyor.`,
    keyPrinciples: [
      'Anxiety signals something is wrong',
      'Reduce size until comfortable',
      'Define risk before entry',
      'Trade simpler until profitable',
      'Only use money you can lose'
    ],
    tags: ['anxiety', 'stress', 'position_sizing', 'risk', 'comfort'],
    author: 'Various',
    sourceBook: 'Trading Psychology Principles'
  },

  // === ADVANCED CONCEPTS ===
  {
    category: 'psychology',
    title: 'Process Over Outcome',
    titleTr: 'Sonuç Değil Süreç',
    content: `Judge your trading by process quality, not outcome. A winning trade made by breaking your rules is a BAD trade. A losing trade made following your rules perfectly is a GOOD trade. Why? Because your edge only works when applied consistently. Results-oriented thinking leads to reinforcing bad habits when they accidentally work, and abandoning good habits when they occasionally fail. Keep a trading journal that scores each trade on process adherence, not P&L. Over time, perfect process execution will lead to expected results.`,
    contentTr: `Tradinginizi sonuca göre değil, süreç kalitesine göre değerlendirin. Kurallarınızı çiğneyerek yapılan kazanan bir işlem KÖTÜ bir işlemdir. Kurallarınızı mükemmel bir şekilde takip ederek yapılan kaybeden bir işlem İYİ bir işlemdir. Neden? Çünkü avantajınız yalnızca tutarlı bir şekilde uygulandığında işler. Sonuç odaklı düşünce, kötü alışkanlıkları yanlışlıkla işe yaradıklarında pekiştirmeye ve iyi alışkanlıkları ara sıra başarısız olduklarında terk etmeye yol açar. Her işlemi kar/zarar değil, süreç uyumuna göre puanlayan bir trading günlüğü tutun. Zaman içinde, mükemmel süreç yürütme beklenen sonuçlara yol açacaktır.`,
    keyPrinciples: [
      'Winning rule-break is a bad trade',
      'Losing rule-follow is a good trade',
      'Results-oriented thinking is harmful',
      'Score trades by process adherence',
      'Perfect process leads to expected results'
    ],
    tags: ['process', 'outcome', 'journal', 'rules', 'consistency'],
    author: 'Various',
    sourceBook: 'Trading Psychology Principles'
  },
  {
    category: 'money_management',
    title: 'The Power of Compounding',
    titleTr: 'Bileşik Faizin Gücü',
    content: `Small, consistent gains compound into extraordinary results over time. 1% per week = 68% per year. But the math only works if you protect your capital. A 50% loss requires a 100% gain to recover. A 90% loss requires a 900% gain. This asymmetry is why capital preservation matters more than aggressive growth. The fastest way to get rich trading is slowly. Take consistent small gains, protect capital fiercely, and let time do the heavy lifting. Patience and discipline beat aggression and greed every time.`,
    contentTr: `Küçük, tutarlı kazançlar zaman içinde olağanüstü sonuçlara bileşik olur. Haftada %1 = Yılda %68. Ama matematik ancak sermayenizi korursanız işler. %50 kayıp, toparlanmak için %100 kazanç gerektirir. %90 kayıp, %900 kazanç gerektirir. Bu asimetri, sermaye korumanın agresif büyümeden daha önemli olmasının nedenidir. Tradingde zengin olmanın en hızlı yolu yavaş yavaştır. Tutarlı küçük kazançlar alın, sermayeyi şiddetle koruyun ve zamanın ağır işi yapmasına izin verin. Sabır ve disiplin her zaman saldırganlık ve açgözlülüğü yener.`,
    keyPrinciples: [
      '1% weekly = 68% yearly',
      '50% loss needs 100% gain to recover',
      'Capital preservation over growth',
      'Fastest way to get rich is slowly',
      'Patience and discipline beat greed'
    ],
    tags: ['compounding', 'growth', 'capital', 'patience', 'discipline'],
    author: 'Various',
    sourceBook: 'Trading Money Management'
  },
  {
    category: 'discipline',
    title: 'Trading Only Your Best Setups',
    titleTr: 'Sadece En İyi Setuplarınızı Trade Etmek',
    content: `Most traders over-trade. They take B and C grade setups because they're bored or need action. This dilutes their edge. Your best trades - the A+ setups where everything aligns - have the highest probability of success. Every other trade is just noise that drags down your statistics. Wait for your A+ setups. Let the mediocre opportunities pass. Quality over quantity. The market is open every day - you don't need to trade every day. Some of the best trading days involve zero trades.`,
    contentTr: `Çoğu trader aşırı işlem yapar. B ve C sınıfı setuplar alırlar çünkü sıkılırlar veya aksiyona ihtiyaç duyarlar. Bu, avantajlarını sulandırır. En iyi işlemleriniz - her şeyin hizalandığı A+ setuplar - en yüksek başarı olasılığına sahiptir. Diğer her işlem, istatistiklerinizi aşağı çeken gürültüdür. A+ setuplarınızı bekleyin. Vasat fırsatların geçmesine izin verin. Miktar değil kalite. Piyasa her gün açık - her gün işlem yapmanız gerekmiyor. En iyi trading günlerinden bazıları sıfır işlem içerir.`,
    keyPrinciples: [
      'Most traders over-trade',
      'A+ setups have highest probability',
      'B/C grade trades dilute edge',
      'Quality over quantity',
      'Best days may have zero trades'
    ],
    tags: ['overtrading', 'setup_quality', 'patience', 'edge', 'selectivity'],
    author: 'Various',
    sourceBook: 'Trading Discipline Principles'
  }
];

// ============================================================================
// SERVICE FUNCTIONS
// ============================================================================

export async function seedPsychologyArticles(): Promise<number> {
  if (!db) {
    console.log('[PsychologyService] Database not available, using in-memory');
    return 0;
  }

  try {
    const existingCount = await db.select({ count: sql<number>`count(*)` })
      .from(tradingPsychologyArticles);
    
    if (existingCount[0]?.count > 0) {
      console.log(`[PsychologyService] Articles already seeded: ${existingCount[0].count}`);
      // Check if embeddings need to be generated for existing articles
      const withoutEmbeddings = await db.select({ count: sql<number>`count(*)` })
        .from(tradingPsychologyArticles)
        .where(sql`embedding IS NULL`);
      
      if (withoutEmbeddings[0]?.count > 0) {
        console.log(`[PsychologyService] ${withoutEmbeddings[0].count} articles need embeddings, generating...`);
        await generateArticleEmbeddings();
      }
      return existingCount[0].count;
    }

    console.log('[PsychologyService] Seeding psychology articles...');
    let seeded = 0;

    for (const article of PSYCHOLOGY_ARTICLES) {
      const id = uuidv4();
      
      await db.insert(tradingPsychologyArticles).values({
        id,
        category: article.category,
        title: article.title,
        titleTr: article.titleTr,
        content: article.content,
        contentTr: article.contentTr,
        keyPrinciples: article.keyPrinciples,
        tags: article.tags,
        author: article.author,
        sourceBook: article.sourceBook,
      });
      
      seeded++;
    }

    console.log(`[PsychologyService] Seeded ${seeded} articles`);
    
    // Generate embeddings for newly seeded articles
    console.log('[PsychologyService] Generating embeddings for seeded articles...');
    await generateArticleEmbeddings();
    
    return seeded;
  } catch (error) {
    console.error('[PsychologyService] Seeding error:', error);
    return 0;
  }
}

export async function generateArticleEmbeddings(): Promise<number> {
  if (!db) return 0;

  try {
    const articles = await db.select()
      .from(tradingPsychologyArticles)
      .where(sql`embedding IS NULL`);

    console.log(`[PsychologyService] Generating embeddings for ${articles.length} articles`);
    let generated = 0;

    for (const article of articles) {
      try {
        const textForEmbedding = `${article.title}. ${article.content}. Tags: ${(article.tags as string[] || []).join(', ')}`;
        const embedding = await generateEmbedding(textForEmbedding);

        if (embedding.length > 0) {
          let embeddingTr: number[] = [];
          if (article.contentTr) {
            const textForEmbeddingTr = `${article.titleTr}. ${article.contentTr}`;
            embeddingTr = await generateEmbedding(textForEmbeddingTr);
          }

          await db.update(tradingPsychologyArticles)
            .set({ 
              embedding, 
              embeddingTr: embeddingTr.length > 0 ? embeddingTr : null,
              updatedAt: new Date() 
            })
            .where(eq(tradingPsychologyArticles.id, article.id));

          generated++;
        }
      } catch (e) {
        console.error(`[PsychologyService] Embedding error for ${article.id}:`, e);
      }
    }

    console.log(`[PsychologyService] Generated ${generated} embeddings`);
    return generated;
  } catch (error) {
    console.error('[PsychologyService] Embedding generation error:', error);
    return 0;
  }
}

export interface ArticleMatch {
  article: TradingPsychologyArticle;
  score: number;
  matchReason: string;
}

export async function searchArticlesByContext(
  context: string,
  options: {
    category?: string;
    limit?: number;
    minScore?: number;
    useTurkish?: boolean;
  } = {}
): Promise<ArticleMatch[]> {
  const { category, limit = 3, minScore = 0.3, useTurkish = true } = options;

  if (!db) {
    return searchArticlesInMemory(context, { category, limit, minScore, useTurkish });
  }

  try {
    const queryEmbedding = await generateEmbedding(context);
    if (queryEmbedding.length === 0) {
      return searchArticlesInMemory(context, { category, limit, minScore, useTurkish });
    }

    let articles = await db.select()
      .from(tradingPsychologyArticles)
      .where(category ? eq(tradingPsychologyArticles.category, category) : sql`1=1`);

    // Filter to articles that have valid embeddings
    const articlesWithEmbeddings = articles.filter(a => {
      const hasEmbedding = a.embedding && Array.isArray(a.embedding) && (a.embedding as number[]).length > 0;
      const hasEmbeddingTr = a.embeddingTr && Array.isArray(a.embeddingTr) && (a.embeddingTr as number[]).length > 0;
      return hasEmbedding || hasEmbeddingTr;
    });

    // If no articles have embeddings, fall back to in-memory keyword search
    if (articlesWithEmbeddings.length === 0) {
      console.log('[PsychologyService] No embeddings found, using keyword fallback');
      return searchArticlesInMemory(context, { category, limit, minScore, useTurkish });
    }

    const scored = articlesWithEmbeddings
      .map(article => {
        let score = 0;
        if (useTurkish && article.embeddingTr) {
          const similarity = cosineSimilarity(queryEmbedding, article.embeddingTr as number[]);
          if (!isNaN(similarity)) score = Math.max(score, similarity);
        }
        if (article.embedding) {
          const similarity = cosineSimilarity(queryEmbedding, article.embedding as number[]);
          if (!isNaN(similarity)) score = Math.max(score, similarity);
        }
        return { article, score };
      })
      .filter(r => !isNaN(r.score) && r.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    // If semantic search found no good matches, try keyword fallback
    if (scored.length === 0) {
      console.log('[PsychologyService] No semantic matches, using keyword fallback');
      return searchArticlesInMemory(context, { category, limit, minScore: 0.1, useTurkish });
    }

    return scored.map(({ article, score }) => ({
      article,
      score,
      matchReason: generateMatchReason(score, article.category, article.tags as string[])
    }));
  } catch (error) {
    console.error('[PsychologyService] Search error:', error);
    return searchArticlesInMemory(context, { category, limit, minScore, useTurkish });
  }
}

function searchArticlesInMemory(
  context: string,
  options: { category?: string; limit?: number; minScore?: number; useTurkish?: boolean }
): ArticleMatch[] {
  const { category, limit = 3, useTurkish = true } = options;
  const contextLower = context.toLowerCase();

  const scored = PSYCHOLOGY_ARTICLES
    .filter(a => !category || a.category === category)
    .map(article => {
      let score = 0;
      const tags = article.tags as string[] || [];
      const content = useTurkish && article.contentTr 
        ? article.contentTr.toLowerCase() 
        : article.content.toLowerCase();
      const title = useTurkish && article.titleTr 
        ? article.titleTr.toLowerCase() 
        : article.title.toLowerCase();

      for (const tag of tags) {
        if (contextLower.includes(tag)) score += 0.2;
      }

      if (title.split(' ').some(word => contextLower.includes(word))) score += 0.15;
      if (content.split(' ').filter(w => w.length > 4).some(word => contextLower.includes(word))) score += 0.1;

      return { 
        article: { ...article, id: uuidv4() } as TradingPsychologyArticle, 
        score: Math.min(1, score) 
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored.map(({ article, score }) => ({
    article,
    score,
    matchReason: generateMatchReason(score, article.category, article.tags as string[])
  }));
}

function generateMatchReason(score: number, category: string, tags: string[]): string {
  const categoryNames: Record<string, string> = {
    psychology: 'Psikoloji',
    money_management: 'Para Yönetimi',
    risk: 'Risk Yönetimi',
    discipline: 'Disiplin',
    emotions: 'Duygusal Kontrol'
  };

  const strength = score >= 0.7 ? 'Yüksek' : score >= 0.5 ? 'Orta' : 'Temel';
  return `${strength} eşleşme - ${categoryNames[category] || category} (${tags.slice(0, 2).join(', ')})`;
}

export async function getArticleForTradingContext(
  contextType: 'losing_streak' | 'winning_streak' | 'fomo' | 'revenge_trading' | 'high_volatility' | 'anxiety' | 'overtrading' | 'general',
  emotionalState?: string
): Promise<ArticleMatch[]> {
  const contextQueries: Record<string, string> = {
    losing_streak: 'kaybetme serisi kayıp olasılık kabul disiplin sabır',
    winning_streak: 'kazanma serisi aşırı güven pozisyon büyüklüğü tevazu',
    fomo: 'kaçırma korkusu FOMO kovalamak sabır beklemek',
    revenge_trading: 'rövanş trade kayıp geri alma intikam duygusal',
    high_volatility: 'yüksek volatilite risk pozisyon büyüklüğü koruma',
    anxiety: 'anksiyete stres korku risk pozisyon büyüklüğü',
    overtrading: 'aşırı trade setup kalite sabır seçicilik',
    general: 'trading psikoloji para yönetimi disiplin'
  };

  const query = emotionalState 
    ? `${contextQueries[contextType]} ${emotionalState}`
    : contextQueries[contextType];

  return searchArticlesByContext(query, { limit: 2, useTurkish: true });
}

export async function incrementArticleUsage(articleId: string): Promise<void> {
  if (!db) return;

  try {
    await db.update(tradingPsychologyArticles)
      .set({ 
        usageCount: sql`${tradingPsychologyArticles.usageCount} + 1`,
        updatedAt: new Date()
      })
      .where(eq(tradingPsychologyArticles.id, articleId));
  } catch (error) {
    console.error('[PsychologyService] Usage increment error:', error);
  }
}

export async function getAllArticles(): Promise<TradingPsychologyArticle[]> {
  if (!db) {
    return PSYCHOLOGY_ARTICLES.map(a => ({ ...a, id: uuidv4() } as TradingPsychologyArticle));
  }

  try {
    return await db.select()
      .from(tradingPsychologyArticles)
      .orderBy(desc(tradingPsychologyArticles.usageCount));
  } catch (error) {
    console.error('[PsychologyService] Get all error:', error);
    return [];
  }
}

export async function getArticlesByCategory(category: string): Promise<TradingPsychologyArticle[]> {
  if (!db) {
    return PSYCHOLOGY_ARTICLES
      .filter(a => a.category === category)
      .map(a => ({ ...a, id: uuidv4() } as TradingPsychologyArticle));
  }

  try {
    return await db.select()
      .from(tradingPsychologyArticles)
      .where(eq(tradingPsychologyArticles.category, category))
      .orderBy(desc(tradingPsychologyArticles.usageCount));
  } catch (error) {
    console.error('[PsychologyService] Get by category error:', error);
    return [];
  }
}

export const psychologyEmbeddingService = {
  seedArticles: seedPsychologyArticles,
  generateEmbeddings: generateArticleEmbeddings,
  searchByContext: searchArticlesByContext,
  getForTradingContext: getArticleForTradingContext,
  incrementUsage: incrementArticleUsage,
  getAllArticles,
  getArticlesByCategory,
  BUILT_IN_ARTICLES: PSYCHOLOGY_ARTICLES
};
