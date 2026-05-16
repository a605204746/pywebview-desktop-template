import { useEffect, useState, type ReactNode } from 'react'
import { Card, Switch, Button, Space, App, Divider, Typography } from 'antd'
import { FolderOpenOutlined, InfoCircleOutlined, ThunderboltOutlined, BulbOutlined, BulbFilled } from '@ant-design/icons'
import { call } from '../bridge'
import { C, CARD_STYLE } from '../theme'
import { useTheme } from '../contexts/ThemeContext'

const { Text } = Typography

interface SettingRowProps {
  icon:    ReactNode
  label:   string
  desc?:   string
  control: ReactNode
}

function SettingRow({ icon, label, desc, control }: SettingRowProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0' }}>
      <Space align="start">
        <span style={{ fontSize: 18, lineHeight: 1, marginTop: 2 }}>{icon}</span>
        <div>
          <Text strong style={{ fontSize: 13, color: C.text }}>{label}</Text>
          {desc && <div><Text type="secondary" style={{ fontSize: 11 }}>{desc}</Text></div>}
        </div>
      </Space>
      <div style={{ flexShrink: 0, marginLeft: 16 }}>{control}</div>
    </div>
  )
}

export default function Settings() {
  const { message } = App.useApp()
  const { isDark, toggleTheme } = useTheme()
  const [autostart, setAutostart] = useState(false)
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    call<boolean>('get_autostart').then((res) => {
      if (res.success && res.data !== undefined) setAutostart(res.data)
      setLoading(false)
    })
  }, [])

  async function handleAutostart(enabled: boolean) {
    const res = await call('set_autostart', enabled)
    if (res.success) { setAutostart(enabled); void message.success(enabled ? '已开启开机自启 🚀' : '已关闭开机自启') }
    else void message.warning(res.message ?? '操作失败')
  }

  async function handleOpenLog() {
    const res = await call('open_log_dir')
    if (!res.success) void message.error(res.message ?? '打开失败')
    else void message.success('已打开日志目录 📂')
  }

  return (
    <Space orientation="vertical" size={18} style={{ width: '100%' }}>

      {/* 外观 */}
      <Card
        title={<Space><BulbOutlined style={{ color: C.primary }} /><Text strong style={{ color: C.text }}>外观</Text></Space>}
        style={CARD_STYLE}
        styles={{ header: { borderBottom: '1px solid rgba(var(--wt), 0.12)' } }}
      >
        <SettingRow
          icon={isDark ? '🌙' : '☀️'}
          label="深色模式"
          desc="切换深色 / 浅色主题"
          control={
            <Switch
              checked={isDark}
              onChange={toggleTheme}
              checkedChildren={<BulbFilled />}
              unCheckedChildren={<BulbOutlined />}
              style={isDark ? { background: 'rgb(var(--wt))' } : {}}
            />
          }
        />
      </Card>

      {/* 系统设置 */}
      <Card
        title={<Space><ThunderboltOutlined style={{ color: C.primary }} /><Text strong style={{ color: C.text }}>系统设置</Text></Space>}
        style={CARD_STYLE}
        styles={{ header: { borderBottom: '1px solid rgba(var(--wt), 0.12)' } }}
      >
        <SettingRow
          icon="🚀"
          label="开机自启"
          desc="仅打包版本支持，开发模式下无效"
          control={
            <Switch
              checked={autostart}
              loading={loading}
              onChange={(v) => { void handleAutostart(v) }}
              style={autostart ? { background: 'rgb(var(--wt))' } : {}}
            />
          }
        />
      </Card>

      {/* 诊断工具 */}
      <Card
        title={<Space><InfoCircleOutlined style={{ color: C.primary }} /><Text strong style={{ color: C.text }}>诊断工具</Text></Space>}
        style={CARD_STYLE}
        styles={{ header: { borderBottom: '1px solid rgba(var(--wt), 0.12)' } }}
      >
        <SettingRow
          icon="📋"
          label="日志文件"
          desc="在文件管理器中打开日志目录"
          control={
            <Button shape="round" icon={<FolderOpenOutlined />} onClick={() => { void handleOpenLog() }} style={{ borderColor: 'rgba(var(--wt), 0.5)', color: C.text }}>
              打开目录
            </Button>
          }
        />
      </Card>

      {/* 关于 */}
      <Card
        title={<Space><span>🌰</span><Text strong style={{ color: C.text }}>关于</Text></Space>}
        style={CARD_STYLE}
        styles={{ header: { borderBottom: '1px solid rgba(var(--wt), 0.12)' } }}
      >
        <Space orientation="vertical" size={8} style={{ width: '100%' }}>
          {([
            ['基于',       'pywebview + React + Ant Design'],
            ['语言',       'TypeScript + Python'],
            ['主题',       '核桃棕 Q萌风格 🌰'],
            ['Powered by', 'Python 🐍 + Vite ⚡'],
          ] as const).map(([k, v]) => (
            <div key={k} style={{ display: 'flex', gap: 16 }}>
              <Text type="secondary" style={{ minWidth: 60, fontSize: 12 }}>{k}</Text>
              <Text style={{ color: C.text, fontSize: 12 }}>{v}</Text>
            </div>
          ))}
          <Divider style={{ borderColor: 'rgba(var(--wt), 0.15)', margin: '8px 0' }} />
          <Text type="secondary" style={{ fontSize: 12, textAlign: 'center', display: 'block' }}>
            Made with 🌰 · Stay warm & productive!
          </Text>
        </Space>
      </Card>
    </Space>
  )
}
