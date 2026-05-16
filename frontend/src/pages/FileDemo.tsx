import { useRef, useState } from 'react'
import { Button, Space, Tag, Empty, App, Typography } from 'antd'
import { FolderOpenOutlined, ReadOutlined, ClearOutlined, FileTextOutlined } from '@ant-design/icons'
import { C, CARD_STYLE } from '../theme'

const { Text } = Typography

const EXT_COLOR: Record<string, string> = {
  txt: 'blue', md: 'cyan', json: 'orange',
  csv: 'green', log: 'purple', py: 'volcano',
  js: 'gold', ts: 'geekblue',
}

const ACCEPT = '.txt,.md,.json,.csv,.log,.py,.toml,.yaml,.yml,.ini,.xml,.html,.css,.js,.ts'

export default function FileDemo() {
  const { message } = App.useApp()
  const inputRef              = useRef<HTMLInputElement>(null)
  const [file, setFile]       = useState<File | null>(null)
  const [content, setContent] = useState('')
  const [reading, setReading] = useState(false)

  const ext = file ? file.name.split('.').pop()?.toLowerCase() ?? '' : ''

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f); setContent('')
    void message.info(`已选择：${f.name} 📄`)
    e.target.value = ''
  }

  function handleRead() {
    if (!file) return
    setReading(true)
    const reader = new FileReader()
    reader.onload  = (e) => { setContent(e.target?.result as string); setReading(false); void message.success('读取成功 🌰') }
    reader.onerror = ()  => { setReading(false); void message.error('读取失败 😢') }
    reader.readAsText(file, 'utf-8')
  }

  function handleClear() {
    setFile(null); setContent('')
    void message.info('已清除 🧹')
  }

  return (
    <Space orientation="vertical" size={18} style={{ width: '100%' }}>

      <input ref={inputRef} type="file" accept={ACCEPT} style={{ display: 'none' }} onChange={handleFileChange} />

      <div style={{ ...CARD_STYLE, padding: '18px 22px' }}>
        <Space orientation="vertical" size={14} style={{ width: '100%' }}>
          <Space wrap>
            <Button type="primary" shape="round" icon={<FolderOpenOutlined />} onClick={() => inputRef.current?.click()}>
              选择文件
            </Button>
            <Button
              shape="round" icon={<ReadOutlined />} onClick={handleRead} disabled={!file} loading={reading}
              style={file ? { borderColor: 'rgba(var(--wt), 0.5)', color: C.text } : {}}
            >
              读取内容
            </Button>
            {(file || content) && (
              <Button shape="round" icon={<ClearOutlined />} onClick={handleClear}>清除</Button>
            )}
          </Space>

          {file && (
            <div style={{
              padding: '10px 14px',
              background: 'rgba(var(--wt), 0.06)',
              borderRadius: 10,
              border: '1px dashed rgba(var(--wt), 0.35)',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <FileTextOutlined style={{ color: C.primary, fontSize: 16 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <Text strong style={{ color: C.text, display: 'block' }}>{file.name}</Text>
                <Text type="secondary" style={{ fontSize: 11 }}>{(file.size / 1024).toFixed(1)} KB</Text>
              </div>
              <Tag color={EXT_COLOR[ext] ?? 'default'} style={{ borderRadius: 20, flexShrink: 0 }}>.{ext}</Tag>
            </div>
          )}
        </Space>
      </div>

      {content ? (
        <div style={CARD_STYLE}>
          <div style={{ padding: '10px 18px', borderBottom: '1px solid rgba(var(--wt), 0.12)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span>📖</span>
            <Text strong style={{ color: C.text }}>文件内容</Text>
            <Tag color="warning" style={{ borderRadius: 20, fontSize: 11 }}>{content.length.toLocaleString()} 字符</Tag>
          </div>
          <div style={{ maxHeight: 380, overflowY: 'auto', padding: '14px 18px' }}>
            <pre style={{
              margin: 0, fontFamily: '"Consolas","Monaco","JetBrains Mono",monospace',
              fontSize: 13, lineHeight: 1.7, color: C.text, whiteSpace: 'pre-wrap', wordBreak: 'break-all',
            }}>
              {content}
            </pre>
          </div>
        </div>
      ) : (
        !file && (
          <div style={{ ...CARD_STYLE, textAlign: 'center', padding: '40px 24px' }}>
            <Empty
              image={<span style={{ fontSize: 48 }}>📂</span>}
              styles={{ image: { height: 60 } }}
              description={
                <Space orientation="vertical" size={4}>
                  <Text type="secondary">选择一个文件来读取内容</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>支持 txt · md · json · csv · py 等文本格式</Text>
                </Space>
              }
            />
          </div>
        )
      )}
    </Space>
  )
}
