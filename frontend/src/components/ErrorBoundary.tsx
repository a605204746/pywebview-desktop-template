import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Result, Button } from 'antd'

interface Props  { children: ReactNode }
interface State  { error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error.message, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <Result
            status="error"
            title={<span style={{ color: 'rgb(var(--wt-text))' }}>页面出错啦 🥜</span>}
            subTitle={this.state.error.message}
            extra={
              <Button type="primary" shape="round" onClick={() => this.setState({ error: null })}>
                再试一次 ✨
              </Button>
            }
          />
        </div>
      )
    }
    return this.props.children
  }
}
