# Vypto - Manual Code Export
**Real-time Crypto Price Tracking App with Voice Announcements**

## 📁 Project Structure
This export contains all the files needed to recreate your Vypto crypto tracking application.

```
vypto-export/
├── README-EXPORT.md (this file)
├── SETUP-INSTRUCTIONS.md
├── package.json
├── next.config.mjs
├── tailwind.config.ts
├── tsconfig.json
├── postcss.config.mjs
├── components.json
├── ecosystem.config.js
├── vercel.json
├── public/
│   ├── favicon.ico
│   ├── manifest.json
│   ├── sw.js
│   └── icons/
│       ├── icon-72x72.svg
│       ├── icon-96x96.svg
│       ├── icon-128x128.svg
│       ├── icon-192x192.svg
│       └── icon-512x512.svg
├── src/
│   ├── components/
│   │   ├── PWAInstallPrompt.tsx
│   │   ├── ThemeSwitch.tsx
│   │   └── ui/ (shadcn/ui components - 42 files)
│   ├── contexts/
│   │   └── ThemeProvider.tsx
│   ├── hooks/
│   │   ├── use-mobile.tsx
│   │   └── use-toast.ts
│   ├── lib/
│   │   ├── utils.ts
│   │   └── binanceWebSocket.ts
│   ├── pages/
│   │   ├── _app.tsx
│   │   ├── _document.tsx
│   │   ├── index.tsx
│   │   ├── 404.tsx
│   │   ├── api/
│   │   │   ├── hello.ts
│   │   │   └── crypto-proxy.ts
│   │   └── fonts/
│   │       ├── GeistMonoVF.woff
│   │       └── GeistVF.woff
│   └── styles/
│       └── globals.css
└── .env.local (create this - empty file)
```

## 🚀 Key Features
- **Real-time price tracking** via Binance WebSocket
- **Voice announcements** with multilingual support (20 languages)
- **Smart price formatting** for voice (handles very small decimals)
- **Favorites system** with localStorage persistence
- **Price alerts** with browser notifications
- **PWA capabilities** for mobile installation
- **200+ cryptocurrencies** supported
- **Responsive design** with modern UI

## 🛠 Technology Stack
- **Next.js 15.2** (Pages Router)
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Shadcn/UI** components
- **Binance WebSocket API** for real-time data
- **Speech Synthesis API** for voice announcements
- **PWA** (Progressive Web App) capabilities

## 📱 Voice Features
- **15 configurable intervals** (5s to 1hr)
- **20 languages** supported
- **Smart number pronunciation** (handles zeros, decimals)
- **Single coin selection** for focused announcements
- **Name inclusion toggle** (crypto names optional)
- **Real-time price updates** during announcements

## 🔧 Next Steps
1. Follow **SETUP-INSTRUCTIONS.md** to recreate locally
2. For **React Native conversion**: Use the React components as a base
3. For **custom deployment**: All files are self-contained
4. For **modifications**: Focus on `src/pages/index.tsx` and `src/lib/binanceWebSocket.ts`

## 📞 Support
All code is production-ready and includes comprehensive error handling, rate limiting, and user experience optimizations.
