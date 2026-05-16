import { useEffect, useState } from 'react'

export interface CountdownResult {
  days:    number
  hours:   number
  minutes: number
  seconds: number
  expired: boolean
}

export function useCountdown(expiresAt: string | null): CountdownResult {
  const calc = (): CountdownResult => {
    if (!expiresAt) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: false }

    const diff = new Date(expiresAt).getTime() - Date.now()
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true }

    const total   = Math.floor(diff / 1000)
    const days    = Math.floor(total / 86400)
    const hours   = Math.floor((total % 86400) / 3600)
    const minutes = Math.floor((total % 3600) / 60)
    const seconds = total % 60
    return { days, hours, minutes, seconds, expired: false }
  }

  const [state, setState] = useState<CountdownResult>(calc)

  useEffect(() => {
    if (!expiresAt) return
    setState(calc())
    const timer = setInterval(() => setState(calc()), 1000)
    return () => clearInterval(timer)
  }, [expiresAt])

  return state
}
