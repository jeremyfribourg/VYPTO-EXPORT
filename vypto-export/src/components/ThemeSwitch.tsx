import React from "react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Moon, Sun, Monitor } from "lucide-react"
import { cn } from "@/lib/utils"

export function ThemeSwitch({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme()

  const toggleTheme = () => {
    if (theme === "dark") {
      setTheme("light")
    } else if (theme === "light") {
      setTheme("system")
    } else {
      setTheme("dark")
    }
  }

  const getIcon = () => {
    switch (theme) {
      case "dark":
        return <Moon className="w-4 h-4" />
      case "light":
        return <Sun className="w-4 h-4" />
      default:
        return <Monitor className="w-4 h-4" />
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      className={cn("w-8 h-8 p-0 rounded-full", className)}
      title={`Current theme: ${theme}. Click to cycle themes.`}
    >
      {getIcon()}
    </Button>
  )
}
