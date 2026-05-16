/**
 * pywebview JS ↔ Python 通用桥接
 *
 * 在纯浏览器中打开时（无 pywebview）自动降级为 mock，方便独立调试 UI。
 */

export interface ApiResult<T = unknown> {
  success: boolean
  data?:   T
  message?: string
}

// window.pywebview 全局类型声明
declare global {
  interface Window {
    pywebview?: {
      api: Record<string, ((...args: unknown[]) => Promise<ApiResult>) | undefined>
    }
  }
}

const READY_TIMEOUT  = 10_000
const METHOD_TIMEOUT =  5_000
const CALL_TIMEOUT   = 30_000
const POLL_INTERVAL  = 50

// @ts-ignore
function createMock(): Window['pywebview']['api'] {
  // @ts-ignore
  return new Proxy({} as Window['pywebview']['api'], {
    get(_, method: string) {
      return (...args: unknown[]) => {
        console.warn(`[Bridge Mock] ${method}(${JSON.stringify(args)}) — pywebview 未就绪`)
        return Promise.resolve({ success: false, message: 'pywebview 未就绪' })
      }
    },
  })
}

// @ts-ignore
type ApiObj = Window['pywebview']['api']

let _api:    ApiObj | null = null
let _isMock = false

function _waitForApi(): Promise<ApiObj> {
  if (_api) return Promise.resolve(_api)
  return new Promise((resolve) => {
    if (window.pywebview?.api) {
      _api = window.pywebview.api
      return resolve(_api)
    }
    const start = Date.now()
    const t = setInterval(() => {
      if (window.pywebview?.api) {
        clearInterval(t)
        _api = window.pywebview.api
        resolve(_api)
      } else if (Date.now() - start > READY_TIMEOUT) {
        clearInterval(t)
        _isMock = true
        _api = createMock()
        resolve(_api)
      }
    }, POLL_INTERVAL)
  })
}

function _waitForMethod(api: ApiObj, method: string): Promise<ApiObj> {
  if (typeof api[method] === 'function') return Promise.resolve(api)
  return new Promise((resolve) => {
    const start = Date.now()
    const t = setInterval(() => {
      const current = window.pywebview?.api ?? api
      if (typeof current[method] === 'function') {
        clearInterval(t)
        _api = current
        resolve(current)
      } else if (Date.now() - start > METHOD_TIMEOUT) {
        clearInterval(t)
        resolve(api)
      }
    }, POLL_INTERVAL)
  })
}

export function getApi(): Promise<ApiObj> {
  return _waitForApi()
}

/**
 * 调用 Python Api 方法，内置超时保护。
 * 永远 resolve，不会 reject —— 出错时返回 { success: false, message }。
 */
export async function call<T = unknown>(method: string, ...args: unknown[]): Promise<ApiResult<T>> {
  try {
    let api = await _waitForApi()

    if (!_isMock && typeof api[method] !== 'function') {
      api = await _waitForMethod(api, method)
    }

    if (typeof api[method] !== 'function') {
      return { success: false, message: `Api 方法不存在：${method}` }
    }

    const timeout = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`${method}() 调用超时（${CALL_TIMEOUT / 1000}s）`)),
        CALL_TIMEOUT,
      )
    )

    const result = await Promise.race([api[method]!(...args), timeout]) as ApiResult<T>
    return result ?? { success: false, message: '返回值为空' }
  } catch (err) {
    console.error(`[Bridge] ${method} 失败:`, err)
    return { success: false, message: (err as Error)?.message ?? '未知错误' }
  }
}
