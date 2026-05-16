import { useState } from 'react'
import { Layout, Menu, Space, Spin, Tooltip } from 'antd'
import type { MenuProps } from 'antd'
import {
  DashboardOutlined,
  FolderOpenOutlined,
  EditOutlined,
  CodeOutlined,
  BgColorsOutlined,
  KeyOutlined,
  CalculatorOutlined,
  BulbOutlined,
  BulbFilled,
  AuditOutlined,
} from '@ant-design/icons'
import { useTheme } from './contexts/ThemeContext'
import { useLicense } from './contexts/LicenseContext'
import ErrorBoundary from './components/ErrorBoundary'
import LicenseDemo from './pages/LicenseDemo'
import SysInfo    from './pages/SysInfo'
import FileDemo   from './pages/FileDemo'
import Notes      from './pages/Notes'
import JsonTool   from './pages/JsonTool'
import ColorTool  from './pages/ColorTool'
import Encoder    from './pages/Encoder'
import Calculator from './pages/Calculator'

const { Sider, Content } = Layout

type PageKey = 'sysinfo' | 'filedemo' | 'json' | 'color' | 'encoder' | 'calculator' | 'notes' | 'licensedemo'

const MENU_ITEMS: MenuProps['items'] = [
  {
    type: 'group',
    label: '🌰 常用',
    children: [
      { key: 'sysinfo',  icon: <DashboardOutlined />, label: '系统信息' },
      { key: 'filedemo', icon: <FolderOpenOutlined />, label: '文件读取' },
    ],
  },
  {
    type: 'group',
    label: '🔧 工具箱',
    children: [
      { key: 'json',       icon: <CodeOutlined />,       label: 'JSON 工具' },
      { key: 'color',      icon: <BgColorsOutlined />,   label: '颜色工具' },
      { key: 'encoder',    icon: <KeyOutlined />,        label: '编解码'   },
      { key: 'calculator', icon: <CalculatorOutlined />, label: '计算器'   },
    ],
  },
  {
    type: 'group',
    label: '📌 工作区',
    children: [
      { key: 'notes', icon: <EditOutlined />, label: '便签本' },
    ],
  },
  {
    type: 'group',
    label: '⚙️ 系统',
    children: [
      { key: 'licensedemo', icon: <AuditOutlined />, label: '加密授权' },
    ],
  },
]

const PAGE_MAP: Record<PageKey, React.ReactNode> = {
  sysinfo:     <SysInfo />,
  filedemo:    <FileDemo />,
  json:        <JsonTool />,
  color:       <ColorTool />,
  encoder:     <Encoder />,
  calculator:  <Calculator />,
  notes:       <Notes />,
  licensedemo: <LicenseDemo />,
}

export default function App() {
  const [tab, setTab] = useState<PageKey>('sysinfo')
  const { isDark, toggleTheme } = useTheme()
  const { status } = useLicense()

  // 等待授权状态初始化（短暂）
  if (status === 'checking') {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--content-bg)' }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <Layout style={{ height: '100vh' }}>
      <Sider
        width={204}
        style={{
          background:     'var(--sidebar-bg)',
          borderRight:    '1.5px solid rgba(var(--wt), 0.2)',
          display:        'flex',
          flexDirection:  'column',
          transition:     'background 0.25s',
        }}
      >
        {/* Logo */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(var(--wt), 0.15)', userSelect: 'none' }}>
          <Space align="center" size={10}>
            <span className="float-emoji" style={{ fontSize: 26, lineHeight: 1 }}>🌰</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: 'rgb(var(--wt-text))', lineHeight: 1.3 }}>核桃小窝</div>
              <div style={{ fontSize: 10, color: 'rgb(var(--wt-sub))' }}>Desktop Template</div>
            </div>
          </Space>
        </div>

        {/* 菜单 */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          <Menu
            mode="inline"
            selectedKeys={[tab]}
            items={MENU_ITEMS}
            onClick={({ key }) => setTab(key as PageKey)}
            style={{ border: 'none', background: 'transparent', marginTop: 4, fontSize: 13 }}
          />
        </div>

        {/* 底部：主题切换 */}
        <div style={{ padding: '10px 16px 14px', borderTop: '1px solid rgba(var(--wt), 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 15, letterSpacing: 3, opacity: 0.4 }}>🍂🌰🍁</span>
          <Tooltip title={isDark ? '切换浅色' : '切换深色'} placement="right">
            <div
              onClick={toggleTheme}
              style={{
                width: 28, height: 28,
                borderRadius: '50%',
                background:   'rgba(var(--wt), 0.12)',
                border:       '1px solid rgba(var(--wt), 0.25)',
                display:      'flex',
                alignItems:   'center',
                justifyContent: 'center',
                cursor:       'pointer',
                fontSize:     14,
                color:        'rgb(var(--wt))',
                transition:   'all 0.2s',
              }}
            >
              {isDark ? <BulbFilled /> : <BulbOutlined />}
            </div>
          </Tooltip>
        </div>
      </Sider>

      <Content style={{ background: 'var(--content-bg)', overflow: 'auto', padding: '26px 30px', transition: 'background 0.25s' }}>
        <ErrorBoundary key={tab}>
          {PAGE_MAP[tab]}
        </ErrorBoundary>
      </Content>
    </Layout>
  )
}
