"use client"

import { useEffect, useRef, useState } from "react"
import { AlertTriangle, CheckCircle2, Info } from "lucide-react"

type Notice = {
  type: "success" | "error" | "info"
  message: string
} | null

type AutoDismissNoticeProps = {
  notice: Notice
  onDismiss: () => void
  className?: string
}

export function AutoDismissNotice({ notice, onDismiss, className = "" }: AutoDismissNoticeProps) {
  const [isVisible, setIsVisible] = useState(false)
  const onDismissRef = useRef(onDismiss)

  useEffect(() => {
    onDismissRef.current = onDismiss
  }, [onDismiss])

  useEffect(() => {
    if (!notice) return

    setIsVisible(true)

    const hideTimerId = window.setTimeout(() => {
      setIsVisible(false)
    }, 15000)
    const removeTimerId = window.setTimeout(() => {
      onDismissRef.current()
    }, 15300)

    return () => {
      window.clearTimeout(hideTimerId)
      window.clearTimeout(removeTimerId)
    }
  }, [notice])

  if (!notice) return null

  const styles = {
    success: "border-green-200 bg-green-50 text-green-700",
    error: "border-red-200 bg-red-50 text-red-700",
    info: "border-blue-200 bg-blue-50 text-blue-700",
  }
  const Icon = notice.type === "success"
    ? CheckCircle2
    : notice.type === "error"
      ? AlertTriangle
      : Info

  return (
    <div
      className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-all duration-300 ease-out ${styles[notice.type]} ${className} ${
        isVisible ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"
      }`}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <span className="flex-1">{notice.message}</span>
    </div>
  )
}
