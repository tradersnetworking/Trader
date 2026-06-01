/** Locale overrides merged onto English base — invest portal only */

const sharedNav = (labels) => ({
  overview: labels.dashboard,
  dashboard: labels.dashboard,
  plans: labels.plans,
  investments: labels.investments || labels.plans,
  money: labels.money,
  transactions: labels.transactions || labels.money,
  referral: labels.referral,
  support: labels.support || labels.money,
  notifications: labels.notifications || labels.dashboard,
  kyc: labels.kyc || "KYC",
  deposit: labels.deposit,
  withdraw: labels.withdraw,
  treasury: labels.treasury || labels.dashboard,
});

export const hi = {
  nav: {
    overview: "डैशबोर्ड", dashboard: "डैशबोर्ड", plans: "निवेश योजनाएँ", investments: "मेरे निवेश",
    money: "मनी हब", transactions: "लेनदेन", referral: "रेफरल", support: "सहायता", notifications: "सूचनाएँ",
    kyc: "KYC और खाते", profile: "प्रोफ़ाइल", ledger: "लेजर", agreements: "अनुबंध",
    deposits: "जमा", payouts: "निकासी", settings: "सेटिंग्स", treasury: "कोषागार",
  },
  navShort: { overview: "होम", money: "पैसा", investments: "निवेश", plans: "योजना", kyc: "KYC" },
  dashboard: {
    balance: "शेष", dueToday: "आज देय", invested: "निवेशित", adminRole: "एडमिन",
    investorRole: "निवेशक", superAdmin: "सुपर एडमिन", notifications: "सूचनाएँ", logout: "लॉग आउट",
    collapseSidebar: "संक्षिप्त", expandSidebar: "विस्तार",
  },
  home: {
    viewPlans: "योजनाएँ देखें", startInvesting: "निवेश शुरू करें",
    heroBadge: "स्मार्ट निवेश · सुरक्षित भविष्य",
    investNow: "अभी निवेश करें →", signIn: "साइन इन",
    goToDashboard: "डैशबोर्ड पर जाएँ →",
    trustCta: "आज निवेश करें · मासिक कमाएँ · भविष्य बनाएँ — सब ₹ INR में",
    startInvestingNow: "अभी निवेश शुरू करें",
    trustedPartners: "विश्वसनीय साझेदार",
    partnersSubtitle: "कंपनियाँ और संस्थान जिनके साथ हम काम करते हैं",
    plansBadge: "निवेश योजनाएँ", loadingPlans: "योजनाएँ लोड हो रही हैं…",
  },
  layout: { plans: "योजनाएँ", calculator: "कैलकुलेटर", dashboard: "डैशबोर्ड", logout: "लॉग आउट", login: "लॉगिन", investNow: "अभी निवेश करें" },
  register: {
    title: "निवेशक खाता बनाएँ", subtitle: "Akshaya Exim Invest में शामिल हों — केवल INR, 42 संरचित योजनाएँ",
    stepVerify: "ईमेल सत्यापित करें", stepDetails: "आपका विवरण", stepAgreements: "अनुबंध",
    stepOf: "चरण {n} / {total}: {name}", sendOtp: "सत्यापन कोड भेजें", verifyContinue: "सत्यापित करें और आगे बढ़ें",
    resendCode: "कोड पुनः भेजें", back: "वापस", createAccount: "खाता बनाएँ", creating: "खाता बन रहा है…",
    alreadyHave: "पहले से खाता है?", referralOptional: "रेफरल कोड (वैकल्पिक)",
    eSign: "ई-हस्ताक्षर", eSignHint: "अनुबंध की पुष्टि के लिए माउस या टच से हस्ताक्षर करें।",
  },
  cookie: { message: "हम आपको साइन इन रखने और प्राथमिकताएँ याद रखने के लिए आवश्यक कुकीज़ का उपयोग करते हैं।", learnMore: "कुकी नीति", accept: "स्वीकार करें" },
  onboarding: { continue: "जारी रखें", finish: "सेटअप पूरा करें" },
  landing: {
    trustKyc: "KYC सत्यापित निवेशक", trustAgreements: "हस्ताक्षरित अनुबंध",
    trustPayouts: "एडमिन-अनुमोदित भुगतान", trustLedger: "पारदर्शी लेजर",
    statMonthlyRoi: "मासिक ROI", statAnnualRoi: "वार्षिक ROI", statPlans: "निवेश योजनाएँ", statCapital: "पूंजी सुरक्षित",
  },
  plan: { subscribe: "अभी निवेश करें", monthlyRoi: "मासिक ROI", annualRoi: "वार्षिक ROI" },
  achievements: {
    title: "उपलब्धियाँ", unlocked: "{count} अनलॉक", totalInvested: "कुल निवेश",
    nextMilestones: "अगले लक्ष्य", tapToShare: "शेयर करने के लिए टैप करें →",
    noBadges: "अभी कोई बैज नहीं", noBadgesHint: "उपलब्धियाँ अनलॉक करने के लिए पहला निवेश करें।",
    shareTitle: "उपलब्धि साझा करें", downloadPng: "PNG डाउनलोड", topReferrers: "शीर्ष रेफरर",
  },
  certificate: {
    download: "प्रमाणपत्र डाउनलोड", printPdf: "प्रिंट / PDF सहेजें",
    verifyTitle: "प्रमाणपत्र सत्यापन", authentic: "प्रामाणिक प्रमाणपत्र",
    missingToken: "प्रमाणपत्र टोकन गायब है।", verifying: "सत्यापित हो रहा है…",
  },
  money: { deposit: "पैसे जोड़ें", withdraw: "निकासी", bankTransfer: "बैंक ट्रांसफर", paymentGateway: "पेमेंट गेटवे" },
  earlyExit: {
    title: "समय से पहले निकासी", subtitle: "लॉक-इन समाप्त होने से पहले निकासी। नीति के अनुसार जुर्माना लागू।",
    principal: "मूलधन", penalty: "जुर्माना", roiForfeit: "ROI जब्त", netCredit: "वॉलेट में शुद्ध राशि",
    request: "समय से पहले निकासी की पुष्टि करें",
    confirmMsg: "इस निवेश से बाहर निकलें? जुर्माना {penalty} लागू होगा। वॉलेट में शुद्ध राशि: {net}। यह पूर्ववत नहीं हो सकता।",
  },
  financial: {
    title: "वित्तीय रिपोर्ट", tabOverview: "अवलोकन", tabReports: "P&L और ट्रायल बैलेंस",
    loading: "वित्तीय रिपोर्ट लोड हो रही है…", loadingTreasury: "कोषागार लोड हो रहा है…",
    reconcile: "सुलह चलाएँ", depositsApproved: "जमा (स्वीकृत)", payoutsReleased: "निकासी (जारी)",
    plTitle: "लाभ और हानि (लेजर-आधारित)", trialBalance: "ट्रायल बैलेंस (लेजर प्रकार)",
  },
  common: { loading: "लोड हो रहा है…", save: "सहेजें", submit: "जमा करें", cancel: "रद्द करें" },
  auth: {
    investorLogin: "निवेशक लॉगिन", staffLogin: "स्टाफ / एडमिन लॉगिन", login: "लॉगिन",
    email: "ईमेल", password: "पासवर्ड", register: "पंजीकरण", passkeyLogin: "पासकी से साइन इन",
    forgotPassword: "पासवर्ड भूल गए?", signingIn: "साइन इन हो रहा है…", backToHome: "← होम पर वापस",
    welcomeInvest: "Akshaya Invest में वापस स्वागत है",
  },
};

export const bn = {
  nav: sharedNav({
    dashboard: "ড্যাশবোর্ড", plans: "বিনিয়োগ পরিকল্পনা", money: "মানি হাব", referral: "রেফারেল",
    deposit: "টাকা জমা", withdraw: "উত্তোলন", investments: "আমার বিনিয়োগ", transactions: "লেনদেন",
  }),
  layout: { plans: "পরিকল্পনা", calculator: "ক্যালকুলেটর", dashboard: "ড্যাশবোর্ড", logout: "লগ আউট", login: "লগইন", investNow: "এখনই বিনিয়োগ" },
  dashboard: { balance: "ব্যালেন্স", dueToday: "আজ প্রদেয়", invested: "বিনিয়োগ", logout: "লগ আউট", notifications: "বিজ্ঞপ্তি" },
  auth: { investorLogin: "বিনিয়োগকারী লগইন", login: "লগইন", email: "ইমেইল", password: "পাসওয়ার্ড", register: "নিবন্ধন", passkeyLogin: "পাসকি দিয়ে সাইন ইন", backToHome: "← হোমে ফিরুন" },
  register: { title: "বিনিয়োগকারী অ্যাকাউন্ট তৈরি", subtitle: "Akshaya Exim Invest — INR, ৪২ পরিকল্পনা", createAccount: "অ্যাকাউন্ট তৈরি", creating: "তৈরি হচ্ছে…", back: "পিছনে", alreadyHave: "ইতিমধ্যে অ্যাকাউন্ট আছে?" },
  cookie: { message: "সাইন ইন রাখতে আমরা প্রয়োজনীয় কুকি ব্যবহার করি।", learnMore: "কুকি নীতি", accept: "গ্রহণ" },
  onboarding: { continue: "চালিয়ে যান" },
  plan: { subscribe: "এখনই বিনিয়োগ", monthlyRoi: "মাসিক ROI" },
  achievements: {
    title: "অর্জন", unlocked: "{count} আনলক", totalInvested: "মোট বিনিয়োগ", nextMilestones: "পরবর্তী লক্ষ্য",
    tapToShare: "শেয়ার করতে ট্যাপ →", noBadges: "এখনও ব্যাজ নেই", noBadgesHint: "অর্জন আনলক করতে প্রথম বিনিয়োগ করুন।",
    topReferrers: "শীর্ষ রেফারার",
  },
  certificate: { verifyTitle: "সার্টিফিকেট যাচাই", missingToken: "সার্টিফিকেট টোকেন নেই।", verifying: "যাচাই হচ্ছে…", download: "ডাউনলোড" },
  money: { deposit: "টাকা জমা", withdraw: "উত্তোলন", bankTransfer: "ব্যাংক ট্রান্সফার" },
  earlyExit: { title: "আগাম প্রস্থান", principal: "মূলধন", penalty: "জরিমানা", netCredit: "নেট ক্রেডিট", request: "আগাম প্রস্থান নিশ্চিত" },
  financial: { title: "আর্থিক প্রতিবেদন", tabOverview: "সারসংক্ষেপ", tabReports: "P&L ও ট্রায়াল ব্যালেন্স", loading: "লোড হচ্ছে…" },
  common: { loading: "লোড হচ্ছে…", save: "সংরক্ষণ", cancel: "বাতিল" },
};

export const te = {
  nav: sharedNav({
    dashboard: "డాష్‌బోర్డ్", plans: "పెట్టుబడి ప్లాన్లు", money: "మనీ హబ్", referral: "రెఫరల్",
    deposit: "ఫండ్ జోడించు", withdraw: "ఉపసంహరణ", investments: "నా పెట్టుబడులు", transactions: "లావాదేవీలు",
  }),
  layout: { plans: "ప్లాన్లు", calculator: "కాలిక్యులేటర్", dashboard: "డాష్‌బోర్డ్", logout: "లాగ్ అవుట్", login: "లాగిన్", investNow: "ఇప్పుడు పెట్టుబడి" },
  dashboard: { balance: "బ్యాలెన్స్", dueToday: "ఈరోజు చెల్లించాలి", invested: "పెట్టుబడి", logout: "లాగ్ అవుట్", notifications: "నోటిఫికేషన్లు" },
  auth: { investorLogin: "పెట్టుబడిదారు లాగిన్", login: "లాగిన్", email: "ఇమెయిల్", password: "పాస్‌వర్డ్", register: "నమోదు", passkeyLogin: "పాస్‌కీతో సైన్ ఇన్", backToHome: "← హోమ్‌కు" },
  register: { title: "పెట్టుబడిదారు ఖాతా", subtitle: "Akshaya Exim Invest — INR, 42 ప్లాన్లు", createAccount: "ఖాతా సృష్టించు", creating: "సృష్టిస్తోంది…", back: "వెనక్కి", alreadyHave: "ఇప్పటికే ఖాతా ఉందా?" },
  cookie: { message: "సైన్ ఇన్ కోసం అవసరమైన కుకీలు ఉపయోగిస్తాము.", learnMore: "కుకీ విధానం", accept: "అంగీకరించు" },
  onboarding: { continue: "కొనసాగించు" },
  plan: { subscribe: "ఇప్పుడు పెట్టుబడి", monthlyRoi: "నెలవారీ ROI" },
  achievements: {
    title: "సాధనలు", unlocked: "{count} అన్‌లాక్", totalInvested: "మొత్తం పెట్టుబడి", nextMilestones: "తదుపరి లక్ష్యాలు",
    tapToShare: "షేర్ చేయడానికి ట్యాప్ →", noBadges: "ఇంకా బ్యాడ్జ్‌లు లేవు", noBadgesHint: "మొదటి పెట్టుబడితో సాధనలు అన్‌లాక్ చేయండి.",
    topReferrers: "టాప్ రెఫరర్లు",
  },
  certificate: { verifyTitle: "సర్టిఫికేట్ ధృవీకరణ", missingToken: "సర్టిఫికేట్ టోకెన్ లేదు.", verifying: "ధృవీకరిస్తోంది…", download: "డౌన్‌లోడ్" },
  money: { deposit: "ఫండ్ జోడించు", withdraw: "ఉపసంహరణ", bankTransfer: "బ్యాంక్ బదిలీ" },
  earlyExit: { title: "ముందస్తు నిష్క్రమణ", principal: "అసలు", penalty: "జరిమానా", netCredit: "నెట్ క్రెడిట్", request: "ముందస్తు నిష్క్రమణ నిర్ధారించు" },
  financial: { title: "ఆర్థిక నివేదికలు", tabOverview: "అవలోకనం", tabReports: "P&L & ట్రయల్ బ్యాలెన్స్", loading: "లోడ్ అవుతోంది…" },
  common: { loading: "లోడ్ అవుతోంది…", save: "సేవ్", cancel: "రద్దు" },
};

export const ta = {
  nav: sharedNav({
    dashboard: "டாஷ்போர்டு", plans: "முதலீட்டு திட்டங்கள்", money: "மனி ஹப்", referral: "பரிந்துரை",
    deposit: "நிதி சேர்", withdraw: "திரும்பப் பெற", investments: "என் முதலீடுகள்", transactions: "பரிவர்த்தனைகள்",
  }),
  layout: { plans: "திட்டங்கள்", calculator: "கணக்கீட்டு", dashboard: "டாஷ்போர்டு", logout: "வெளியேறு", login: "உள்நுழை", investNow: "இப்போது முதலீடு" },
  dashboard: { balance: "இருப்பு", dueToday: "இன்று செலுத்த", invested: "முதலீடு", logout: "வெளியேறு", notifications: "அறிவிப்புகள்" },
  auth: { investorLogin: "முதலீட்டாளர் உள்நுழைவு", login: "உள்நுழை", email: "மின்னஞ்சல்", password: "கடவுச்சொல்", register: "பதிவு", passkeyLogin: "பாஸ்கீ உள்நுழைவு", backToHome: "← முகப்பு" },
  register: { title: "முதலீட்டாளர் கணக்கு", subtitle: "Akshaya Exim Invest — INR, 42 திட்டங்கள்", createAccount: "கணக்கு உருவாக்கு", creating: "உருவாக்குகிறது…", back: "பின்", alreadyHave: "ஏற்கனவே கணக்கு உள்ளதா?" },
  cookie: { message: "உள்நுழைவுக்கு அத்தியாவசிய குக்கீகள் பயன்படுத்தப்படுகின்றன.", learnMore: "குக்கீ கொள்கை", accept: "ஏற்க" },
  onboarding: { continue: "தொடரவும்" },
  plan: { subscribe: "இப்போது முதலீடு", monthlyRoi: "மாதாந்திர ROI" },
  achievements: {
    title: "சாதனைகள்", unlocked: "{count} திறக்கப்பட்டது", totalInvested: "மொத்த முதலீடு", nextMilestones: "அடுத்த இலக்குகள்",
    tapToShare: "பகிர தட்டவும் →", noBadges: "பேட்ஜ் இல்லை", noBadgesHint: "முதல் முதலீட்டில் சாதனைகள் திறக்கவும்.",
    topReferrers: "முதன்மை பரிந்துரையாளர்கள்",
  },
  certificate: { verifyTitle: "சான்றிதழ் சரிபார்ப்பு", missingToken: "சான்றிதழ் டோக்கன் இல்லை.", verifying: "சரிபார்க்கிறது…", download: "பதிவிறக்கம்" },
  money: { deposit: "நிதி சேர்", withdraw: "திரும்பப் பெற", bankTransfer: "வங்கி பரிமாற்றம்" },
  earlyExit: { title: "முன்கூட்டிய வெளியேற்றம்", principal: "முதன்மை", penalty: "அபராதம்", netCredit: "நிகர வரவு", request: "முன்கூட்டிய வெளியேற்றம் உறுதி" },
  financial: { title: "நிதி அறிக்கைகள்", tabOverview: "கண்ணோட்டம்", tabReports: "P&L & ட்ரையல் பேலன்ஸ்", loading: "ஏற்றுகிறது…" },
  common: { loading: "ஏற்றுகிறது…", save: "சேமி", cancel: "ரத்து" },
};

export const mr = {
  nav: sharedNav({
    dashboard: "डॅशबोर्ड", plans: "गुंतवणूक योजना", money: "मनी हब", referral: "रेफरल",
    deposit: "पैसे जमा", withdraw: "उचल", investments: "माझी गुंतवणूक", transactions: "व्यवहार",
  }),
  layout: { plans: "योजना", calculator: "कॅल्क्युलेटर", dashboard: "डॅशबोर्ड", logout: "लॉग आउट", login: "लॉगिन", investNow: "आत्ता गुंतवा" },
  dashboard: { balance: "शेष", dueToday: "आज देय", invested: "गुंतवले", logout: "लॉग आउट", notifications: "सूचना" },
  auth: { investorLogin: "गुंतवणूकदार लॉगिन", login: "लॉगिन", email: "ईमेल", password: "पासवर्ड", register: "नोंदणी", passkeyLogin: "पासकी लॉगिन", backToHome: "← मुख्यपृष्ठ" },
  register: { title: "गुंतवणूकदार खाते", subtitle: "Akshaya Exim Invest — INR, 42 योजना", createAccount: "खाते तयार करा", creating: "तयार होत आहे…", back: "मागे", alreadyHave: "आधीच खाते आहे?" },
  cookie: { message: "साइन इन राहण्यासाठी आवश्यक कुकीज वापरतो.", learnMore: "कुकी धोरण", accept: "स्वीकारा" },
  onboarding: { continue: "पुढे" },
  plan: { subscribe: "आत्ता गुंतवा", monthlyRoi: "मासिक ROI" },
  achievements: {
    title: "यश", unlocked: "{count} अनलॉक", totalInvested: "एकूण गुंतवणूक", nextMilestones: "पुढील लक्ष्ये",
    tapToShare: "शेअर करण्यासाठी टॅप →", noBadges: "बॅज नाहीत", noBadgesHint: "पहिली गुंतवणूक करून यश अनलॉक करा.",
    topReferrers: "शीर्ष रेफरर",
  },
  certificate: { verifyTitle: "प्रमाणपत्र पडताळणी", missingToken: "प्रमाणपत्र टोकन नाही.", verifying: "पडताळत आहे…", download: "डाउनलोड" },
  money: { deposit: "पैसे जमा", withdraw: "उचल", bankTransfer: "बँक हस्तांतरण" },
  earlyExit: { title: "लवकर बाहेर पडणे", principal: "मूळ रक्कम", penalty: "दंड", netCredit: "निव्वळ क्रेडिट", request: "लवकर बाहेर पडणे निश्चित" },
  financial: { title: "आर्थिक अहवाल", tabOverview: "विहंगावलोकन", tabReports: "P&L आणि ट्रायल बॅलन्स", loading: "लोड होत आहे…" },
  common: { loading: "लोड होत आहे…", save: "जतन करा", cancel: "रद्द" },
};

export const gu = {
  nav: sharedNav({
    dashboard: "ડેશબોર્ડ", plans: "રોકાણ યોજનાઓ", money: "મની હબ", referral: "રેફરલ",
    deposit: "ફંડ ઉમેરો", withdraw: "ઉપાડ", investments: "મારા રોકાણ", transactions: "વ્યવહાર",
  }),
  layout: { plans: "યોજનાઓ", calculator: "કેલ્ક્યુલેટર", dashboard: "ડેશબોર્ડ", logout: "લૉગ આઉટ", login: "લૉગિન", investNow: "હવે રોકાણ કરો" },
  dashboard: { balance: "બેલેન્સ", dueToday: "આજે ચૂકવવાનું", invested: "રોકાણ", logout: "લૉગ આઉટ", notifications: "સૂચનાઓ" },
  auth: { investorLogin: "રોકાણકાર લૉગિન", login: "લૉગિન", email: "ઈમેલ", password: "પાસવર્ડ", register: "નોંધણી", passkeyLogin: "પાસકી લૉગિન", backToHome: "← હોમ" },
  register: { title: "રોકાણકાર એકાઉન્ટ", subtitle: "Akshaya Exim Invest — INR, 42 યોજનાઓ", createAccount: "એકાઉન્ટ બનાવો", creating: "બનાવી રહ્યા છીએ…", back: "પાછળ", alreadyHave: "પહેલેથી એકાઉન્ટ છે?" },
  cookie: { message: "સાઇન ઇન રાખવા જરૂરી કુકીઝ.", learnMore: "કુકી નીતિ", accept: "સ્વીકારો" },
  onboarding: { continue: "ચાલુ રાખો" },
  plan: { subscribe: "હવે રોકાણ કરો", monthlyRoi: "માસિક ROI" },
  achievements: {
    title: "સિદ્ધિઓ", unlocked: "{count} અનલૉક", totalInvested: "કુલ રોકાણ", nextMilestones: "આગળના લક્ષ્યો",
    tapToShare: "શેર કરવા ટેપ →", noBadges: "હજુ બેજ નથી", noBadgesHint: "પહેલું રોકાણ કરી સિદ્ધિ અનલૉક કરો.",
    topReferrers: "ટોચના રેફરર",
  },
  certificate: { verifyTitle: "પ્રમાણપત્ર ચકાસણી", missingToken: "પ્રમાણપત્ર ટોકન નથી.", verifying: "ચકાસી રહ્યા છીએ…", download: "ડાઉનલોડ" },
  money: { deposit: "ફંડ ઉમેરો", withdraw: "ઉપાડ", bankTransfer: "બેંક ટ્રાન્સફર" },
  earlyExit: { title: "વહેલું બહાર નીકળવું", principal: "મૂળ", penalty: "દંડ", netCredit: "નેટ ક્રેડિટ", request: "વહેલું બહાર નીકળવું નિશ્ચિત" },
  financial: { title: "નાણાકીય અહેવાલ", tabOverview: "ઝલક", tabReports: "P&L અને ટ્રાયલ બેલેન્સ", loading: "લોડ થઈ રહ્યું છે…" },
  common: { loading: "લોડ થઈ રહ્યું છે…", save: "સાચવો", cancel: "રદ" },
};

export const kn = {
  nav: sharedNav({
    dashboard: "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್", plans: "ಹೂಡಿಕೆ ಯೋಜನೆಗಳು", money: "ಮನಿ ಹಬ್", referral: "ರೆಫರಲ್",
    deposit: "ನಿಧಿ ಸೇರಿಸಿ", withdraw: "ಹಿಂಪಡೆಯಿರಿ", investments: "ನನ್ನ ಹೂಡಿಕೆ", transactions: "ವಹಿವಾಟು",
  }),
  layout: { plans: "ಯೋಜನೆಗಳು", calculator: "ಕ್ಯಾಲ್ಕುಲೇಟರ್", dashboard: "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್", logout: "ಲಾಗ್ ಔಟ್", login: "ಲಾಗಿನ್", investNow: "ಈಗ ಹೂಡಿಕೆ" },
  dashboard: { balance: "ಬ್ಯಾಲೆನ್ಸ್", dueToday: "ಇಂದು ಪಾವತಿ", invested: "ಹೂಡಿಕೆ", logout: "ಲಾಗ್ ಔಟ್", notifications: "ಅಧಿಸೂಚನೆಗಳು" },
  auth: { investorLogin: "ಹೂಡಿಕೆದಾರ ಲಾಗಿನ್", login: "ಲಾಗಿನ್", email: "ಇಮೇಲ್", password: "ಪಾಸ್‌ವರ್ಡ್", register: "ನೋಂದಣಿ", passkeyLogin: "ಪಾಸ್‌ಕೀ ಲಾಗಿನ್", backToHome: "← ಮುಖಪುಟ" },
  register: { title: "ಹೂಡಿಕೆದಾರ ಖಾತೆ", subtitle: "Akshaya Exim Invest — INR, 42 ಯೋಜನೆಗಳು", createAccount: "ಖಾತೆ ರಚಿಸಿ", creating: "ರಚಿಸಲಾಗುತ್ತಿದೆ…", back: "ಹಿಂದೆ", alreadyHave: "ಈಗಾಗಲೇ ಖಾತೆ ಇದೆಯೇ?" },
  cookie: { message: "ಸೈನ್ ಇನ್‌ಗಾಗಿ ಅಗತ್ಯ ಕುಕೀಗಳು.", learnMore: "ಕುಕೀ ನೀತಿ", accept: "ಒಪ್ಪಿಗೆ" },
  onboarding: { continue: "ಮುಂದುವರಿಸಿ" },
  plan: { subscribe: "ಈಗ ಹೂಡಿಕೆ", monthlyRoi: "ಮಾಸಿಕ ROI" },
  achievements: {
    title: "ಸಾಧನೆಗಳು", unlocked: "{count} ಅನ್‌ಲಾಕ್", totalInvested: "ಒಟ್ಟು ಹೂಡಿಕೆ", nextMilestones: "ಮುಂದಿನ ಗುರಿಗಳು",
    tapToShare: "ಹಂಚಿಕೊಳ್ಳಲು ಟ್ಯಾಪ್ →", noBadges: "ಬ್ಯಾಡ್ಜ್‌ಗಳಿಲ್ಲ", noBadgesHint: "ಮೊದಲ ಹೂಡಿಕೆಯಿಂದ ಸಾಧನೆಗಳು ಅನ್‌ಲಾಕ್.",
    topReferrers: "ಅಗ್ರ ರೆಫರರ್‌ಗಳು",
  },
  certificate: { verifyTitle: "ಪ್ರಮಾಣಪತ್ರ ಪರಿಶೀಲನೆ", missingToken: "ಪ್ರಮಾಣಪತ್ರ ಟೋಕನ್ ಇಲ್ಲ.", verifying: "ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿದೆ…", download: "ಡೌನ್‌ಲೋಡ್" },
  money: { deposit: "ನಿಧಿ ಸೇರಿಸಿ", withdraw: "ಹಿಂಪಡೆಯಿರಿ", bankTransfer: "ಬ್ಯಾಂಕ್ ವರ್ಗಾವಣೆ" },
  earlyExit: { title: "ಮುಂಚಿನ ನಿರ್ಗಮನ", principal: "ಮೂಲ", penalty: "ದಂಡ", netCredit: "ನಿವ್ವಳ ಕ್ರೆಡಿಟ್", request: "ಮುಂಚಿನ ನಿರ್ಗಮನ ದೃಢೀಕರಿಸಿ" },
  financial: { title: "ಹಣಕಾಸು ವರದಿಗಳು", tabOverview: "ಅವಲೋಕನ", tabReports: "P&L & ಟ್ರಯಲ್ ಬ್ಯಾಲೆನ್ಸ್", loading: "ಲೋಡ್ ಆಗುತ್ತಿದೆ…" },
  common: { loading: "ಲೋಡ್ ಆಗುತ್ತಿದೆ…", save: "ಉಳಿಸಿ", cancel: "ರದ್ದು" },
};

export const ml = {
  nav: sharedNav({
    dashboard: "ഡാഷ്‌ബോർഡ്", plans: "നിക്ഷേപ പദ്ധതികൾ", money: "മണി ഹബ്", referral: "റഫറൽ",
    deposit: "ഫണ്ട് ചേർക്കുക", withdraw: "പിൻവലിക്കുക", investments: "എന്റെ നിക്ഷേപം", transactions: "ഇടപാടുകൾ",
  }),
  layout: { plans: "പദ്ധതികൾ", calculator: "കാൽക്കുലേറ്റർ", dashboard: "ഡാഷ്‌ബോർഡ്", logout: "ലോഗൗട്ട്", login: "ലോഗിൻ", investNow: "ഇപ്പോൾ നിക്ഷേപിക്കുക" },
  dashboard: { balance: "ബാലൻസ്", dueToday: "ഇന്ന് നൽകേണ്ടത്", invested: "നിക്ഷേപിച്ചത്", logout: "ലോഗൗട്ട്", notifications: "അറിയിപ്പുകൾ" },
  auth: { investorLogin: "നിക്ഷേപകர் ലോഗിൻ", login: "ലോഗിൻ", email: "ഇമെയിൽ", password: "പാസ്‌വേഡ്", register: "രജിസ്റ്റർ", passkeyLogin: "പാസ്‌കീ ലോഗിൻ", backToHome: "← ഹോം" },
  register: { title: "നിക്ഷേപക അക്കൗണ്ട്", subtitle: "Akshaya Exim Invest — INR, 42 പദ്ധതികൾ", createAccount: "അക്കൗണ്ട് സൃഷ്ടിക്കുക", creating: "സൃഷ്ടിക്കുന്നു…", back: "പിന്നോട്ട്", alreadyHave: "ഇതിനകം അക്കൗണ്ട് ഉണ്ടോ?" },
  cookie: { message: "സൈൻ ഇൻ നിലനിർത്താൻ ആവശ്യമായ കുക്കികൾ.", learnMore: "കുക്കി നയം", accept: "അംഗീകരിക്കുക" },
  onboarding: { continue: "തുടരുക" },
  plan: { subscribe: "ഇപ്പോൾ നിക്ഷേപിക്കുക", monthlyRoi: "മാസിക ROI" },
  achievements: {
    title: "നേട്ടങ്ങൾ", unlocked: "{count} അൺലോക്ക്", totalInvested: "ആകെ നിക്ഷേപം", nextMilestones: "അടുത്ത ലക്ഷ്യങ്ങൾ",
    tapToShare: "പങ്കിടാൻ ടാപ്പ് →", noBadges: "ബാഡ്ജുകളില്ല", noBadgesHint: "ആദ്യ നിക്ഷേപം നേട്ടങ്ങൾ അൺലോക്ക് ചെയ്യും.",
    topReferrers: "മുൻനിര റഫറർമാർ",
  },
  certificate: { verifyTitle: "സർട്ടിഫിക്കറ്റ് പരിശോധന", missingToken: "ടോക്കൺ ഇല്ല.", verifying: "പരിശോധിക്കുന്നു…", download: "ഡൗൺലോഡ്" },
  money: { deposit: "ഫണ്ട് ചേർക്കുക", withdraw: "പിൻവലിക്കുക", bankTransfer: "ബാങ്ക് കൈമാറ്റം" },
  earlyExit: { title: "നേരത്തേ പിൻവലിക്കൽ", principal: "അസൽ", penalty: "പിഴ", netCredit: "നെറ്റ് ക്രെഡിറ്റ്", request: "നേരത്തേ പിൻവലിക്കൽ സ്ഥിരീകരിക്കുക" },
  financial: { title: "സാമ്പത്തിക റിപ്പോർട്ടുകൾ", tabOverview: "അവലോകനം", tabReports: "P&L & ട്രയൽ ബാലൻസ്", loading: "ലോഡ് ചെയ്യുന്നു…" },
  common: { loading: "ലോഡ് ചെയ്യുന്നു…", save: "സേവ്", cancel: "റദ്ദാക്കുക" },
};

export const pa = {
  nav: sharedNav({
    dashboard: "ਡੈਸ਼ਬੋਰਡ", plans: "ਨਿਵੇਸ਼ ਯੋਜਨਾਵਾਂ", money: "ਮਨੀ ਹੱਬ", referral: "ਰੈਫਰਲ",
    deposit: "ਫੰਡ ਜੋੜੋ", withdraw: "ਕਢਵਾਓ", investments: "ਮੇਰੇ ਨਿਵੇਸ਼", transactions: "ਲੈਣ-ਦੇਣ",
  }),
  layout: { plans: "ਯੋਜਨਾਵਾਂ", calculator: "ਕੈਲਕੁਲੇਟਰ", dashboard: "ਡੈਸ਼ਬੋਰਡ", logout: "ਲੌਗ ਆਊਟ", login: "ਲੌਗਇਨ", investNow: "ਹੁਣੇ ਨਿਵੇਸ਼" },
  dashboard: { balance: "ਬਕਾਇਆ", dueToday: "ਅੱਜ ਦੇਣਾ", invested: "ਨਿਵੇਸ਼", logout: "ਲੌਗ ਆਊਟ", notifications: "ਸੂਚਨਾਵਾਂ" },
  auth: { investorLogin: "ਨਿਵੇਸ਼ਕ ਲੌਗਇਨ", login: "ਲੌਗਇਨ", email: "ਈਮੇਲ", password: "ਪਾਸਵਰਡ", register: "ਰਜਿਸਟਰ", passkeyLogin: "ਪਾਸਕੀ ਲੌਗਇਨ", backToHome: "← ਘਰ" },
  register: { title: "ਨਿਵੇਸ਼ਕ ਖਾਤਾ", subtitle: "Akshaya Exim Invest — INR, 42 ਯੋਜਨਾਵਾਂ", createAccount: "ਖਾਤਾ ਬਣਾਓ", creating: "ਬਣ ਰਿਹਾ ਹੈ…", back: "ਪਿੱਛੇ", alreadyHave: "ਪਹਿਲਾਂ ਤੋਂ ਖਾਤਾ ਹੈ?" },
  cookie: { message: "ਸਾਈਨ ਇਨ ਲਈ ਜ਼ਰੂਰੀ ਕੁਕੀਜ਼.", learnMore: "ਕੁਕੀ ਨੀਤੀ", accept: "ਸਵੀਕਾਰ" },
  onboarding: { continue: "ਜਾਰੀ ਰੱਖੋ" },
  plan: { subscribe: "ਹੁਣੇ ਨਿਵੇਸ਼", monthlyRoi: "ਮਾਸਿਕ ROI" },
  achievements: {
    title: "ਪ੍ਰਾਪਤੀਆਂ", unlocked: "{count} ਅਨਲੌਕ", totalInvested: "ਕੁੱਲ ਨਿਵੇਸ਼", nextMilestones: "ਅਗਲੇ ਟੀਚੇ",
    tapToShare: "ਸ਼ੇਅਰ ਲਈ ਟੈਪ →", noBadges: "ਬੈਜ ਨਹੀਂ", noBadgesHint: "ਪਹਿਲਾ ਨਿਵੇਸ਼ ਕਰਕੇ ਪ੍ਰਾਪਤੀਆਂ ਅਨਲੌਕ ਕਰੋ.",
    topReferrers: "ਚੋਟੀ ਦੇ ਰੈਫਰਰ",
  },
  certificate: { verifyTitle: "ਸਰਟੀਫਿਕੇਟ ਜਾਂਚ", missingToken: "ਟੋਕਨ ਗਾਇਬ.", verifying: "ਜਾਂਚ ਹੋ ਰਹੀ…", download: "ਡਾਊਨਲੋਡ" },
  money: { deposit: "ਫੰਡ ਜੋੜੋ", withdraw: "ਕਢਵਾਓ", bankTransfer: "ਬੈਂਕ ਟ੍ਰਾਂਸਫਰ" },
  earlyExit: { title: "ਛੇਤੀ ਬਾਹਰ", principal: "ਮੂਲ", penalty: "ਜੁਰਮਾਨਾ", netCredit: "ਨੈੱਟ ਕ੍ਰੈਡਿਟ", request: "ਛੇਤੀ ਬਾਹਰ ਪੁਸ਼ਟੀ" },
  financial: { title: "ਵਿੱਤੀ ਰਿਪੋਰਟਾਂ", tabOverview: "ਸੰਖੇਪ", tabReports: "P&L & ਟ੍ਰਾਇਲ ਬੈਲੇਂਸ", loading: "ਲੋਡ ਹੋ ਰਿਹਾ…" },
  common: { loading: "ਲੋਡ ਹੋ ਰਿਹਾ ਹੈ…", save: "ਸੇਵ", cancel: "ਰੱਦ" },
};

export const or = {
  nav: sharedNav({
    dashboard: "ଡ୍ୟାଶବୋର୍ଡ", plans: "ବିନିଯୋଗ ଯୋଜନା", money: "ମନି ହବ", referral: "ରେଫରାଲ",
    deposit: "ଟଙ୍କା ଯୋଡ଼", withdraw: "ଉଠାନ", investments: "ମୋ ବିନିଯୋଗ", transactions: "ଲେଣଦେଣ",
  }),
  layout: { plans: "ଯୋଜନା", calculator: "କାଲକୁଲେଟର", dashboard: "ଡ୍ୟାଶବୋର୍ଡ", logout: "ଲଗ୍ ଆଉଟ", login: "ଲଗଇନ", investNow: "ବର୍ତ୍ତମାନ ବିନିଯୋଗ" },
  dashboard: { balance: "ବ୍ୟାଲାନ୍ସ", dueToday: "ଆଜି ଦେୟ", invested: "ବିନିଯୋଗ", logout: "ଲଗ୍ ଆଉଟ", notifications: "ବିଜ୍ଞପ୍ତି" },
  auth: { investorLogin: "ବିନିଯୋଗକାରୀ ଲଗଇନ", login: "ଲଗଇନ", email: "ଇମେଲ", password: "ପାସୱାର୍ଡ", register: "ନବୀକରଣ", passkeyLogin: "ପାସକି ଲଗଇନ", backToHome: "← ମୁଖ୍ୟ" },
  register: { title: "ବିନିଯୋଗକାରୀ ଖାତା", subtitle: "Akshaya Exim Invest — INR, 42 ଯୋଜନା", createAccount: "ଖାତା ତିଆରି", creating: "ତିଆରି ହେଉଛି…", back: "ପଛକୁ", alreadyHave: "ପୂର୍ବରୁ ଖାତା?" },
  cookie: { message: "ସାଇନ ଇନ୍ ପାଇଁ ଆବଶ୍ୟକ କୁକି.", learnMore: "କୁକି ନୀତି", accept: "ଗ୍ରହଣ" },
  onboarding: { continue: "ଜାରି ରଖ" },
  plan: { subscribe: "ବର୍ତ୍ତମାନ ବିନିଯୋଗ", monthlyRoi: "ମାସିକ ROI" },
  achievements: {
    title: "ସାଧନା", unlocked: "{count} ଅନଲକ", totalInvested: "ମୋଟ ବିନିଯୋଗ", nextMilestones: "ପରବର୍ତ୍ତୀ ଲକ୍ଷ୍ୟ",
    tapToShare: "ସେୟାର ପାଇଁ ଟ୍ୟାପ →", noBadges: "ବ୍ୟାଜ ନାହିଁ", noBadgesHint: "ପ୍ରଥମ ବିନିଯୋଗରେ ସାଧନା ଅନଲକ.",
    topReferrers: "ଶୀର୍ଷ ରେଫରର",
  },
  certificate: { verifyTitle: "ପ୍ରମାଣପତ୍ର ଯାଞ୍ଚ", missingToken: "ଟୋକନ ନାହିଁ.", verifying: "ଯାଞ୍ଚ ହେଉଛି…", download: "ଡାଉନଲୋଡ" },
  money: { deposit: "ଟଙ୍କା ଯୋଡ଼", withdraw: "ଉଠାନ", bankTransfer: "ବ୍ୟାଙ୍କ ଟ୍ରାନ୍ସଫର" },
  earlyExit: { title: "ପୂର୍ବ ପ୍ରସ୍ଥାନ", principal: "ମୂଳ", penalty: "ଜରିମାନା", netCredit: "ନେଟ କ୍ରେଡିଟ", request: "ପୂର୍ବ ପ୍ରସ୍ଥାନ ନିଶ୍ଚିତ" },
  financial: { title: "ଆର୍ଥିକ ରିପୋର୍ଟ", tabOverview: "ସଂକ୍ଷିପ୍ତ", tabReports: "P&L & ଟ୍ରାଇଲ ବ୍ୟାଲାନ୍ସ", loading: "ଲୋଡ୍ ହେଉଛି…" },
  common: { loading: "ଲୋଡ୍ ହେଉଛି…", save: "ସଞ୍ଚୟ", cancel: "ରଦ୍ଦ" },
};

export const as = {
  nav: sharedNav({
    dashboard: "ড্যাশব’ৰ্ড", plans: "বিনিয়োগ পৰিকল্পনা", money: "মানি হাব", referral: "ৰেফাৰেল",
    deposit: "টকা জমা", withdraw: "উত্তোলন", investments: "মোৰ বিনিয়োগ", transactions: "লেনদেন",
  }),
  layout: { plans: "পৰিকল্পনা", calculator: "কেলকুলেটৰ", dashboard: "ড্যাশব’ৰ্ড", logout: "লগ আউট", login: "লগইন", investNow: "এতিয়া বিনিয়োগ" },
  dashboard: { balance: "ব্যালেন্স", dueToday: "আজি পৰিশোধ", invested: "বিনিয়োগ", logout: "লগ আউট", notifications: "জাননী" },
  auth: { investorLogin: "বিনিয়োগকাৰী লগইন", login: "লগইন", email: "ইমেইল", password: "পাছৱৰ্ড", register: "পঞ্জীয়ন", passkeyLogin: "পাছকি লগইন", backToHome: "← ঘৰ" },
  register: { title: "বিনিয়োগকাৰী একাউণ্ট", subtitle: "Akshaya Exim Invest — INR, 42 পৰিকল্পনা", createAccount: "একাউণ্ট সৃষ্টি", creating: "সৃষ্টি হৈ আছে…", back: "পিছলৈ", alreadyHave: "আগতে একাউণ্ট আছে?" },
  cookie: { message: "ছাইন ইনৰ বাবে প্ৰয়োজনীয় কুকি.", learnMore: "কুকি নীতি", accept: "গ্ৰহণ" },
  onboarding: { continue: "অব্যাহত ৰাখক" },
  plan: { subscribe: "এতিয়া বিনিয়োগ", monthlyRoi: "মাহেকীয় ROI" },
  achievements: {
    title: "সফলতা", unlocked: "{count} আনলক", totalInvested: "মুঠ বিনিয়োগ", nextMilestones: "পৰৱৰ্তী লক্ষ্য",
    tapToShare: "শ্বেয়াৰ কৰিবলৈ টেপ →", noBadges: "বেজ নাই", noBadgesHint: "প্ৰথম বিনিয়োগত সফলতা আনলক.",
    topReferrers: "শীৰ্ষ ৰেফাৰাৰ",
  },
  certificate: { verifyTitle: "প্ৰমাণপত্ৰ পৰীক্ষা", missingToken: "টোকেন নাই.", verifying: "পৰীক্ষা হৈ আছে…", download: "ডাউনলোড" },
  money: { deposit: "টকা জমা", withdraw: "উত্তোলন", bankTransfer: "বেংক স্থানান্তৰ" },
  earlyExit: { title: "আগতে প্ৰস্থান", principal: "মূল", penalty: "জৰিমানা", netCredit: "নেট ক্ৰেডিট", request: "আগতে প্ৰস্থান নিশ্চিত" },
  financial: { title: "আৰ্থিক প্ৰতিবেদন", tabOverview: "সাৰাংশ", tabReports: "P&L & ট্ৰায়েল বেলেন্স", loading: "ল'ড হৈ আছে…" },
  common: { loading: "ল'ড হৈ আছে…", save: "সংৰক্ষণ", cancel: "বাতিল" },
};

export const ur = {
  nav: sharedNav({
    dashboard: "ڈیش بورڈ", plans: "سرمایہ کاری منصوبے", money: "منی حب", referral: "ریفرل",
    deposit: "فنڈز شامل", withdraw: "نکالنا", investments: "میری سرمایہ کاری", transactions: "لین دین",
  }),
  layout: { plans: "منصوبے", calculator: "کیلکولیٹر", dashboard: "ڈیش بورڈ", logout: "لاگ آؤٹ", login: "لاگ ان", investNow: "ابھی سرمایہ کاری" },
  dashboard: { balance: "بیلنس", dueToday: "آج واجب", invested: "سرمایہ", logout: "لاگ آؤٹ", notifications: "اطلاعات" },
  auth: { investorLogin: "سرمایہ کار لاگ ان", login: "لاگ ان", email: "ای میل", password: "پاس ورڈ", register: "رجسٹر", passkeyLogin: "پاس کی لاگ ان", backToHome: "← ہوم" },
  register: { title: "سرمایہ کار اکاؤنٹ", subtitle: "Akshaya Exim Invest — INR، 42 منصوبے", createAccount: "اکاؤنٹ بنائیں", creating: "بن رہا ہے…", back: "واپس", alreadyHave: "پہلے سے اکاؤنٹ؟" },
  cookie: { message: "سائن ان کے لیے ضروری کوکیز.", learnMore: "کوکی پالیسی", accept: "قبول" },
  onboarding: { continue: "جاری رکھیں" },
  plan: { subscribe: "ابھی سرمایہ کاری", monthlyRoi: "ماہانہ ROI" },
  achievements: {
    title: "کامیابیاں", unlocked: "{count} ان لاک", totalInvested: "کل سرمایہ", nextMilestones: "اگلے اہداف",
    tapToShare: "شیئر کے لیے ٹیپ →", noBadges: "ابھی بیج نہیں", noBadgesHint: "پہلی سرمایہ کاری سے کامیابیاں ان لاک.",
    topReferrers: "سر فہرست ریفرر",
  },
  certificate: { verifyTitle: "سرٹیفکیٹ تصدیق", missingToken: "ٹوکن غائب.", verifying: "تصدیق…", download: "ڈاؤن لوڈ" },
  money: { deposit: "فنڈز شامل", withdraw: "نکالنا", bankTransfer: "بینک منتقلی" },
  earlyExit: { title: "میعاد سے پہلے نکاسی", principal: "اصل", penalty: "جرمانہ", netCredit: "خالص کریڈٹ", request: "میعاد سے پہلے نکاسی کی تصدیق" },
  financial: { title: "مالی رپورٹیں", tabOverview: "جائزہ", tabReports: "P&L اور ٹrial بیلنس", loading: "لوڈ ہو رہا…" },
  common: { loading: "لوڈ ہو رہا ہے…", save: "محفوظ", cancel: "منسوخ" },
};

export const OVERRIDES = { hi, bn, te, ta, mr, gu, kn, ml, pa, or, as, ur };
