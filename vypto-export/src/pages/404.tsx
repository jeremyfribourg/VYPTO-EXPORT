import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Home, ArrowLeft } from "lucide-react"

export default function Custom404() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-blue-50/30 to-amber-50/20 flex items-center justify-center px-4">
      <div className="text-center space-y-6">
        <div className="space-y-4">
          <h1 className="text-6xl font-bold text-neutral-900">404</h1>
          <h2 className="text-2xl font-semibold text-neutral-700">Page Not Found</h2>
          <p className="text-neutral-600 max-w-md mx-auto">
            The page you're looking for doesn't exist. Let's get you back to tracking crypto prices!
          </p>
        </div>
        
        <div className="flex gap-4 justify-center">
          <Button asChild className="bg-gradient-to-r from-blue-500 to-emerald-500 hover:from-blue-600 hover:to-emerald-600 text-white">
            <Link href="/">
              <Home className="w-4 h-4 mr-2" />
              Go Home
            </Link>
          </Button>
          <Button variant="outline" onClick={() => window.history.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    </div>
  )
}
