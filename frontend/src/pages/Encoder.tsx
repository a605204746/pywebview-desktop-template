import { useState } from 'react'
import { Button, Space, Segmented, App, Typography } from 'antd'
import { UploadOutlined, DownloadOutlined, CopyOutlined, ClearOutlined, SwapOutlined } from '@ant-design/icons'
import { C, CARD_STYLE } from '../theme'
import type { CSSProperties } from 'react'

const { Text } = Typography

type ModeKey = 'base64' | 'url' | 'html' | 'unicode'

const TEXTAREA_STYLE: CSSProperties = {
  flex: 1,
  width: '100%',
  background: 'transparent',
  border: 'none',
  outline: 'none',
  color: C.text,
  fontFamily: '"JetBrains Mono","Consolas","Monaco",monospace',
  fontSize: 12,
  lineHeight: 1.75,
  padding: '14px 16px',
  resize: 'none',
  minHeight: 180,
}

const PANEL_STYLE: CSSProperties = {
  background: 'rgba(var(--bg-card), 0.88)',
  border: '1.5px solid rgba(var(--wt), 0.18)',
  borderRadius: 12,
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  overflow: 'hidden',
}

const ENCODERS: Record<ModeKey, { encode: (s: string) => string; decode: (s: string) => string }> = {
  base64: {
    encode: (s) => btoa(unescape(encodeURIComponent(s))),
    decode: (s) => decodeURIComponent(escape(atob(s))),
  },
  url: {
    encode: encodeURIComponent,
    decode: decodeURIComponent,
  },
  html: {
    encode: (s) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#x27;'),
    decode: (s) => s.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#x27;/g,"'"),
  },
  unicode: {
    encode: (s) => s.split('').map((c) => c.charCodeAt(0) > 127 ? `\\u${c.charCodeAt(0).toString(16).padStart(4,'0')}` : c).join(''),
    decode: (s) => s.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h,16))),
  },
}

const MODE_LABELS: Record<ModeKey, string> = { base64: 'Base64', url: 'URL编码', html: 'HTML实体', unicode: 'Unicode' }
const MODE_DESC:   Record<ModeKey, string> = { base64: 'RFC 4648 标准编码', url: '百分号编码 (RFC 3986)', html: '& < > " \' 实体转义', unicode: '\\uXXXX 转义序列' }

export default function Encoder() {
  const { message } = App.useApp()
  const [mode, setMode]     = useState<ModeKey>('base64')
  const [input, setInput]   = useState('')
  const [output, setOutput] = useState('')
  const [errMsg, setErrMsg] = useState('')

  function run(op: 'encode' | 'decode') {
    if (!input.trim()) { void message.warning('内容不能为空哦 🥺'); return }
    try {
      setOutput(ENCODERS[mode][op](input))
      setErrMsg('')
    } catch (e) {
      setErrMsg((e as Error).message)
      setOutput('')
    }
  }

  function handleSwap()  { setInput(output); setOutput(''); setErrMsg('') }
  function handleCopy()  { if (output) void navigator.clipboard.writeText(output).then(() => { void message.success('已复制 🌰') }) }
  function handleClear() { setInput(''); setOutput(''); setErrMsg('') }

  return (
    <Space orientation="vertical" size={14} style={{ width: '100%' }}>

      {/* 模式 + 工具栏 */}
      <div style={{ ...CARD_STYLE, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <Segmented
          value={mode}
          onChange={(v) => { setMode(v as ModeKey); setOutput(''); setErrMsg('') }}
          options={Object.entries(MODE_LABELS).map(([k,v]) => ({ value: k, label: v }))}
          style={{ borderRadius: 20 }}
        />
        <Space size={6} style={{ marginLeft: 'auto' }}>
          <Button size="small" shape="round" icon={<UploadOutlined />} type="primary" onClick={() => run('encode')}>编码</Button>
          <Button size="small" shape="round" icon={<DownloadOutlined />} onClick={() => run('decode')}>解码</Button>
          <Button size="small" shape="round" icon={<SwapOutlined />} onClick={handleSwap} disabled={!output}>互换</Button>
          <Button size="small" shape="round" icon={<CopyOutlined />} onClick={handleCopy} disabled={!output}>复制</Button>
          <Button size="small" shape="round" icon={<ClearOutlined />} onClick={handleClear} danger>清空</Button>
        </Space>
      </div>

      {/* 模式说明 */}
      <div style={{ fontSize: 11, color: C.sub, padding: '0 2px' }}>
        🌰 当前模式：<Text style={{ color: C.primary, fontWeight: 600 }}>{MODE_LABELS[mode]}</Text>
        <span style={{ marginLeft: 8, color: 'rgba(var(--wt-sub), 0.7)' }}>— {MODE_DESC[mode]}</span>
      </div>

      {/* 错误提示 */}
      {errMsg && (
        <div style={{ padding: '8px 14px', background: 'rgba(255,77,79,0.08)', border: '1px solid rgba(255,77,79,0.25)', borderRadius: 10, color: C.red, fontSize: 12 }}>
          ⚠️ {errMsg}
        </div>
      )}

      {/* 双栏 */}
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={PANEL_STYLE}>
          <div style={{ padding: '8px 14px', borderBottom: '1px solid rgba(var(--wt), 0.12)', fontSize: 11, color: C.sub }}>
            📥 输入内容
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="在这里输入需要编码或解码的内容..."
            spellCheck={false}
            style={TEXTAREA_STYLE}
          />
        </div>
        <div style={PANEL_STYLE}>
          <div style={{ padding: '8px 14px', borderBottom: '1px solid rgba(var(--wt), 0.12)', fontSize: 11, color: C.sub }}>
            📤 处理结果
          </div>
          <textarea
            value={output}
            readOnly
            placeholder="结果会显示在这里..."
            spellCheck={false}
            style={{ ...TEXTAREA_STYLE, color: C.green }}
          />
        </div>
      </div>
    </Space>
  )
}
