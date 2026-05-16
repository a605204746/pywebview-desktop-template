import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { call } from '../bridge'

export interface LicenseInfo {
  fingerprint:  string
  expires_at:   string
  license_type: string
  user:         string
}

interface LicenseState {
  status:      'checking' | 'authorized' | 'unauthorized'
  info:        LicenseInfo | null
  fingerprint: string
  message:     string
}

interface LicenseContextType extends LicenseState {
  activate: (key: string) => Promise<{ success: boolean; message?: string }>
  clear:    () => Promise<void>
}

const LicenseContext = createContext<LicenseContextType>({
  status: 'checking', info: null, fingerprint: '', message: '',
  activate: async () => ({ success: false }),
  clear:    async () => {},
})

export function LicenseProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LicenseState>({
    status: 'checking', info: null, fingerprint: '', message: '',
  })

  const refresh = useCallback(async () => {
    const res = await call<Record<string, unknown>>('get_license_status')
    if (!res.success || !res.data) {
      setState(s => ({ ...s, status: 'unauthorized', message: res.message ?? '' }))
      return
    }
    const d = res.data
    const fp = (d.fingerprint as string) ?? ''
    if (d.authorized) {
      setState({
        status: 'authorized',
        fingerprint: fp,
        message: '',
        info: {
          fingerprint:  fp,
          expires_at:   d.expires_at   as string,
          license_type: d.license_type as string,
          user:         d.user         as string,
        },
      })
    } else {
      setState({
        status: 'unauthorized',
        fingerprint: fp,
        message: (d.message as string) ?? '',
        info: null,
      })
    }
  }, [])

  // 启动时检查一次，之后每分钟轮询一次
  useEffect(() => {
    refresh()
    const timer = setInterval(refresh, 60_000)
    return () => clearInterval(timer)
  }, [refresh])

  const activate = useCallback(async (key: string) => {
    const res = await call<Record<string, unknown>>('verify_license', key)
    if (res.success && res.data) {
      const d = res.data
      setState(s => ({
        status: 'authorized',
        fingerprint: s.fingerprint,
        message: '',
        info: {
          fingerprint:  s.fingerprint,
          expires_at:   d.expires_at   as string,
          license_type: d.license_type as string,
          user:         d.user         as string,
        },
      }))
      return { success: true }
    }
    return { success: false, message: res.message ?? '激活失败' }
  }, [])

  const clear = useCallback(async () => {
    await call('clear_license')
    setState(s => ({ ...s, status: 'unauthorized', info: null, message: '授权码已清除' }))
  }, [])

  return (
    <LicenseContext.Provider value={{ ...state, activate, clear }}>
      {children}
    </LicenseContext.Provider>
  )
}

export function useLicense(): LicenseContextType {
  return useContext(LicenseContext)
}
