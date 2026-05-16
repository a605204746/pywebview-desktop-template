import { useEffect, useRef, useState } from 'react'
import {
  Alert, Badge, Button, Card, Col, Form, Input,
  Modal, Popconfirm, Row, Select, Space, Table, Tag, Tooltip, Typography, message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  CheckCircleOutlined, CopyOutlined, DeleteOutlined,
  EditOutlined, LockOutlined, PlusOutlined,
  SafetyCertificateOutlined, UnlockOutlined,
} from '@ant-design/icons'
import { call } from '../bridge'
import { useLicense } from '../contexts/LicenseContext'
import { useCountdown } from '../hooks/useCountdown'

const { Text, Title } = Typography

interface DemoRecord {
  id:      number
  name:    string
  role:    string
  api_key: string
  secret:  string
}

type FormValues = Omit<DemoRecord, 'id'>

const ROLE_OPTIONS = ['管理员', '开发者', '运维', '只读']
const ROLE_COLORS: Record<string, string> = {
  管理员: 'red', 开发者: 'blue', 运维: 'orange', 只读: 'default',
}

// 加密占位（未授权时显示）
function EncryptedField() {
  return (
    <Space size={6}>
      <LockOutlined style={{ color: '#bfbfbf', fontSize: 12 }} />
      <Text type="secondary" style={{ fontSize: 12, fontStyle: 'italic' }}>
        该字段已加密，授权后方可展示
      </Text>
    </Space>
  )
}

// 明文单元格
function PlainCell({ value, onCopy }: { value: string; onCopy: (v: string) => void }) {
  return (
    <Space size={4}>
      <UnlockOutlined style={{ color: '#52c41a', fontSize: 12 }} />
      <Text style={{ fontFamily: 'monospace', fontSize: 12, color: '#52c41a' }}>{value}</Text>
      <Tooltip title="复制">
        <CopyOutlined
          style={{ cursor: 'pointer', opacity: 0.5, fontSize: 11 }}
          onClick={() => onCopy(value)}
        />
      </Tooltip>
    </Space>
  )
}

// 新增 / 编辑弹窗
interface RecordModalProps {
  open:       boolean
  record:     DemoRecord | null   // null = 新增
  authorized: boolean
  onOk:       (values: FormValues) => Promise<void>
  onCancel:   () => void
}

function RecordModal({ open, record, authorized, onOk, onCancel }: RecordModalProps) {
  const [form]      = Form.useForm<FormValues>()
  const [saving, setSaving] = useState(false)
  const isEdit = record !== null

  useEffect(() => {
    if (open) {
      if (isEdit) {
        form.setFieldsValue({
          name:    record.name,
          role:    record.role,
          // 已授权时服务端返回明文，未授权时返回空字符串，直接使用
          api_key: record.api_key,
          secret:  record.secret,
        })
      } else {
        form.resetFields()
      }
    }
  }, [open, record, authorized, form, isEdit])

  const handleOk = async () => {
    const values = await form.validateFields()
    setSaving(true)
    try {
      await onOk(values)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      title={isEdit ? '编辑记录' : '新增记录'}
      onOk={handleOk}
      onCancel={onCancel}
      okText={isEdit ? '保存' : '新增'}
      cancelText="取消"
      confirmLoading={saving}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Row gutter={16}>
          <Col span={14}>
            <Form.Item name="name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}>
              <Input placeholder="请输入姓名" />
            </Form.Item>
          </Col>
          <Col span={10}>
            <Form.Item name="role" label="角色" rules={[{ required: true, message: '请选择角色' }]}>
              <Select placeholder="选择角色">
                {ROLE_OPTIONS.map(r => (
                  <Select.Option key={r} value={r}>
                    <Tag color={ROLE_COLORS[r]} style={{ margin: 0 }}>{r}</Tag>
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>
        <Form.Item
          name="api_key"
          label="API 密钥"
          rules={[{ required: !isEdit, message: '请输入 API 密钥' }]}
          extra={isEdit && !authorized ? '未授权时不可读取原值，留空则保留原密钥' : undefined}
        >
          <Input placeholder={isEdit && !authorized ? '留空保留原值' : '请输入 API 密钥'} />
        </Form.Item>
        <Form.Item
          name="secret"
          label="Secret Token"
          rules={[{ required: !isEdit, message: '请输入 Secret Token' }]}
          extra={isEdit && !authorized ? '未授权时不可读取原值，留空则保留原 Token' : undefined}
        >
          <Input.Password placeholder={isEdit && !authorized ? '留空保留原值' : '请输入 Secret Token'} />
        </Form.Item>
      </Form>
    </Modal>
  )
}

// ── 主页面 ────────────────────────────────────────────────────────

export default function LicenseDemo() {
  const { status, info, fingerprint, message: errMsg, activate, clear } = useLicense()
  const countdown = useCountdown(info?.expires_at ?? null)

  const [records, setRecords]           = useState<DemoRecord[]>([])
  const [authorized, setAuthorized]     = useState(false)
  const [tableLoading, setTableLoading] = useState(false)
  const [licenseKey, setLicenseKey]     = useState('')
  const [activating, setActivating]     = useState(false)
  const [modalOpen, setModalOpen]       = useState(false)
  const [editingRecord, setEditingRecord] = useState<DemoRecord | null>(null)
  const [deletingId, setDeletingId]     = useState<number | null>(null)
  const [msgApi, contextHolder]         = message.useMessage()

  const handleCopy = (v: string) => {
    navigator.clipboard.writeText(v)
    msgApi.success('已复制')
  }

  const loadRecords = async () => {
    setTableLoading(true)
    const res = await call<{ records: DemoRecord[]; authorized: boolean }>('get_demo_records')
    setTableLoading(false)
    if (res.success && res.data) {
      setRecords(res.data.records)
      setAuthorized(res.data.authorized)
    }
  }

  useEffect(() => { if (status !== 'checking') loadRecords() }, [status])

  const handleActivate = async () => {
    if (!licenseKey.trim()) { msgApi.warning('请输入授权码'); return }
    setActivating(true)
    const result = await activate(licenseKey)
    setActivating(false)
    if (result.success) {
      msgApi.success('激活成功')
      setLicenseKey('')
    } else {
      msgApi.error(result.message ?? '激活失败')
    }
  }

  const handleClear = async () => {
    await clear()
    msgApi.info('授权已清除')
  }

  // 打开新增弹窗
  const handleAdd = () => {
    setEditingRecord(null)
    setModalOpen(true)
  }

  // 打开编辑弹窗
  const handleEdit = (record: DemoRecord) => {
    setEditingRecord(record)
    setModalOpen(true)
  }

  // 弹窗确认（新增 or 编辑）
  const handleModalOk = async (values: FormValues) => {
    if (editingRecord) {
      const res = await call('update_demo_record',
        editingRecord.id, values.name, values.role, values.api_key, values.secret)
      if (res.success) {
        msgApi.success('保存成功')
        setModalOpen(false)
        await loadRecords()
      } else {
        msgApi.error(res.message ?? '保存失败')
      }
    } else {
      const res = await call('create_demo_record',
        values.name, values.role, values.api_key, values.secret)
      if (res.success) {
        msgApi.success('新增成功')
        setModalOpen(false)
        await loadRecords()
      } else {
        msgApi.error(res.message ?? '新增失败')
      }
    }
  }

  // 删除
  const handleDelete = async (id: number) => {
    setDeletingId(id)
    const res = await call('delete_demo_record', id)
    setDeletingId(null)
    if (res.success) {
      msgApi.success('已删除')
      await loadRecords()
    } else {
      msgApi.error(res.message ?? '删除失败')
    }
  }

  const columns: ColumnsType<DemoRecord> = [
    { title: 'ID',   dataIndex: 'id',   width: 52,  align: 'center' },
    { title: '姓名', dataIndex: 'name', width: 80 },
    {
      title: '角色', dataIndex: 'role', width: 80,
      render: (v) => <Tag color={ROLE_COLORS[v as string]}>{v}</Tag>,
    },
    {
      title: () => (
        <Space size={4}>API 密钥<Badge dot status={authorized ? 'success' : 'error'} /></Space>
      ),
      dataIndex: 'api_key',
      render: (v) => authorized ? <PlainCell value={v} onCopy={handleCopy} /> : <EncryptedField />,
    },
    {
      title: () => (
        <Space size={4}>Secret Token<Badge dot status={authorized ? 'success' : 'error'} /></Space>
      ),
      dataIndex: 'secret',
      render: (v) => authorized ? <PlainCell value={v} onCopy={handleCopy} /> : <EncryptedField />,
    },
    {
      title: '操作',
      width: 88,
      align: 'center',
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="编辑">
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title="确认删除该记录？"
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(record.id)}
          >
            <Tooltip title="删除">
              <Button
                size="small"
                danger
                icon={<DeleteOutlined />}
                loading={deletingId === record.id}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      {contextHolder}

      <Title level={4} style={{ marginBottom: 20 }}>
        <SafetyCertificateOutlined style={{ marginRight: 8 }} />
        加密授权演示
      </Title>

      {/* 授权状态卡片 */}
      <Card style={{ marginBottom: 20, borderRadius: 16 }}>
        {authorized ? (
          <Row align="middle" gutter={24}>
            <Col flex="none">
              <Alert
                type="success"
                showIcon
                title="授权有效"
                description={
                  info?.user
                    ? `用户：${info.user} · 类型：${info.license_type}`
                    : `类型：${info?.license_type}`
                }
                style={{ borderRadius: 10 }}
              />
            </Col>
            <Col flex="auto">
              <div style={{ textAlign: 'center' }}>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>剩余有效期</Text>
                <Text style={{
                  fontFamily: 'monospace', fontSize: 22, fontWeight: 700,
                  color: countdown.days < 7 ? '#ffa940' : '#52c41a',
                }}>
                  {countdown.expired
                    ? '已过期'
                    : `${countdown.days}天 ${String(countdown.hours).padStart(2, '0')}:${String(countdown.minutes).padStart(2, '0')}:${String(countdown.seconds).padStart(2, '0')}`
                  }
                </Text>
              </div>
            </Col>
            <Col flex="none">
              <Button danger onClick={handleClear}>清除授权</Button>
            </Col>
          </Row>
        ) : (
          <Row gutter={[16, 16]}>
            <Col span={24}>
              <Alert
                type="warning"
                showIcon
                title="未激活"
                description={errMsg || '请将本机指纹码发给开发者，获取专属授权码后粘贴到下方激活。'}
                style={{ borderRadius: 10 }}
              />
            </Col>
            <Col xs={24} md={12}>
              <Text strong style={{ display: 'block', marginBottom: 6 }}>本机指纹码</Text>
              <Input
                readOnly
                value={fingerprint || '获取中…'}
                style={{ fontFamily: 'monospace', fontSize: 12 }}
                suffix={
                  <Tooltip title="复制指纹码">
                    <CopyOutlined
                      style={{ cursor: 'pointer' }}
                      onClick={() => { navigator.clipboard.writeText(fingerprint); msgApi.success('指纹码已复制') }}
                    />
                  </Tooltip>
                }
              />
            </Col>
            <Col xs={24} md={12}>
              <Text strong style={{ display: 'block', marginBottom: 6 }}>授权码</Text>
              <Space.Compact style={{ width: '100%' }}>
                <Input
                  value={licenseKey}
                  onChange={e => setLicenseKey(e.target.value)}
                  placeholder="粘贴授权码"
                  style={{ fontFamily: 'monospace', fontSize: 12 }}
                />
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  loading={activating}
                  onClick={handleActivate}
                >
                  激活
                </Button>
              </Space.Compact>
            </Col>
          </Row>
        )}
      </Card>

      {/* 演示数据表格 */}
      <Card
        title={
          <Space>
            演示数据表格
            <Tag color={authorized ? 'success' : 'error'}>
              {authorized ? '已解密' : '敏感字段已加密'}
            </Tag>
          </Space>
        }
        style={{ borderRadius: 16 }}
        extra={
          <Space>
            <Button size="small" onClick={loadRecords} loading={tableLoading}>刷新</Button>
            <Button size="small" type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              新增
            </Button>
          </Space>
        }
      >
        <Table
          rowKey="id"
          columns={columns}
          dataSource={records}
          loading={tableLoading}
          pagination={{ pageSize: 10, showSizeChanger: false, hideOnSinglePage: true }}
          size="middle"
        />
        <Text type="secondary" style={{ fontSize: 12, marginTop: 12, display: 'block' }}>
          {authorized
            ? '✓ 已授权，API密钥和Secret Token以明文展示'
            : '⚠ 未授权，API密钥和Secret Token以 AES 密文展示，激活后自动解密'}
        </Text>
      </Card>

      {/* 新增 / 编辑弹窗 */}
      <RecordModal
        open={modalOpen}
        record={editingRecord}
        authorized={authorized}
        onOk={handleModalOk}
        onCancel={() => setModalOpen(false)}
      />
    </div>
  )
}
