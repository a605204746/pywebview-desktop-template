import { useState } from 'react'
import { Button, Space, App, Tag, Typography } from 'antd'
import { FormatPainterOutlined, CompressOutlined, CheckCircleOutlined, ClearOutlined, CopyOutlined } from '@ant-design/icons'
import { C, CARD_STYLE } from '../theme'

const { Text } = Typography

const PANEL_STYLE: React.CSSProperties = {
  background: 'rgba(var(--bg-card), 0.88)',
  border: '1.5px solid rgba(var(--wt), 0.18)',
  borderRadius: 12,
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  overflow: 'hidden',
}

type Status = 'ok' | 'error' | null

export default function JsonTool() {
  const { message } = App.useApp()
  const [input, setInput]   = useState('')
  const [output, setOutput] = useState('')
  const [status, setStatus] = useState<Status>(null)
  const [errMsg, setErrMsg] = useState('')

  function parse(): { ok: true; val: unknown } | { ok: false; msg: string } {
    try { return { ok: true, val: JSON.parse(input) } }
    catch (e) { return { ok: false, msg: (e as Error).message } }
  }

  function handleFormat() {
    if (!input.trim()) { void message.warning('内容不能为空哦 🥺'); return }
    const r = parse()
    if (!r.ok) { setStatus('error'); setErrMsg(r.msg); setOutput(''); return }
    setOutput(JSON.stringify(r.val, null, 2)); setStatus('ok'); setErrMsg('')
  }

  function handleMinify() {
    if (!input.trim()) { void message.warning('内容不能为空哦 🥺'); return }
    const r = parse()
    if (!r.ok) { setStatus('error'); setErrMsg(r.msg); setOutput(''); return }
    setOutput(JSON.stringify(r.val)); setStatus('ok'); setErrMsg('')
  }

  function handleValidate() {
    if (!input.trim()) { void message.warning('内容不能为空哦 🥺'); return }
    const r = parse()
    if (r.ok) { setStatus('ok'); setErrMsg(''); void message.success('JSON 格式正确 ✅') }
    else { setStatus('error'); setErrMsg(r.msg); void message.error('JSON 格式有误 ❌') }
  }

  function handleCopy() {
    if (!output) return
    void navigator.clipboard.writeText(output).then(() => { void message.success('已复制 🌰') })
  }

  function handleClear() { setInput(''); setOutput(''); setStatus(null); setErrMsg('') }

  return (
    <Space orientation="vertical" size={14} style={{ width: '100%' }}>

      {/* 工具栏 */}
      <div style={{ ...CARD_STYLE, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <Button shape="round" size="small" icon={<FormatPainterOutlined />} onClick={handleFormat} type="primary">格式化</Button>
        <Button shape="round" size="small" icon={<CompressOutlined />} onClick={handleMinify}>压缩</Button>
        <Button shape="round" size="small" icon={<CheckCircleOutlined />} onClick={handleValidate}>校验</Button>
        <Button shape="round" size="small" icon={<CopyOutlined />} onClick={handleCopy} disabled={!output}>复制结果</Button>
        <Button shape="round" size="small" icon={<ClearOutlined />} onClick={handleClear} danger>清空</Button>
        {status && (
          <Tag color={status === 'ok' ? 'success' : 'error'} style={{ marginLeft: 'auto', borderRadius: 20, fontSize: 11 }}>
            {status === 'ok' ? '✅ 格式正确' : '❌ 格式错误'}
          </Tag>
        )}
      </div>

      {errMsg && (
        <div style={{ padding: '8px 14px', background: 'rgba(255,77,79,0.08)', border: '1px solid rgba(255,77,79,0.25)', borderRadius: 10, color: C.red, fontSize: 12 }}>
          ⚠️ {errMsg}
        </div>
      )}

      <div style={{ display: 'flex', gap: 12 }}>
        <div style={PANEL_STYLE}>
          <div style={{ padding: '8px 14px', borderBottom: '1px solid rgba(var(--wt), 0.12)', fontSize: 11, color: C.sub }}>
            📥 输入 JSON
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={'// 在这里粘贴 JSON...\n{\n  "key": "value"\n}'}
            spellCheck={false}
            style={{ flex: 1, width: '100%', background: 'transparent', border: 'none', outline: 'none', color: C.text, fontFamily: '"JetBrains Mono","Consolas","Monaco",monospace', fontSize: 12, lineHeight: 1.75, padding: '14px 16px', resize: 'none', minHeight: 300 }}
          />
        </div>
        <div style={PANEL_STYLE}>
          <div style={{ padding: '8px 14px', borderBottom: '1px solid rgba(var(--wt), 0.12)', fontSize: 11, color: C.sub }}>
            📤 处理结果
          </div>
          <textarea
            value={output}
            readOnly
            placeholder={'// 结果会显示在这里...'}
            spellCheck={false}
            style={{ flex: 1, width: '100%', background: 'transparent', border: 'none', outline: 'none', color: C.green, fontFamily: '"JetBrains Mono","Consolas","Monaco",monospace', fontSize: 12, lineHeight: 1.75, padding: '14px 16px', resize: 'none', minHeight: 300 }}
          />
        </div>
      </div>
    </Space>
  )
}
