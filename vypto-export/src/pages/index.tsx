import React, { useState, useEffect, useRef, useCallback } from "react"
import Head from "next/head"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Heart, HeartOff, Volume2, VolumeX, TrendingUp, TrendingDown, Bell, BellOff, Play, Pause, Settings, ExternalLink, Wifi, WifiOff, Zap } from "lucide-react"
import { cn } from "@/lib/utils"
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt"
import { binanceWebSocket, type CryptoPrice } from "@/lib/binanceWebSocket"

interface VoiceSettings {
  enabled: boolean
  frequency: number // in seconds
  selectedCoin: string // Changed from selectedCoins array to single coin
  language: string
  voice: string
  includeCryptoNames: boolean // New option to include/exclude crypto names
}

interface PriceAlert {
  id: string
  coinId: string
  targetPrice: number
  condition: "above" | "below"
  isActive: boolean
}

export default function CryptoTracker() {
  const [coins, setCoins] = useState<CryptoPrice[]>([])
  const [favorites, setFavorites] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>({
    enabled: false,
    frequency: 15,
    selectedCoin: '', // Changed from selectedCoins array to single coin
    language: 'en-US',
    voice: 'default',
    includeCryptoNames: true
  })
  const [priceAlerts, setPriceAlerts] = useState<PriceAlert[]>([])
  const [activeTab, setActiveTab] = useState("dashboard")
  const [speechSupported, setSpeechSupported] = useState(false)
  const [isAnnouncing, setIsAnnouncing] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting')
  
  const announcementInterval = useRef<NodeJS.Timeout>()
  const speechSynthesis = useRef<SpeechSynthesis>()

  // Check for speech synthesis support
  useEffect(() => {
    if (typeof window !== "undefined") {
      const checkSpeechSupport = () => {
        const supported = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window
        setSpeechSupported(supported)
        if (supported) {
          speechSynthesis.current = window.speechSynthesis
          
          const loadVoices = () => {
            const voices = speechSynthesis.current?.getVoices() || []
            if (voices.length > 0) {
              console.log(`✅ Speech synthesis ready with ${voices.length} voices`)
            }
          }
          
          loadVoices()
          if (speechSynthesis.current) {
            speechSynthesis.current.onvoiceschanged = loadVoices
          }
          
          const testUtterance = new SpeechSynthesisUtterance("")
          testUtterance.volume = 0
          speechSynthesis.current?.speak(testUtterance)
        } else {
          console.warn("❌ Speech synthesis not supported in this browser")
        }
      }
      
      checkSpeechSupport()
      setTimeout(checkSpeechSupport, 1000)
    }
  }, [])

  // Initialize Binance WebSocket connection
  useEffect(() => {
    console.log('🚀 Initializing Binance WebSocket connection')
    
    const unsubscribe = binanceWebSocket.subscribe((newPrices) => {
      console.log(`📊 Received ${newPrices.length} price updates from Binance`)
      
      setCoins(prevCoins => {
        const updatedCoins = newPrices.map(newPrice => ({
          ...newPrice,
          isFavorite: favorites.includes(newPrice.id)
        }))
        
        // Check price alerts
        checkPriceAlerts(updatedCoins)
        
        return updatedCoins
      })
      
      setLoading(false)
      setConnectionStatus(binanceWebSocket.getConnectionStatus())
    })

    // Connect to WebSocket
    binanceWebSocket.connect()

    // Update connection status periodically
    const statusInterval = setInterval(() => {
      setConnectionStatus(binanceWebSocket.getConnectionStatus())
    }, 5000)

    return () => {
      clearInterval(statusInterval)
      unsubscribe()
    }
  }, [favorites])

  // Price alert checking function
  const checkPriceAlerts = useCallback((updatedCoins: CryptoPrice[]) => {
    priceAlerts.forEach(alert => {
      if (!alert.isActive) return
      
      const coin = updatedCoins.find(c => c.id === alert.coinId)
      if (!coin) return
      
      const conditionMet = alert.condition === "above" 
        ? coin.current_price >= alert.targetPrice
        : coin.current_price <= alert.targetPrice
        
      if (conditionMet && "Notification" in window && Notification.permission === "granted") {
        new Notification(`Price Alert: ${coin.name}`, {
          body: `${coin.name} is now $${coin.current_price.toFixed(6)}`,
          icon: coin.image
        })
      }
    })
  }, [priceAlerts])

  // Smart number formatting for voice announcements
  const formatPriceForVoice = useCallback((price: number): string => {
    if (price >= 1) {
      return price.toFixed(2)
    } else {
      const priceStr = price.toString()
      const decimalIndex = priceStr.indexOf('.')
      if (decimalIndex === -1) return price.toString()
      const afterDecimal = priceStr.substring(decimalIndex + 1)
      let zeroCount = 0
      for (let i = 0; i < afterDecimal.length; i++) {
        if (afterDecimal[i] === '0') {
          zeroCount++
        } else {
          break
        }
      }
      if (zeroCount >= 3) {
        const significantPart = afterDecimal.substring(zeroCount, zeroCount + 4)
        const digits = significantPart.split('').join(', ')
        return `${zeroCount} zeros and ${digits}`
      } else {
        return price.toFixed(Math.min(6, zeroCount + 4))
      }
    }
  }, [])

  // Get available voices for the selected language
  const getAvailableVoices = useCallback(() => {
    if (!speechSynthesis.current) return []
    const voices = speechSynthesis.current.getVoices()
    return voices.filter(voice => 
      voice.lang.startsWith(voiceSettings.language.split('-')[0]) || 
      voice.lang === voiceSettings.language
    )
  }, [voiceSettings.language])

  const getTranslations = useCallback((language: string) => {
    const translations: Record<string, Record<string, string>> = {
      'en': { currentlyPriced: 'is currently priced at', hasGained: 'and has gained', hasLost: 'and has lost', today: 'today', zeros: 'zeros and', portfolioValued: 'Your portfolio is currently valued at'},
      'fr': { currentlyPriced: 'est actuellement au prix de', hasGained: 'et a gagné', hasLost: 'et a perdu', today: 'aujourd\'hui', zeros: 'zéros et', portfolioValued: 'Votre portefeuille est actuellement évalué à'},
      'es': { currentlyPriced: 'tiene un precio actual de', hasGained: 'y ha ganado', hasLost: 'y ha perdido', today: 'hoy', zeros: 'ceros y', portfolioValued: 'Su cartera está valorada actualmente en'}
    }
    const baseLanguage = language.split('-')[0]
    return translations[baseLanguage] || translations['en']
  }, [])

  // Voice announcement with real-time Binance data - Updated for single coin
  const announceSelectedCoins = useCallback(async () => {
    if (!voiceSettings.enabled || !voiceSettings.selectedCoin) {
      console.log(`❌ Voice announcement skipped - Enabled: ${voiceSettings.enabled}, Selected: ${voiceSettings.selectedCoin}`)
      return
    }

    if (!speechSynthesis.current || !speechSupported) {
      console.warn("❌ Speech synthesis not available")
      return
    }

    console.log(`🎤 Starting voice announcement sequence at ${new Date().toLocaleTimeString()}`)
    console.log(`📝 Selected coin for announcement: ${voiceSettings.selectedCoin}`)
    
    setIsAnnouncing(true)
    
    const announcements: string[] = []
    const translations = getTranslations(voiceSettings.language)
    
    // Get fresh real-time data from Binance WebSocket
    const currentPrices = binanceWebSocket.getCurrentPrices()
    console.log(`📊 Using real-time data from ${currentPrices.length} coins`)
    
    // Process only the selected coin
    const coin = currentPrices.find(c => c.id === voiceSettings.selectedCoin)
    if (coin) {
      const formattedPrice = formatPriceForVoice(coin.current_price)
      let text: string
      
      if (voiceSettings.includeCryptoNames) {
        // Include crypto name in announcement
        if (coin.current_price < 1 && formattedPrice.includes('zeros')) {
          const formattedPriceLocalized = formattedPrice.replace('zeros and', translations.zeros)
          text = `${coin.name} ${translations.currentlyPriced} ${formattedPriceLocalized}.`
        } else {
          text = `${coin.name} ${translations.currentlyPriced} $${formattedPrice}.`
        }
      } else {
        // Only announce the price without crypto name
        if (coin.current_price < 1 && formattedPrice.includes('zeros')) {
          const formattedPriceLocalized = formattedPrice.replace('zeros and', translations.zeros)
          text = `${formattedPriceLocalized}.`
        } else {
          text = `$${formattedPrice}.`
        }
      }
      
      announcements.push(text)
      
      const timeStamp = new Date().toLocaleTimeString()
      console.log(`📝 [${timeStamp}] Fresh price announcement: ${coin.symbol.toUpperCase()} @ $${coin.current_price.toFixed(6)} (Names: ${voiceSettings.includeCryptoNames ? 'ON' : 'OFF'})`)
    } else {
      console.warn(`⚠️ Coin not found in real-time data: ${voiceSettings.selectedCoin}`)
    }
    
    if (announcements.length === 0) {
      console.warn("❌ No announcements to make - no valid coin found in real-time data")
      setIsAnnouncing(false)
      return
    }
    
    console.log(`🎯 Prepared ${announcements.length} real-time announcements`)
    
    // Clear any pending speech before starting new announcements
    if (speechSynthesis.current.speaking) {
      console.log('🔇 Cancelling previous speech before new announcement')
      speechSynthesis.current.cancel()
      // Wait a moment for cancellation to complete
      await new Promise(resolve => setTimeout(resolve, 200))
    }
    
    let announcementIndex = 0

    const speakNext = () => {
      if (announcementIndex >= announcements.length) {
        console.log(`✅ All real-time announcements completed at ${new Date().toLocaleTimeString()}`)
        setTimeout(() => setIsAnnouncing(false), 1000)
        return
      }
      
      const text = announcements[announcementIndex]
      console.log(`🎤 Speaking real-time announcement ${announcementIndex + 1}/${announcements.length}: ${text}`)
      
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 0.9
      utterance.pitch = 1
      utterance.volume = 0.8
      utterance.lang = voiceSettings.language
      
      // Enhanced voice selection
      const voices = speechSynthesis.current?.getVoices() || []
      let selectedVoice = voices.find(v => v.name === voiceSettings.voice)
      
      if (!selectedVoice) {
        selectedVoice = voices.find(v => v.lang === voiceSettings.language) ||
                       voices.find(v => v.lang.startsWith(voiceSettings.language.split('-')[0])) ||
                       voices.find(v => v.default) ||
                       voices[0]
      }
      
      if (selectedVoice) {
        utterance.voice = selectedVoice
        console.log(`🎯 Using voice: ${selectedVoice.name} (${selectedVoice.lang})`)
      } else {
        console.warn('⚠️ No suitable voice found, using system default')
      }
      
      utterance.onstart = () => {
        console.log(`🔊 Started speaking: "${text.substring(0, 50)}..."`)
      }
      
      utterance.onend = () => {
        console.log(`✅ Finished speaking announcement ${announcementIndex + 1}`)
        announcementIndex++
        setTimeout(speakNext, 1000) // 1 second pause between announcements
      }
      
      utterance.onerror = (event) => {
        console.error(`❌ Speech error:`, event.error, event)
        announcementIndex++
        setTimeout(speakNext, 500) // Shorter delay on error
      }
      
      try {
        speechSynthesis.current?.speak(utterance)
      } catch (error) {
        console.error('❌ Failed to speak utterance:', error)
        announcementIndex++
        setTimeout(speakNext, 500)
      }
    }
    
    speakNext()
    
  }, [voiceSettings.enabled, voiceSettings.selectedCoin, voiceSettings.language, voiceSettings.voice, formatPriceForVoice, getTranslations, speechSupported])

  // Voice announcement interval - Updated for single coin
  useEffect(() => {
    console.log(`🔧 Voice settings changed - Enabled: ${voiceSettings.enabled}, Frequency: ${voiceSettings.frequency}s, Selected: ${voiceSettings.selectedCoin}`)
    
    // Clear any existing interval
    if (announcementInterval.current) {
      clearInterval(announcementInterval.current)
      announcementInterval.current = undefined
    }

    // Only set up interval if voice is enabled and a coin is selected
    if (voiceSettings.enabled && voiceSettings.selectedCoin && speechSupported) {
      console.log(`🎤 Setting up voice announcement interval: every ${voiceSettings.frequency} seconds`)
      
      // Create a stable reference to the announcement function
      const stableAnnounceFunction = () => {
        console.log(`⏰ Voice announcement timer triggered at ${new Date().toLocaleTimeString()}`)
        announceSelectedCoins()
      }
      
      // Initial announcement after a short delay
      const initialTimeout = setTimeout(stableAnnounceFunction, 3000) // 3 second delay for initial load
      
      // Set up recurring announcements
      announcementInterval.current = setInterval(stableAnnounceFunction, voiceSettings.frequency * 1000)
      
      console.log(`✅ Voice announcement interval set: every ${voiceSettings.frequency} seconds`)
      
      return () => {
        clearTimeout(initialTimeout)
        if (announcementInterval.current) {
          console.log('🧹 Cleaning up voice announcement interval')
          clearInterval(announcementInterval.current)
          announcementInterval.current = undefined
        }
      }
    } else {
      console.log('🔇 Voice announcements disabled:', {
        enabled: voiceSettings.enabled,
        hasSelectedCoin: !!voiceSettings.selectedCoin,
        speechSupported
      })
    }

  }, [voiceSettings.enabled, voiceSettings.frequency, voiceSettings.selectedCoin, speechSupported])

  // Individual coin voice announcement function
  const speakPrice = useCallback(async (coin: CryptoPrice) => {
    if (!speechSupported || !speechSynthesis.current) {
      console.warn("Speech synthesis not supported or available")
      return
    }
    
    console.log(`🎤 Individual price announcement requested for ${coin.name}`)
    
    const translations = getTranslations(voiceSettings.language)
    const formattedPrice = formatPriceForVoice(coin.current_price)
    
    let text: string
    if (voiceSettings.includeCryptoNames) {
      // Include crypto name in individual announcement
      if (coin.current_price < 1 && formattedPrice.includes('zeros')) {
        const formattedPriceLocalized = formattedPrice.replace('zeros and', translations.zeros)
        text = `${coin.name} ${translations.currentlyPriced} ${formattedPriceLocalized}.`
      } else {
        text = `${coin.name} ${translations.currentlyPriced} $${formattedPrice}.`
      }
    } else {
      // Only announce the price without crypto name
      if (coin.current_price < 1 && formattedPrice.includes('zeros')) {
        const formattedPriceLocalized = formattedPrice.replace('zeros and', translations.zeros)
        text = `${formattedPriceLocalized}.`
      } else {
        text = `$${formattedPrice}.`
      }
    }
    
    console.log(`📝 Individual announcement text (Names: ${voiceSettings.includeCryptoNames ? 'ON' : 'OFF'}): ${text}`)
    
    // Clear any existing speech
    if (speechSynthesis.current.speaking) {
      speechSynthesis.current.cancel()
    }
    
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.9
    utterance.pitch = 1
    utterance.volume = 0.8
    utterance.lang = voiceSettings.language
    
    const voices = speechSynthesis.current.getVoices()
    const selectedVoice = voices.find(v => v.name === voiceSettings.voice) ||
                         voices.find(v => v.lang === voiceSettings.language) ||
                         voices.find(v => v.lang.startsWith(voiceSettings.language.split('-')[0])) ||
                         voices[0]
    
    if (selectedVoice) {
      utterance.voice = selectedVoice
      console.log(`🎯 Using voice: ${selectedVoice.name} (${selectedVoice.lang})`)
    }
    
    utterance.onstart = () => {
      console.log(`🔊 Individual announcement started: ${coin.name}`)
    }
    
    utterance.onend = () => {
      console.log(`✅ Individual announcement completed: ${coin.name}`)
    }
    
    utterance.onerror = (event) => {
      console.error(`❌ Individual announcement error for ${coin.name}:`, event.error)
    }
    
    speechSynthesis.current.speak(utterance)
    console.log(`🎤 Individual announcement queued for ${coin.name} at ${new Date().toLocaleTimeString()}`)
    
  }, [speechSupported, voiceSettings.language, voiceSettings.voice, formatPriceForVoice, getTranslations])

  const toggleFavorite = (coinId: string) => {
    setFavorites(prev => 
      prev.includes(coinId) 
        ? prev.filter(id => id !== coinId)
        : [...prev, coinId]
    )
  }

  const addToVoiceSelection = (coinId: string) => {
    setVoiceSettings(prev => ({
      ...prev,
      selectedCoin: prev.selectedCoin === coinId ? '' : coinId // Toggle single coin selection
    }))
  }

  const handleReconnect = () => {
    console.log('🔄 Manual reconnection requested')
    setConnectionStatus('connecting')
    binanceWebSocket.disconnect()
    setTimeout(() => {
      binanceWebSocket.connect()
    }, 1000)
  }

  // Load saved data from localStorage
  useEffect(() => {
    const savedFavorites = localStorage.getItem("cryptoFavorites")
    if (savedFavorites) setFavorites(JSON.parse(savedFavorites))
    
    const savedVoiceSettings = localStorage.getItem("voiceSettings")
    if (savedVoiceSettings) setVoiceSettings(JSON.parse(savedVoiceSettings))
    
    const savedAlerts = localStorage.getItem("priceAlerts")
    if (savedAlerts) setPriceAlerts(JSON.parse(savedAlerts))
  }, [])

  // Save data to localStorage
  useEffect(() => {
    localStorage.setItem("cryptoFavorites", JSON.stringify(favorites))
  }, [favorites])

  useEffect(() => {
    localStorage.setItem("voiceSettings", JSON.stringify(voiceSettings))
  }, [voiceSettings])

  useEffect(() => {
    localStorage.setItem("priceAlerts", JSON.stringify(priceAlerts))
  }, [priceAlerts])

  const filteredCoins = coins.filter(coin =>
    coin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    coin.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const favoriteCoins = coins.filter(coin => favorites.includes(coin.id))

  const getConnectionStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected': return <Wifi className="w-4 h-4 text-emerald-500" />
      case 'connecting': return <Zap className="w-4 h-4 text-amber-500 animate-pulse" />
      case 'disconnected':
      case 'error':
      default: return <WifiOff className="w-4 h-4 text-red-500" />
    }
  }

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Real-time Connected'
      case 'connecting': return 'Connecting...'
      case 'disconnected': return 'Disconnected'
      case 'error': return 'Connection Error'
      default: return 'Unknown'
    }
  }

  return (
    <>
      <Head>
        <title>Vypto - Real-time Crypto Tracker with Voice Updates</title>
        <meta name="description" content="Track cryptocurrency prices in real-time with voice announcements and smart alerts using Binance WebSocket" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="min-h-screen bg-gradient-to-br from-neutral-50 via-blue-50/30 to-amber-50/20">
        {/* PWA Install Prompt */}
        <PWAInstallPrompt />
        
        <div className="container mx-auto px-4 py-8 max-w-[2000px]">
          <div className="mb-8 text-center space-y-4">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-2xl flex items-center justify-center shadow-lg">
                <Volume2 className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent">
                Vypto
              </h1>
            </div>
            <p className="text-lg text-neutral-600 max-w-2xl mx-auto leading-relaxed">
              Real-time cryptocurrency tracking with intelligent voice announcements powered by Binance WebSocket
            </p>
            
            <div className="flex items-center justify-center gap-4 flex-wrap">
              {/* Connection Status */}
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-sm rounded-full border border-neutral-200/60 shadow-sm">
                {getConnectionStatusIcon()}
                <span className="text-sm text-neutral-700">{getConnectionStatusText()}</span>
                {connectionStatus !== 'connected' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleReconnect}
                    className="w-6 h-6 p-0 ml-1 text-blue-500 hover:bg-blue-50 rounded-full"
                  >
                    <Zap className="w-3 h-3" />
                  </Button>
                )}
              </div>

              {/* Voice Status */}
              {speechSupported && (
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-sm rounded-full border border-neutral-200/60 shadow-sm">
                  {voiceSettings.enabled ? (
                    <div className="flex items-center gap-2">
                      <div className={cn("w-2 h-2 rounded-full", isAnnouncing ? "bg-red-500 animate-pulse" : "bg-green-500")}>
                      </div>
                      <span className="text-sm text-neutral-700">
                        Voice {isAnnouncing ? "Speaking" : "Active"}
                      </span>
                      {voiceSettings.selectedCoin && (
                        <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                          1 coin
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-neutral-400"></div>
                      <span className="text-sm text-neutral-600">Voice Inactive</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 bg-white/60 backdrop-blur-sm border border-neutral-200/60 rounded-2xl p-2 shadow-sm">
              <TabsTrigger value="dashboard" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm">
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="favorites" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm">
                Favorites
              </TabsTrigger>
              <TabsTrigger value="voice" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm">
                Voice Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="space-y-6">
              <Card className="bg-white/60 backdrop-blur-sm border-neutral-200/60 rounded-3xl">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-emerald-500" />
                    Real-time Market Overview
                    <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200 ml-auto">
                      Binance WebSocket
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    Live cryptocurrency prices updated in real-time via Binance WebSocket API
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Input
                      placeholder="Search cryptocurrencies..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="flex-1 bg-white border-neutral-200 rounded-xl"
                    />
                    <Button
                      onClick={handleReconnect}
                      disabled={connectionStatus === 'connecting'}
                      className="bg-gradient-to-r from-blue-500 to-emerald-500 hover:from-blue-600 hover:to-emerald-600 text-white rounded-xl px-6"
                    >
                      {connectionStatus === 'connecting' ? "Connecting..." : "Reconnect"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-4 md:gap-6">
                {loading ? (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <Card key={i} className="bg-white/60 backdrop-blur-sm border-neutral-200/60 rounded-3xl animate-pulse">
                        <CardContent className="p-6">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-neutral-200 rounded-full"></div>
                            <div className="space-y-2 flex-1">
                              <div className="h-4 bg-neutral-200 rounded w-1/2"></div>
                              <div className="h-3 bg-neutral-200 rounded w-1/3"></div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="h-6 bg-neutral-200 rounded w-2/3"></div>
                            <div className="h-4 bg-neutral-200 rounded w-1/2"></div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <ScrollArea className="h-[600px]">
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {filteredCoins.map((coin) => (
                        <CoinCard
                          key={coin.id}
                          coin={coin}
                          isFavorite={favorites.includes(coin.id)}
                          isInVoiceSelection={voiceSettings.selectedCoin === coin.id}
                          onToggleFavorite={() => toggleFavorite(coin.id)}
                          onToggleVoiceSelection={() => addToVoiceSelection(coin.id)}
                          onSpeak={() => speakPrice(coin)}
                          speechSupported={speechSupported}
                        />
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </TabsContent>

            <TabsContent value="favorites" className="space-y-6">
              <Card className="bg-white/60 backdrop-blur-sm border-neutral-200/60 shadow-lg rounded-3xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="w-5 h-5 text-red-500" />
                    Favorite Cryptocurrencies
                  </CardTitle>
                  <CardDescription>
                    Your selected cryptocurrencies for quick access
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {favoriteCoins.length === 0 ? (
                    <div className="text-center py-12 text-neutral-500">
                      <Heart className="w-12 h-12 mx-auto mb-4 text-neutral-300" />
                      <p className="text-lg mb-2">No favorites yet</p>
                      <p className="text-sm">Add cryptocurrencies to your favorites from the dashboard</p>
                    </div>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {favoriteCoins.map((coin) => (
                        <CoinCard
                          key={coin.id}
                          coin={coin}
                          isFavorite={true}
                          isInVoiceSelection={voiceSettings.selectedCoin === coin.id}
                          onToggleFavorite={() => toggleFavorite(coin.id)}
                          onToggleVoiceSelection={() => addToVoiceSelection(coin.id)}
                          onSpeak={() => speakPrice(coin)}
                          speechSupported={speechSupported}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="voice" className="space-y-6">
              <VoiceSettingsPanel
                voiceSettings={voiceSettings}
                setVoiceSettings={setVoiceSettings}
                coins={coins}
                speechSupported={speechSupported}
                onTestAnnouncement={announceSelectedCoins}
                isAnnouncing={isAnnouncing}
              />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </>
  )
}

function CoinCard({ 
  coin, 
  isFavorite, 
  isInVoiceSelection,
  onToggleFavorite, 
  onToggleVoiceSelection,
  onSpeak,
  speechSupported 
}: {
  coin: CryptoPrice
  isFavorite: boolean
  isInVoiceSelection: boolean
  onToggleFavorite: () => void
  onToggleVoiceSelection: () => void
  onSpeak: () => void
  speechSupported: boolean
}) {
  const priceChange = coin.price_change_percentage_24h
  const isPositive = priceChange > 0

  const openCoinGeckoChart = () => {
    window.open(`https://www.coingecko.com/en/coins/${coin.id}`, '_blank')
  }

  return (
    <Card className="group bg-white/80 backdrop-blur-sm border-neutral-200/60 hover:border-neutral-300/80 rounded-3xl transition-all duration-300 hover:shadow-xl hover:shadow-neutral-900/5 hover:-translate-y-1">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img 
                src={coin.image} 
                alt={coin.name}
                className="w-10 h-10 rounded-full"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://via.placeholder.com/40/3b82f6/ffffff?text=${coin.symbol.charAt(0).toUpperCase()}`
                }}
              />
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border border-white animate-pulse" title="Live data"></div>
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900 leading-tight">{coin.name}</h3>
              <p className="text-sm text-neutral-600 uppercase tracking-wide">{coin.symbol}</p>
            </div>
          </div>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={onToggleFavorite}
              className="w-8 h-8 p-0 hover:bg-red-50 rounded-full"
            >
              {isFavorite ? 
                <Heart className="w-4 h-4 text-red-500 fill-red-500" /> : 
                <HeartOff className="w-4 h-4 text-neutral-400" />
              }
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={openCoinGeckoChart}
              className="w-8 h-8 p-0 hover:bg-blue-50 rounded-full"
              title="View chart on CoinGecko"
            >
              <ExternalLink className="w-4 h-4 text-blue-500" />
            </Button>
            {speechSupported && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onToggleVoiceSelection}
                  className={cn(
                    "w-8 h-8 p-0 rounded-full",
                    isInVoiceSelection ? "bg-blue-50 hover:bg-blue-100" : "hover:bg-blue-50"
                  )}
                >
                  {isInVoiceSelection ? 
                    <Volume2 className="w-4 h-4 text-blue-500" /> : 
                    <VolumeX className="w-4 h-4 text-neutral-400" />
                  }
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onSpeak}
                  className="w-8 h-8 p-0 hover:bg-emerald-50 rounded-full"
                >
                  <Play className="w-4 h-4 text-emerald-500" />
                </Button>
              </>
            )}
          </div>
        </div>
        
        <div className="space-y-3">
          <div>
            <div className="text-2xl font-bold text-neutral-900">
              ${coin.current_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
            </div>
            <div className="flex items-center gap-2 mt-1">
              {isPositive ? (
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-500" />
              )}
              <span className={cn(
                "text-sm font-medium",
                isPositive ? "text-emerald-600" : "text-red-600"
              )}>
                {isPositive ? "+" : ""}{priceChange.toFixed(2)}%
              </span>
              <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                Live
              </Badge>
            </div>
          </div>
          
          <div className="text-xs text-neutral-500 space-y-1">
            <div className="flex justify-between">
              <span>Volume (24h):</span>
              <span>${(coin.volume_24h / 1000000).toFixed(0)}M</span>
            </div>
            <div className="flex justify-between">
              <span>Last Updated:</span>
              <span>{new Date(coin.last_updated).toLocaleTimeString()}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function VoiceSettingsPanel({
  voiceSettings,
  setVoiceSettings,
  coins,
  speechSupported,
  onTestAnnouncement,
  isAnnouncing
}: {
  voiceSettings: VoiceSettings
  setVoiceSettings: React.Dispatch<React.SetStateAction<VoiceSettings>>
  coins: CryptoPrice[]
  speechSupported: boolean
  onTestAnnouncement: () => void
  isAnnouncing: boolean
}) {
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([])
  
  useEffect(() => {
    const loadVoices = () => {
      if (speechSynthesis) {
        const voices = speechSynthesis.getVoices()
        setAvailableVoices(voices)
        console.log(`🔊 Loaded ${voices.length} voices for settings panel`)
        
        if (voices.length > 0) {
          voices.forEach(voice => {
            console.log(`Voice: ${voice.name} (${voice.lang}) - ${voice.localService ? 'Local' : 'Remote'}`)
          })
        }
      }
    }
    
    // Load voices immediately
    loadVoices()
    
    // Set up the event listener for when voices change
    if (speechSynthesis) {
      speechSynthesis.onvoiceschanged = loadVoices
    }
    
    // Also try loading voices after a delay (some browsers need this)
    const timeouts = [100, 500, 1000, 2000].map(delay => 
      setTimeout(loadVoices, delay)
    )
    
    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout))
    }
  }, [speechSupported])

  const getLanguageVoices = (language: string) => {
    const filtered = availableVoices.filter(voice => 
      voice.lang.startsWith(language.split('-')[0]) || 
      voice.lang === language
    )
    console.log(`🎯 Found ${filtered.length} voices for language ${language}`)
    return filtered
  }

  const availableLanguages = [
    { code: 'en-US', name: 'English (US)', flag: '🇺🇸' }, { code: 'en-GB', name: 'English (UK)', flag: '🇬🇧' },
    { code: 'es-ES', name: 'Spanish (Spain)', flag: '🇪🇸' }, { code: 'es-MX', name: 'Spanish (Mexico)', flag: '🇲🇽' },
    { code: 'fr-FR', name: 'French', flag: '🇫🇷' }, { code: 'de-DE', name: 'German', flag: '🇩🇪' },
    { code: 'it-IT', name: 'Italian', flag: '🇮🇹' }, { code: 'pt-BR', name: 'Portuguese (Brazil)', flag: '🇧🇷' },
    { code: 'pt-PT', name: 'Portuguese (Portugal)', flag: '🇵🇹' }, { code: 'ru-RU', name: 'Russian', flag: '🇷🇺' },
    { code: 'ja-JP', name: 'Japanese', flag: '🇯🇵' }, { code: 'ko-KR', name: 'Korean', flag: '🇰🇷' },
    { code: 'zh-CN', name: 'Chinese (Simplified)', flag: '🇨🇳' }, { code: 'zh-TW', name: 'Chinese (Traditional)', flag: '🇹🇼' },
    { code: 'hi-IN', name: 'Hindi', flag: '🇮🇳' }, { code: 'ar-SA', name: 'Arabic', flag: '🇸🇦' },
    { code: 'nl-NL', name: 'Dutch', flag: '🇳🇱' }, { code: 'sv-SE', name: 'Swedish', flag: '🇸🇪' },
    { code: 'da-DK', name: 'Danish', flag: '🇩🇰' }, { code: 'no-NO', name: 'Norwegian', flag: '🇳🇴' }
  ]

  const requestNotificationPermission = async () => {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission()
      console.log(`🔔 Notification permission: ${permission}`)
    }
  }

  const testVoice = () => {
    if (!speechSynthesis) {
      console.warn("❌ Speech synthesis not available for test")
      return
    }

    console.log("🧪 Testing voice synthesis...")
    
    // Clear any existing speech
    if (speechSynthesis.speaking) {
      speechSynthesis.cancel()
    }

    const testText = "Voice test successful. Vypto is ready."
    const utterance = new SpeechSynthesisUtterance(testText)
    utterance.rate = 0.9
    utterance.pitch = 1
    utterance.volume = 0.8
    utterance.lang = voiceSettings.language

    const voices = speechSynthesis.getVoices()
    const selectedVoice = voices.find(v => v.name === voiceSettings.voice) ||
                         voices.find(v => v.lang === voiceSettings.language) ||
                         voices.find(v => v.lang.startsWith(voiceSettings.language.split('-')[0])) ||
                         voices[0]
    
    if (selectedVoice) {
      utterance.voice = selectedVoice
      console.log(`🎯 Test using voice: ${selectedVoice.name}`)
    }

    utterance.onstart = () => console.log("🔊 Voice test started")
    utterance.onend = () => console.log("✅ Voice test completed")
    utterance.onerror = (event) => console.error("❌ Voice test error:", event.error)

    speechSynthesis.speak(utterance)
  }

  if (!speechSupported) {
    return (
      <Card className="bg-white/60 backdrop-blur-sm border-neutral-200/60 shadow-lg rounded-3xl">
        <CardContent className="p-8 text-center">
          <VolumeX className="w-16 h-16 mx-auto mb-4 text-neutral-300" />
          <h3 className="text-xl font-semibold text-neutral-700 mb-2">Speech Synthesis Not Supported</h3>
          <p className="text-neutral-600 mb-4">Your browser doesn't support speech synthesis. Try using Chrome, Firefox, or Safari.</p>
          <div className="text-sm text-neutral-500 bg-neutral-50 p-3 rounded-lg">
            <p><strong>Supported Browsers:</strong></p>
            <p>✅ Chrome/Chromium (recommended)</p>
            <p>✅ Firefox</p>
            <p>✅ Safari</p>
            <p>✅ Microsoft Edge</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="bg-white/60 backdrop-blur-sm border-neutral-200/60 shadow-lg rounded-3xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-blue-500" />
            Voice Announcement Settings
          </CardTitle>
          <CardDescription>Configure real-time voice updates for your selected cryptocurrencies</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="voice-enabled">Enable Voice Announcements</Label>
              <p className="text-sm text-neutral-600">Automatically announce price updates at set intervals</p>
            </div>
            <Switch
              id="voice-enabled"
              checked={voiceSettings.enabled}
              onCheckedChange={(checked) => {
                console.log(`🔧 Voice announcements ${checked ? 'enabled' : 'disabled'}`)
                setVoiceSettings(prev => ({ ...prev, enabled: checked }))
              }}
            />
          </div>

          {voiceSettings.enabled && (
            <>
              <Separator />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Voice Language</Label>
                  <Select
                    value={voiceSettings.language}
                    onValueChange={(value) => {
                      console.log(`🌍 Language changed to: ${value}`)
                      setVoiceSettings(prev => ({ ...prev, language: value, voice: 'default' }))
                    }}
                  >
                    <SelectTrigger className="bg-white border-neutral-200 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {availableLanguages.map(lang => (
                        <SelectItem key={lang.code} value={lang.code}>
                          <div className="flex items-center gap-2"><span>{lang.flag}</span>{lang.name}</div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Voice Selection</Label>
                  <Select
                    value={voiceSettings.voice}
                    onValueChange={(value) => {
                      console.log(`🎤 Voice changed to: ${value}`)
                      setVoiceSettings(prev => ({ ...prev, voice: value }))
                    }}
                  >
                    <SelectTrigger className="bg-white border-neutral-200 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent className="max-h-[200px]">
                      <SelectItem value="default">Default Voice</SelectItem>
                      {getLanguageVoices(voiceSettings.language).map(voice => (
                        <SelectItem key={voice.name} value={voice.name}>
                          <div className="flex items-center gap-2">
                            <span className="text-xs px-2 py-1 bg-neutral-100 rounded">
                              {voice.localService ? 'Local' : 'Cloud'}
                            </span>
                            {voice.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-neutral-500">
                    {availableVoices.length} total voices available • {getLanguageVoices(voiceSettings.language).length} for selected language
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="frequency">Announcement Frequency</Label>
                    <p className="text-sm text-neutral-600">How often to announce price changes (5s-1hr intervals available)</p>
                  </div>
                  <Select
                    value={voiceSettings.frequency.toString()}
                    onValueChange={(value) => {
                      console.log(`⏰ Frequency changed to: ${value} seconds`)
                      setVoiceSettings(prev => ({ ...prev, frequency: parseInt(value) }))
                    }}
                  >
                    <SelectTrigger className="bg-white border-neutral-200 rounded-xl w-48"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">Every 5 seconds</SelectItem>
                      <SelectItem value="10">Every 10 seconds</SelectItem>
                      <SelectItem value="15">Every 15 seconds</SelectItem>
                      <SelectItem value="30">Every 30 seconds</SelectItem>
                      <SelectItem value="60">Every 1 minute</SelectItem>
                      <SelectItem value="300">Every 5 minutes</SelectItem>
                      <SelectItem value="600">Every 10 minutes</SelectItem>
                      <SelectItem value="1800">Every 30 minutes</SelectItem>
                      <SelectItem value="3600">Every hour</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="include-crypto-names">Include Crypto Names</Label>
                    <p className="text-sm text-neutral-600">Include cryptocurrency names when announcing prices</p>
                  </div>
                  <Switch
                    id="include-crypto-names"
                    checked={voiceSettings.includeCryptoNames}
                    onCheckedChange={(checked) => {
                      console.log(`🏷️ Include crypto names ${checked ? 'enabled' : 'disabled'}`)
                      setVoiceSettings(prev => ({ ...prev, includeCryptoNames: checked }))
                    }}
                  />
                </div>

                <div className="flex gap-4">
                  <Button
                    onClick={testVoice}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl"
                  >
                    <Volume2 className="w-4 h-4 mr-2" /> Test Voice
                  </Button>
                  <Button
                    onClick={onTestAnnouncement}
                    disabled={voiceSettings.selectedCoin === '' || isAnnouncing}
                    className="bg-gradient-to-r from-blue-500 to-emerald-500 hover:from-blue-600 hover:to-emerald-600 text-white rounded-xl"
                  >
                    {isAnnouncing ? <><Pause className="w-4 h-4 mr-2" /> Speaking...</> : <><Play className="w-4 h-4 mr-2" /> Test Announcement</>}
                  </Button>
                  <Button
                    onClick={requestNotificationPermission}
                    variant="outline"
                    className="bg-transparent border-neutral-200 hover:bg-neutral-50 rounded-xl"
                  >
                    <Bell className="w-4 h-4 mr-2" /> Enable Notifications
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="bg-white/60 backdrop-blur-sm border-neutral-200/60 shadow-lg rounded-3xl">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2"><Settings className="w-5 h-5 text-emerald-500" /> Selected Coin for Voice Updates</span>
            <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200">{voiceSettings.selectedCoin ? '1 selected' : '0 selected'}</Badge>
          </CardTitle>
          <CardDescription>Choose which cryptocurrency you want to hear price updates for (single coin selection)</CardDescription>
        </CardHeader>
        <CardContent>
          {!voiceSettings.selectedCoin ? (
            <div className="text-center py-8 text-neutral-500">
              <Volume2 className="w-12 h-12 mx-auto mb-4 text-neutral-300" />
              <p className="text-lg mb-2">No coin selected for voice updates</p>
              <p className="text-sm">Add a coin from the dashboard by clicking the voice icon (single selection only)</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {(() => {
                const coin = coins.find(c => c.id === voiceSettings.selectedCoin)
                if (!coin) return null
                
                return (
                  <div key={coin.id} className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-emerald-50 rounded-2xl border border-blue-100">
                    <div className="flex items-center gap-3">
                      <img src={coin.image} alt={coin.name} className="w-8 h-8 rounded-full" />
                      <div>
                        <p className="font-medium text-neutral-900">{coin.name}</p>
                        <p className="text-sm text-neutral-600">${coin.current_price.toFixed(6)}</p>
                        <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200 text-xs mt-1">
                          Selected for voice
                        </Badge>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setVoiceSettings(prev => ({ ...prev, selectedCoin: '' }))}
                      className="w-8 h-8 p-0 hover:bg-red-50 text-red-500 rounded-full"
                    >
                      <VolumeX className="w-4 h-4" />
                    </Button>
                  </div>
                )
              })()}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
