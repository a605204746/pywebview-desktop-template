import React from 'react'
import ReactDOM from 'react-dom/client'
import { App as AntApp, ConfigProvider, theme as antdTheme } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { ThemeProvider, useTheme } from './contexts/ThemeContext'
import { LicenseProvider } from './contexts/LicenseContext'
import AppRoot from './App'
import './styles/global.css'

function ThemedApp() {
  const { isDark } = useTheme()

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          colorPrimary:       isDark ? '#78B996' : '#4E8B6F',
          colorInfo:          isDark ? '#78B996' : '#4E8B6F',
          colorSuccess:       '#52c41a',
          colorWarning:       '#ffa940',
          colorError:         '#ff4d4f',
          borderRadius:       12,
          borderRadiusLG:     16,
          borderRadiusSM:     8,
          fontFamily:         '-apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", "PingFang SC", sans-serif',
        },
        components: {
          Menu: {
            itemBg:            'transparent',
            subMenuItemBg:     'transparent',
            itemSelectedBg:    'rgba(var(--wt), 0.14)',
            itemSelectedColor: isDark ? '#A0D4B5' : '#2D6248',
            itemHoverBg:       'rgba(var(--wt), 0.08)',
            itemHoverColor:    isDark ? '#78B996' : '#4E8B6F',
            itemColor:         isDark ? '#7AB090' : '#527A62',
            groupTitleColor:   isDark ? '#78B996' : '#4E8B6F',
          },
          Button:   { borderRadius: 20, controlHeight: 36 },
          Card:     { borderRadius: 16 },
          Input:    { borderRadius: 10 },
          Segmented:{ borderRadius: 20 },
          Switch:   {},
        },
      }}
    >
      <AntApp>
        <LicenseProvider>
          <AppRoot />
        </LicenseProvider>
      </AntApp>
    </ConfigProvider>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <ThemedApp />
    </ThemeProvider>
  </React.StrictMode>,
)
