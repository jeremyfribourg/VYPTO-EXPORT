import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Download, X, Smartphone, Monitor, Zap } from "lucide-react"
import { cn } from "@/lib/utils"

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent
  }
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [installSource, setInstallSource] = useState<'browser' | 'mobile' | 'desktop'>('browser')

  useEffect(() => {
    // Check if app is already installed
    const checkInstalled = () => {
      if (typeof window !== "undefined") {
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                            (window.navigator as any)?.standalone ||
                            document.referrer.includes('android-app://');
        setIsInstalled(isStandalone)
        
        // Check device type
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
        const isDesktop = !isMobile && (navigator.userAgent.includes('Chrome') || navigator.userAgent.includes('Edge'))
        setInstallSource(isMobile ? 'mobile' : isDesktop ? 'desktop' : 'browser')
      }
    }

    checkInstalled()

    // Listen for beforeinstallprompt
    const handleBeforeInstallPrompt = (event: BeforeInstallPromptEvent) => {
      console.log('💾 PWA install prompt ready')
      event.preventDefault()
      setDeferredPrompt(event)
      setIsSupported(true)
      
      // Show prompt after a delay (better UX)
      setTimeout(() => {
        if (!isInstalled) {
          setShowPrompt(true)
        }
      }, 10000) // Show after 10 seconds
    }

    // Listen for app installed
    const handleAppInstalled = () => {
      console.log('✅ PWA was installed successfully')
      setIsInstalled(true)
      setShowPrompt(false)
      setDeferredPrompt(null)
      
      // Show success message
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(() => {
          console.log('🎉 PWA is now running as installed app!')
        })
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [isInstalled])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    console.log('📱 Triggering PWA install prompt')
    try {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      
      console.log(`PWA install prompt result: ${outcome}`)
      
      if (outcome === 'accepted') {
        console.log('✅ User accepted PWA installation')
      } else {
        console.log('❌ User dismissed PWA installation')
      }
    } catch (error) {
      console.error('❌ Error during PWA installation:', error)
    }
    
    setDeferredPrompt(null)
    setShowPrompt(false)
  }

  const handleDismiss = () => {
    console.log('🚫 PWA install prompt dismissed')
    setShowPrompt(false)
    // Don't show again for 24 hours
    localStorage.setItem('pwa-prompt-dismissed', Date.now().toString())
  }

  // Check if prompt was recently dismissed
  useEffect(() => {
    const dismissed = localStorage.getItem('pwa-prompt-dismissed')
    if (dismissed) {
      const dismissedTime = parseInt(dismissed)
      const now = Date.now()
      const dayInMs = 24 * 60 * 60 * 1000
      
      if (now - dismissedTime < dayInMs) {
        setShowPrompt(false)
        return
      }
    }
  }, [])

  // Don't show if already installed or not supported
  if (isInstalled || !isSupported || !showPrompt || !deferredPrompt) {
    return null
  }

  const getInstallInstructions = () => {
    switch (installSource) {
      case 'mobile':
        return {
          icon: <Smartphone className="w-5 h-5 text-blue-500" />,
          title: "Install Vypto on Mobile",
          description: "Add to your home screen for quick access and offline functionality",
          features: ["Offline access", "Push notifications", "Home screen icon", "Native app experience"]
        }
      case 'desktop':
        return {
          icon: <Monitor className="w-5 h-5 text-emerald-500" />,
          title: "Install Vypto on Desktop",
          description: "Get the native desktop experience with system integration",
          features: ["Desktop notifications", "System tray integration", "Offline functionality", "Faster performance"]
        }
      default:
        return {
          icon: <Download className="w-5 h-5 text-purple-500" />,
          title: "Install Vypto App",
          description: "Enjoy better performance and offline access",
          features: ["Faster loading", "Offline access", "Native experience", "Auto-updates"]
        }
    }
  }

  const instructions = getInstallInstructions()

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-50 animate-in slide-in-from-bottom-2 fade-in duration-300">
      <Card className="bg-gradient-to-br from-white to-blue-50/50 backdrop-blur-lg border-blue-200/60 shadow-xl shadow-blue-900/10">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {instructions.icon}
              <div>
                <CardTitle className="text-sm font-semibold text-neutral-900 leading-tight">
                  {instructions.title}
                </CardTitle>
                <CardDescription className="text-xs text-neutral-600 mt-1">
                  {instructions.description}
                </CardDescription>
              </div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDismiss}
              className="w-6 h-6 p-0 rounded-full text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1">
              {instructions.features.map((feature, index) => (
                <Badge 
                  key={index}
                  variant="secondary" 
                  className="bg-blue-50 text-blue-700 border-blue-200 text-xs px-2 py-1"
                >
                  {feature}
                </Badge>
              ))}
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={handleInstallClick}
                className={cn(
                  "flex-1 text-white text-sm font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-200",
                  installSource === 'mobile' ? "bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600" :
                  installSource === 'desktop' ? "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600" :
                  "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                )}
              >
                <Download className="w-4 h-4 mr-2" />
                Install Now
              </Button>
              <Button
                variant="outline"
                onClick={handleDismiss}
                className="px-3 text-xs text-neutral-600 border-neutral-200 hover:bg-neutral-50 rounded-xl"
              >
                Later
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
