import { useState, useEffect } from 'react'
import { Button, Input, Space, Typography, Popconfirm, Empty, App, Tooltip, Badge } from 'antd'
import { PlusOutlined, DeleteOutlined, EditOutlined, CheckOutlined } from '@ant-design/icons'
import { call } from '../bridge'
import { C, CARD_STYLE } from '../theme'

const { Text } = Typography
const { TextArea } = Input

const STORAGE_KEY = 'walnut_notes'

interface NoteColor { bg: string; border: string; dot: string }
interface Note { id: string; text: string; colorIndex: number; createdAt: string }

// 旧格式迁移：bg 十六进制 → colorIndex
const OLD_BG_TO_INDEX: Record<string, number> = {
  '#FFF3E0': 1, '#F0FFF4': 2, '#FFFBE6': 3, '#E6F4FF': 4, '#FFF0F6': 5,
}

const NOTE_COLORS: NoteColor[] = [
  { bg: 'rgba(var(--bg-card), 0.9)', border: 'rgba(var(--wt), 0.3)',    dot: 'rgb(var(--wt))'   },
  { bg: 'var(--note-1-bg)',          border: 'rgba(196,154,108,0.35)',  dot: '#C49A6C'           },
  { bg: 'var(--note-2-bg)',          border: 'rgba(82,196,26,0.3)',     dot: '#52c41a'           },
  { bg: 'var(--note-3-bg)',          border: 'rgba(255,169,64,0.35)',   dot: '#ffa940'           },
  { bg: 'var(--note-4-bg)',          border: 'rgba(64,150,255,0.3)',    dot: '#4096ff'           },
  { bg: 'var(--note-5-bg)',          border: 'rgba(255,133,192,0.3)',   dot: '#ff85c0'           },
]

function randomColorIndex(): number {
  return Math.floor(Math.random() * NOTE_COLORS.length)
}

// 将旧格式（存储 color 对象）迁移为新格式（存储 colorIndex）
function migrateNote(raw: Record<string, unknown>): Note {
  if (typeof raw.colorIndex === 'number') return raw as unknown as Note
  const oldBg = (raw.color as NoteColor | undefined)?.bg ?? ''
  const colorIndex = OLD_BG_TO_INDEX[oldBg] ?? Math.floor(Math.random() * NOTE_COLORS.length)
  return { id: raw.id as string, text: raw.text as string, colorIndex, createdAt: raw.createdAt as string }
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

export default function Notes() {
  const { message } = App.useApp()
  const [notes, setNotes]       = useState<Note[]>([])
  const [draft, setDraft]       = useState('')
  const [editId, setEditId]     = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    call<Record<string, unknown>[]>('get_setting', STORAGE_KEY, []).then((res) => {
      if (res.success && Array.isArray(res.data)) setNotes(res.data.map(migrateNote))
      setLoading(false)
    })
  }, [])

  async function saveNotes(next: Note[]) {
    setNotes(next)
    await call('set_setting', STORAGE_KEY, next)
  }

  async function handleAdd() {
    const text = draft.trim()
    if (!text) { void message.warning('内容不能为空哦 🥺'); return }
    await saveNotes([{ id: Date.now().toString(), text, colorIndex: randomColorIndex(), createdAt: new Date().toISOString() }, ...notes])
    setDraft('')
    void message.success('便签已添加 🌰')
  }

  async function handleDelete(id: string) {
    await saveNotes(notes.filter((n) => n.id !== id))
    void message.success('已删除 🗑️')
  }

  async function confirmEdit(id: string) {
    const text = editText.trim()
    if (!text) { void message.warning('内容不能为空哦 🥺'); return }
    await saveNotes(notes.map((n) => n.id === id ? { ...n, text } : n))
    setEditId(null)
    void message.success('已更新 ✅')
  }

  return (
    <Space orientation="vertical" size={18} style={{ width: '100%' }}>

      <div style={{ ...CARD_STYLE, padding: '16px 20px' }}>
        <Space orientation="vertical" size={10} style={{ width: '100%' }}>
          <Space align="center">
            <span style={{ fontSize: 18 }}>📝</span>
            <Text strong style={{ color: C.text, fontSize: 14 }}>写一张便签</Text>
            <Badge count={notes.length} color="rgb(var(--wt))" />
          </Space>
          <TextArea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="写下你想记录的事情吧～ 🌰"
            autoSize={{ minRows: 2, maxRows: 5 }}
            onPressEnter={(e) => { if (e.ctrlKey) { void handleAdd() } }}
            style={{ borderColor: 'rgba(var(--wt), 0.35)', background: 'rgba(var(--wt), 0.04)', resize: 'none' }}
          />
          <Space>
            <Button type="primary" shape="round" icon={<PlusOutlined />} onClick={() => { void handleAdd() }}>
              添加便签
            </Button>
            <Text type="secondary" style={{ fontSize: 11 }}>Ctrl+Enter 快速添加</Text>
          </Space>
        </Space>
      </div>

      {!loading && notes.length === 0 ? (
        <div style={{ ...CARD_STYLE, border: '1.5px dashed rgba(var(--wt), 0.25)', textAlign: 'center', padding: '40px 24px' }}>
          <Empty
            image={<span style={{ fontSize: 48 }}>🗒️</span>}
            styles={{ image: { height: 60 } }}
            description={
              <Space orientation="vertical" size={2}>
                <Text type="secondary">还没有便签哦～</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>写下第一张便签吧 🌰</Text>
              </Space>
            }
          />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
          {notes.map((note) => {
            const c = NOTE_COLORS[note.colorIndex ?? 0] ?? NOTE_COLORS[0]
            const isEditing = editId === note.id
            return (
              <div
                key={note.id}
                style={{ background: c.bg, border: `1.5px solid ${c.border}`, borderRadius: 14, padding: '12px 14px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', transition: 'transform 0.15s, box-shadow 0.15s' }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.1)' }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.06)' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Space size={6}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.dot, display: 'inline-block' }} />
                    <Text type="secondary" style={{ fontSize: 11 }}>{formatDate(note.createdAt)}</Text>
                  </Space>
                  <Space size={2}>
                    {!isEditing && (
                      <Tooltip title="编辑">
                        <Button type="text" size="small" icon={<EditOutlined />} onClick={() => { setEditId(note.id); setEditText(note.text) }} style={{ color: '#aaa', padding: '0 4px' }} />
                      </Tooltip>
                    )}
                    {isEditing ? (
                      <Tooltip title="保存">
                        <Button type="text" size="small" icon={<CheckOutlined />} onClick={() => { void confirmEdit(note.id) }} style={{ color: C.green, padding: '0 4px' }} />
                      </Tooltip>
                    ) : (
                      <Popconfirm title="确定删除？" onConfirm={() => { void handleDelete(note.id) }} okText="删除" cancelText="取消" okButtonProps={{ danger: true, shape: 'round' }} cancelButtonProps={{ shape: 'round' }}>
                        <Tooltip title="删除">
                          <Button type="text" size="small" icon={<DeleteOutlined />} style={{ color: '#ccc', padding: '0 4px' }} />
                        </Tooltip>
                      </Popconfirm>
                    )}
                  </Space>
                </div>
                {isEditing ? (
                  <TextArea autoFocus value={editText} onChange={(e) => setEditText(e.target.value)} autoSize={{ minRows: 2, maxRows: 6 }} style={{ borderRadius: 8, fontSize: 13 }} />
                ) : (
                  <pre style={{ margin: 0, fontSize: 13, lineHeight: 1.7, color: C.text, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'inherit' }}>
                    {note.text}
                  </pre>
                )}
              </div>
            )
          })}
        </div>
      )}
    </Space>
  )
}
