import { useState, useEffect } from 'react'
import { Button, Card, Row, Col, Statistic, Tag, Spin, Space, Typography, Divider } from 'antd'
import { AppstoreOutlined, GithubOutlined, RocketOutlined } from '@ant-design/icons'
import { call } from '../bridge'
import { C, CARD_STYLE } from '../theme'

const { Title, Text } = Typography

interface AppInfo {
  name:    string
  version: string
  system:  string
  release: string
  machine: string
  python:  string
}

const GREETINGS = [
  '核桃核桃，补脑补脑！🧠✨',
  '今天也要像核桃一样坚硬可爱～🌰',
  '敲敲敲，把今天的任务都敲完吧！🔨',
  '核桃外壳硬，内心软，就像你一样贴心 💛',
  '工作顺利，下班吃核桃！🌰🌰🌰',
]

export default function SysInfo() {
  const [info, setInfo]       = useState<AppInfo | null>(null)
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(true)
  const [greeting]            = useState(() => GREETINGS[Math.floor(Math.random() * GREETINGS.length)])

  useEffect(() => {
    call<AppInfo>('get_app_info').then((res) => {
      if (res.success && res.data) setInfo(res.data)
      else setError(res.message ?? '获取失败')
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300, gap: 16 }}>
        <Spin size="large" />
        <Text type="secondary">正在读取系统信息…</Text>
      </div>
    )
  }

  if (!info) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <Text type="danger">获取失败 😢</Text>
        {error && <div style={{ marginTop: 8 }}><Text type="secondary" style={{ fontSize: 12 }}>{error}</Text></div>}
      </div>
    )
  }

  return (
    <Space orientation="vertical" size={20} style={{ width: '100%' }}>

      {/* 欢迎卡片 */}
      <Card
        style={{ ...CARD_STYLE, background: 'rgba(var(--wt), 0.1)', border: '1.5px solid rgba(var(--wt), 0.25)' }}
        styles={{ body: { padding: '18px 22px' } }}
      >
        <Space align="center" size={14}>
          <span style={{ fontSize: 36, animation: 'float 3s ease-in-out infinite', display: 'inline-block' }}>🌰</span>
          <div>
            <Text style={{ fontSize: 14, fontWeight: 600, color: C.primary }}>{greeting}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>{info.name} v{info.version} 运行中 🍃</Text>
          </div>
        </Space>
      </Card>

      {/* 应用信息 */}
      <Title level={5} style={{ color: C.primary, margin: 0 }}>🌰 应用信息</Title>
      <Row gutter={[14, 14]}>
        <Col span={12}>
          <Card style={CARD_STYLE} styles={{ body: { padding: '18px 22px' } }}>
            <Statistic
              title={<Space><AppstoreOutlined style={{ color: C.primary }} /> 应用名称</Space>}
              value={info.name}
              styles={{ content: { color: C.text, fontSize: 20, fontWeight: 700 } }}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card style={CARD_STYLE} styles={{ body: { padding: '18px 22px' } }}>
            <Statistic
              title={<Space><RocketOutlined style={{ color: C.primary }} /> 版本号</Space>}
              value={`v${info.version}`}
              styles={{ content: { color: C.primary, fontSize: 20, fontWeight: 700 } }}
            />
          </Card>
        </Col>
      </Row>

      <Divider style={{ borderColor: 'rgba(var(--wt), 0.15)', margin: '4px 0' }} />

      {/* 运行环境 */}
      <Title level={5} style={{ color: C.primary, margin: 0 }}>💻 运行环境</Title>
      <Row gutter={[14, 14]}>
        {([
          { emoji: '🖥️', label: '操作系统',   value: info.system,  tag: info.release, tagColor: 'warning'  },
          { emoji: '🔧', label: '处理器架构', value: info.machine, tag: 'Architecture', tagColor: 'default' },
          { emoji: '🐍', label: 'Python 版本', value: info.python, tag: 'CPython',     tagColor: 'success'  },
        ] as const).map(({ emoji, label, value, tag, tagColor }) => (
          <Col span={8} key={label}>
            <Card style={CARD_STYLE} styles={{ body: { padding: '16px 18px' } }}>
              <Space orientation="vertical" size={4}>
                <Space>
                  <span>{emoji}</span>
                  <Text type="secondary" style={{ fontSize: 12 }}>{label}</Text>
                </Space>
                <Text strong style={{ fontSize: 14, color: C.text }}>{value}</Text>
                <Tag color={tagColor} style={{ borderRadius: 20, fontSize: 11, marginTop: 2 }}>{tag}</Tag>
              </Space>
            </Card>
          </Col>
        ))}
      </Row>

      {/* 技术栈 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {['pywebview', 'React 18', 'Ant Design 6', 'Vite 5', 'SQLite', 'pystray'].map((item) => (
          <div key={item} style={{
            padding: '5px 14px',
            background: 'rgba(var(--wt), 0.08)',
            border: '1px solid rgba(var(--wt), 0.2)',
            borderRadius: 20,
            fontSize: 12,
            color: C.primary,
          }}>
            {item}
          </div>
        ))}
      </div>

      {/* GitHub 链接 */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          icon={<GithubOutlined />}
          type="link"
          style={{ color: C.primary, padding: 0, fontSize: 13 }}
          onClick={() => window.open('https://github.com/a605204746', '_blank')}
        >
          github.com/a605204746
        </Button>
      </div>
    </Space>
  )
}
