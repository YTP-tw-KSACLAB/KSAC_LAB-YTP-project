import React, { createContext, useContext, useState } from 'react';

// ─── Translation dictionary ───────────────────────────────────────────────────
const TRANSLATIONS = {
  en: {
    // Nav
    home: 'Home',
    planner: 'Planner',
    navigation: 'Navigation',
    reels: 'Reels',
    messages: 'Messages',
    notifications: 'Notifications',
    profile: 'Profile',
    loginSignUp: 'Login / Sign Up',
    // Auth
    signUp: 'Sign Up',
    logIn: 'Log In',
    username: 'Username',
    email: 'Email',
    register: 'Register',
    login: 'Login',
    switchToLogin: 'Switch to Login',
    switchToSignUp: 'Switch to Sign Up',
    // Right rail
    aiSuggestedRoutes: '✨ AI Suggested Routes',
    topHotRoutes: '🔥 Top Hot Routes from Friends',
    savedTimes: 'Saved',
    times: 'times',
    online: 'Online',
    notLoggedIn: 'Not logged in',
    // Planner stages
    ideation: 'Ideation',
    curation: 'Curation',
    nav: 'Navigation',
    checkout: 'Checkout',
    // Planner ideation
    whereNext: "Where's your next adventure?",
    describeTrip: 'Describe your dream trip in Taipei. Gemini will rank the best spots for you.',
    chatPlaceholder: "Tell Gemini your vibe... e.g. 'I want to explore historic temples, eat the best stinky tofu, and find a quiet tea house with a view.'",
    generateTrip: 'Generate Trip ✨',
    // Planner curation
    geminiTopPicks: "Gemini's Top Picks",
    rankedByVibe: 'Ranked by your vibe',
    discoverMore: 'Discover More Spots',
    searchPlaceholder: 'Search for a specific place or area...',
    myItineraryCart: '🎒 My Itinerary Cart',
    dropLocations: 'Drop locations here to build your trip.',
    bagEmpty: 'Your bag is empty',
    dragToStart: 'Drag spots here to start',
    optimizeRoute: 'Optimize Route with AI ✨',
    // Planner navigation
    stops: 'stops',
    minTransit: 'min transit',
    total: 'total',
    offlinePlan: '⚡ Offline plan',
    travelTips: '⚠️ Travel Tips',
    toNextStop: 'to next stop',
    straightLine: '↗ straight line',
    // Planner checkout
    securingExperience: 'Securing your premium experience...',
    hotel: 'Hotel',
    transport: 'Transport',
    tickets: 'Tickets',
    confirmed: '● CONFIRMED',
    reserving: '○ RESERVING...',
    // Planner success
    allSet: "You're all set!",
    adventureSecured: 'Your Taipei adventure has been secured and sent to your digital wallet.',
    confirmationNumber: 'Confirmation Number',
    itinerarySize: 'Itinerary Size',
    locations: 'Locations',
    stay: 'Stay',
    mobilityPackage: 'Mobility Package',
    planNewAdventure: 'Plan New Adventure',
    shareItinerary: 'Share Itinerary',
    confirmBook: 'Confirm & Book Trip 🚀',
    editSpots: 'Edit Spots',
    exportPdf: 'Export PDF',
    // Checkout - points
    useSnapPoints: 'Use SnapPoints',
    available: 'available',
    apply: 'Apply',
    applied: 'Applied',
    discountApplied: '✨ 10% Discount applied! (-100 points)',
    earnedPoints: '💎 You earned 50 SnapPoints for booking!',
    // Messages
    askMeToplan: 'Ask me to plan a route or recommend a spot!',
    agentTyping: 'Agent is typing...',
    // Safety
    verifyLegal: 'Verify legal accommodation before booking.',
    // Metrics
    scenicData: 'Scenic Spots',
    legalHotels: 'Legal Hotels',
    legalHostels: 'Legal Hostels',
    busStops: 'Bus Stops',
    // Lang switcher
    language: 'Language',
  },

  zh: {
    home: '首頁',
    planner: '行程規劃',
    navigation: '導航',
    reels: '短片',
    messages: '訊息',
    notifications: '通知',
    profile: '個人資料',
    loginSignUp: '登入 / 註冊',
    signUp: '註冊',
    logIn: '登入',
    username: '使用者名稱',
    email: '電子郵件',
    register: '註冊',
    login: '登入',
    switchToLogin: '切換至登入',
    switchToSignUp: '切換至註冊',
    aiSuggestedRoutes: '✨ AI 推薦路線',
    topHotRoutes: '🔥 好友熱門路線',
    savedTimes: '已收藏',
    times: '次',
    online: '線上',
    notLoggedIn: '尚未登入',
    ideation: '構想',
    curation: '精選',
    nav: '導航',
    checkout: '結帳',
    whereNext: '下一站去哪裡？',
    describeTrip: '描述你的台北夢幻之旅，Gemini 將為你排名最佳景點。',
    chatPlaceholder: '告訴 Gemini 你的心情… 例如：「我想探索古老廟宇、品嚐最棒的臭豆腐，並找一間有景觀的靜謐茶館。」',
    generateTrip: '生成行程 ✨',
    geminiTopPicks: 'Gemini 精選推薦',
    rankedByVibe: '依你的心情排名',
    discoverMore: '探索更多景點',
    searchPlaceholder: '搜尋特定地點或區域...',
    myItineraryCart: '🎒 我的行程清單',
    dropLocations: '將地點拖曳至此以規劃行程。',
    bagEmpty: '清單是空的',
    dragToStart: '將景點拖曳至此開始',
    optimizeRoute: '用 AI 最佳化路線 ✨',
    stops: '個景點',
    minTransit: '分鐘交通',
    total: '總計',
    offlinePlan: '⚡ 離線方案',
    travelTips: '⚠️ 旅遊提示',
    toNextStop: '至下一站',
    straightLine: '↗ 直線距離',
    securingExperience: '正在確認您的高級體驗...',
    hotel: '飯店',
    transport: '交通',
    tickets: '票券',
    confirmed: '● 已確認',
    reserving: '○ 預訂中...',
    allSet: '一切就緒！',
    adventureSecured: '您的台北冒險之旅已確認，並已傳送至您的數位錢包。',
    confirmationNumber: '確認號碼',
    itinerarySize: '行程大小',
    locations: '個地點',
    stay: '住宿',
    mobilityPackage: '交通方案',
    planNewAdventure: '規劃新冒險',
    shareItinerary: '分享行程',
    confirmBook: '確認訂購 🚀',
    editSpots: '編輯景點',
    exportPdf: '匯出 PDF',
    useSnapPoints: '使用 SnapPoints',
    available: '可用',
    apply: '套用',
    applied: '已套用',
    discountApplied: '✨ 已套用 10% 折扣！（-100 點）',
    earnedPoints: '💎 您因訂購獲得 50 SnapPoints！',
    askMeToplan: '請我規劃路線或推薦景點！',
    agentTyping: '助理正在輸入...',
    verifyLegal: '訂購前請確認合法住宿。',
    scenicData: '景點資料',
    legalHotels: '合法旅館',
    legalHostels: '合法民宿',
    busStops: '公車站牌',
    language: '語言',
  },

  ja: {
    home: 'ホーム',
    planner: '旅程プランナー',
    navigation: 'ナビゲーション',
    reels: 'リール',
    messages: 'メッセージ',
    notifications: '通知',
    profile: 'プロフィール',
    loginSignUp: 'ログイン / 新規登録',
    signUp: '新規登録',
    logIn: 'ログイン',
    username: 'ユーザー名',
    email: 'メールアドレス',
    register: '登録',
    login: 'ログイン',
    switchToLogin: 'ログインに切り替え',
    switchToSignUp: '新規登録に切り替え',
    aiSuggestedRoutes: '✨ AIおすすめルート',
    topHotRoutes: '🔥 フレンドの人気ルート',
    savedTimes: '保存数',
    times: '回',
    online: 'オンライン',
    notLoggedIn: '未ログイン',
    ideation: 'アイデア',
    curation: '厳選',
    nav: 'ナビ',
    checkout: '予約',
    whereNext: '次の冒険はどこへ？',
    describeTrip: '台北での夢の旅を教えてください。Geminiが最高のスポットをランキングします。',
    chatPlaceholder: 'Geminiにあなたの気分を伝えて…例：「歴史ある寺院を探索し、臭豆腐を味わい、景色のいい静かなお茶屋さんを見つけたい。」',
    generateTrip: '旅程を生成 ✨',
    geminiTopPicks: 'Geminiのおすすめ',
    rankedByVibe: 'あなたの気分に合わせたランキング',
    discoverMore: 'もっとスポットを探す',
    searchPlaceholder: '特定の場所やエリアを検索...',
    myItineraryCart: '🎒 旅程カート',
    dropLocations: 'ここに場所をドロップして旅程を作成。',
    bagEmpty: 'カートは空です',
    dragToStart: 'スポットをドラッグして始める',
    optimizeRoute: 'AIでルートを最適化 ✨',
    stops: 'スポット',
    minTransit: '分の移動',
    total: '合計',
    offlinePlan: '⚡ オフラインプラン',
    travelTips: '⚠️ 旅行のヒント',
    toNextStop: '次のスポットまで',
    straightLine: '↗ 直線距離',
    securingExperience: 'プレミアム体験を確保中...',
    hotel: 'ホテル',
    transport: '交通',
    tickets: 'チケット',
    confirmed: '● 確認済み',
    reserving: '○ 予約中...',
    allSet: '準備完了！',
    adventureSecured: '台北での冒険が確定し、デジタルウォレットに送信されました。',
    confirmationNumber: '確認番号',
    itinerarySize: '旅程の規模',
    locations: 'か所',
    stay: '宿泊',
    mobilityPackage: '移動パッケージ',
    planNewAdventure: '新しい冒険を計画',
    shareItinerary: '旅程をシェア',
    confirmBook: '確認して予約 🚀',
    editSpots: 'スポットを編集',
    exportPdf: 'PDFに書き出し',
    useSnapPoints: 'SnapPointsを使用',
    available: '利用可能',
    apply: '適用',
    applied: '適用済み',
    discountApplied: '✨ 10%割引適用！（-100ポイント）',
    earnedPoints: '💎 予約で50 SnapPointsを獲得！',
    askMeToplan: 'ルートの計画やスポットの推薦をお気軽に！',
    agentTyping: 'エージェントが入力中...',
    verifyLegal: '予約前に合法的な宿泊施設をご確認ください。',
    scenicData: '観光スポット',
    legalHotels: '合法ホテル',
    legalHostels: '合法民泊',
    busStops: 'バス停',
    language: '言語',
  },
};

// ─── Context ──────────────────────────────────────────────────────────────────
const LangContext = createContext();

export function LangProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('snaptravel_lang') || 'en');

  const t = (key) => TRANSLATIONS[lang]?.[key] ?? TRANSLATIONS.en[key] ?? key;

  const switchLang = (code) => {
    setLang(code);
    localStorage.setItem('snaptravel_lang', code);
  };

  return (
    <LangContext.Provider value={{ lang, switchLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export const useLang = () => useContext(LangContext);

// ─── Language switcher widget ─────────────────────────────────────────────────
export function LangSwitcher() {
  const { lang, switchLang } = useLang();
  const LANGS = [
    { code: 'en', label: 'EN', full: 'English' },
    { code: 'zh', label: '中',  full: '繁體中文' },
    { code: 'ja', label: '日',  full: '日本語' },
  ];

  return (
    <div style={{ display: 'flex', gap: '4px', padding: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)' }}>
      {LANGS.map(({ code, label, full }) => (
        <button
          key={code}
          title={full}
          onClick={() => switchLang(code)}
          style={{
            padding: '4px 10px', borderRadius: '16px', border: 'none', cursor: 'pointer',
            fontSize: '0.75rem', fontWeight: '700', transition: 'all 0.2s',
            background: lang === code ? 'var(--primary)' : 'transparent',
            color: lang === code ? '#fff' : 'var(--text-muted)',
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
