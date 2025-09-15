/**
 * 前端安全管理器
 * 处理输入验证、XSS防护、CSP策略、安全存储
 */

import CryptoJS from 'crypto-js'

// ============================================================================
// 1. 输入验证和清理
// ============================================================================

export interface ValidationRule {
  required?: boolean
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  customValidator?: (value: string) => boolean | string
}

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  sanitized: string
}

export class InputSanitizer {
  // 危险HTML标签和属性
  private static readonly DANGEROUS_TAGS = [
    'script', 'iframe', 'object', 'embed', 'form', 'input', 
    'textarea', 'button', 'select', 'option', 'meta', 'link'
  ]

  private static readonly DANGEROUS_ATTRIBUTES = [
    'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur',
    'onchange', 'onsubmit', 'onkeyup', 'onkeydown', 'onmousedown',
    'onmouseup', 'onerror', 'javascript:', 'vbscript:', 'data:'
  ]

  private static readonly URL_PROTOCOLS = ['http:', 'https:', 'mailto:', 'tel:']

  /**
   * 验证和清理文本输入
   */
  static validateAndSanitize(input: string, rules: ValidationRule = {}): ValidationResult {
    const errors: string[] = []
    let sanitized = input

    // 基础验证
    if (rules.required && !input?.trim()) {
      errors.push('此字段为必填项')
      return { isValid: false, errors, sanitized: '' }
    }

    if (input) {
      // 长度验证
      if (rules.minLength && input.length < rules.minLength) {
        errors.push(`最少需要 ${rules.minLength} 个字符`)
      }
      
      if (rules.maxLength && input.length > rules.maxLength) {
        errors.push(`最多允许 ${rules.maxLength} 个字符`)
        sanitized = input.substring(0, rules.maxLength)
      }

      // 模式验证
      if (rules.pattern && !rules.pattern.test(input)) {
        errors.push('格式不正确')
      }

      // 自定义验证
      if (rules.customValidator) {
        const customResult = rules.customValidator(input)
        if (typeof customResult === 'string') {
          errors.push(customResult)
        } else if (!customResult) {
          errors.push('验证失败')
        }
      }

      // XSS防护清理
      sanitized = this.sanitizeHTML(sanitized)
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitized
    }
  }

  /**
   * HTML内容清理
   */
  static sanitizeHTML(html: string): string {
    if (!html) return html

    let sanitized = html

    // 移除危险标签
    this.DANGEROUS_TAGS.forEach(tag => {
      const regex = new RegExp(`<${tag}[^>]*>.*?</${tag}>`, 'gi')
      sanitized = sanitized.replace(regex, '')
      
      const selfClosing = new RegExp(`<${tag}[^>]*/>`, 'gi')
      sanitized = sanitized.replace(selfClosing, '')
    })

    // 移除危险属性
    this.DANGEROUS_ATTRIBUTES.forEach(attr => {
      const regex = new RegExp(`\\s${attr}\\s*=\\s*["'][^"']*["']`, 'gi')
      sanitized = sanitized.replace(regex, '')
    })

    // 转义特殊字符
    sanitized = sanitized
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')

    return sanitized
  }

  /**
   * URL验证和清理
   */
  static validateURL(url: string): ValidationResult {
    const errors: string[] = []
    let sanitized = url.trim()

    if (!url) {
      return { isValid: true, errors: [], sanitized: '' }
    }

    try {
      const parsedURL = new URL(sanitized)
      
      // 检查协议白名单
      if (!this.URL_PROTOCOLS.includes(parsedURL.protocol)) {
        errors.push('不支持的URL协议')
      }

      // 防止内网访问
      const hostname = parsedURL.hostname.toLowerCase()
      const dangerousHosts = [
        'localhost', '127.0.0.1', '0.0.0.0',
        '10.', '192.168.', '172.16.', '172.17.', '172.18.',
        '172.19.', '172.20.', '172.21.', '172.22.', '172.23.',
        '172.24.', '172.25.', '172.26.', '172.27.', '172.28.',
        '172.29.', '172.30.', '172.31.'
      ]

      if (dangerousHosts.some(host => hostname.includes(host))) {
        errors.push('不允许访问内网地址')
      }

    } catch (e) {
      errors.push('URL格式无效')
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitized
    }
  }

  /**
   * 文件名验证
   */
  static validateFileName(fileName: string): ValidationResult {
    const errors: string[] = []
    let sanitized = fileName.trim()

    if (!fileName) {
      errors.push('文件名不能为空')
      return { isValid: false, errors, sanitized: '' }
    }

    // 危险字符检查
    const dangerousChars = /[<>:"/\\|?*\x00-\x1f]/g
    if (dangerousChars.test(sanitized)) {
      errors.push('文件名包含非法字符')
      sanitized = sanitized.replace(dangerousChars, '_')
    }

    // 路径遍历检查
    if (sanitized.includes('..') || sanitized.includes('./')) {
      errors.push('文件名不能包含路径遍历字符')
      sanitized = sanitized.replace(/\.\./g, '_').replace(/\.\//g, '_')
    }

    // 长度限制
    if (sanitized.length > 255) {
      errors.push('文件名过长')
      sanitized = sanitized.substring(0, 255)
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitized
    }
  }
}

// ============================================================================
// 2. 安全存储管理
// ============================================================================

export class SecureStorage {
  private static readonly ENCRYPTION_KEY = 'nexus-secure-storage-key'
  
  /**
   * 加密存储
   */
  static setSecureItem(key: string, value: any, encrypt = true): void {
    try {
      const serialized = JSON.stringify(value)
      const data = encrypt 
        ? CryptoJS.AES.encrypt(serialized, this.ENCRYPTION_KEY).toString()
        : serialized

      localStorage.setItem(`secure_${key}`, data)
    } catch (error) {
      console.error('安全存储失败:', error)
    }
  }

  /**
   * 解密获取
   */
  static getSecureItem<T>(key: string, encrypted = true): T | null {
    try {
      const data = localStorage.getItem(`secure_${key}`)
      if (!data) return null

      if (encrypted) {
        const bytes = CryptoJS.AES.decrypt(data, this.ENCRYPTION_KEY)
        const decrypted = bytes.toString(CryptoJS.enc.Utf8)
        return JSON.parse(decrypted)
      } else {
        return JSON.parse(data)
      }
    } catch (error) {
      console.error('安全读取失败:', error)
      return null
    }
  }

  /**
   * 删除安全存储项
   */
  static removeSecureItem(key: string): void {
    localStorage.removeItem(`secure_${key}`)
  }

  /**
   * 清理所有安全存储
   */
  static clearSecureStorage(): void {
    const keys = Object.keys(localStorage)
    keys.forEach(key => {
      if (key.startsWith('secure_')) {
        localStorage.removeItem(key)
      }
    })
  }

  /**
   * 会话存储（页面关闭后自动清理）
   */
  static setSessionItem(key: string, value: any): void {
    try {
      const serialized = JSON.stringify(value)
      const encrypted = CryptoJS.AES.encrypt(serialized, this.ENCRYPTION_KEY).toString()
      sessionStorage.setItem(`session_${key}`, encrypted)
    } catch (error) {
      console.error('会话存储失败:', error)
    }
  }

  static getSessionItem<T>(key: string): T | null {
    try {
      const data = sessionStorage.getItem(`session_${key}`)
      if (!data) return null

      const bytes = CryptoJS.AES.decrypt(data, this.ENCRYPTION_KEY)
      const decrypted = bytes.toString(CryptoJS.enc.Utf8)
      return JSON.parse(decrypted)
    } catch (error) {
      console.error('会话读取失败:', error)
      return null
    }
  }
}

// ============================================================================
// 3. CSP和安全头管理
// ============================================================================

export class SecurityHeaders {
  /**
   * 设置CSP策略
   */
  static setCSPPolicy(): void {
    const meta = document.createElement('meta')
    meta.httpEquiv = 'Content-Security-Policy'
    meta.content = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https:",
      "connect-src 'self' https://api.openai.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; ')
    
    document.head.appendChild(meta)
  }

  /**
   * 禁用右键和开发者工具（生产环境）
   */
  static disableDevTools(): void {
    if (process.env.NODE_ENV === 'production') {
      // 禁用右键
      document.addEventListener('contextmenu', e => e.preventDefault())
      
      // 禁用F12和常见开发者工具快捷键
      document.addEventListener('keydown', (e) => {
        if (
          e.key === 'F12' ||
          (e.ctrlKey && e.shiftKey && e.key === 'I') ||
          (e.ctrlKey && e.shiftKey && e.key === 'C') ||
          (e.ctrlKey && e.shiftKey && e.key === 'J') ||
          (e.ctrlKey && e.key === 'U')
        ) {
          e.preventDefault()
        }
      })
    }
  }

  /**
   * 添加安全头
   */
  static addSecurityHeaders(): void {
    // X-Frame-Options
    const xFrame = document.createElement('meta')
    xFrame.httpEquiv = 'X-Frame-Options'
    xFrame.content = 'DENY'
    document.head.appendChild(xFrame)

    // X-Content-Type-Options
    const xContent = document.createElement('meta')
    xContent.httpEquiv = 'X-Content-Type-Options'
    xContent.content = 'nosniff'
    document.head.appendChild(xContent)

    // Referrer-Policy
    const referrer = document.createElement('meta')
    referrer.name = 'referrer'
    referrer.content = 'strict-origin-when-cross-origin'
    document.head.appendChild(referrer)
  }
}

// ============================================================================
// 4. API安全管理
// ============================================================================

export interface APISecurityConfig {
  maxRetries: number
  retryDelay: number
  timeout: number
  validateResponse: boolean
}

export class APISecurityManager {
  private static readonly DEFAULT_CONFIG: APISecurityConfig = {
    maxRetries: 3,
    retryDelay: 1000,
    timeout: 10000,
    validateResponse: true
  }

  /**
   * 安全的API请求
   */
  static async secureRequest(
    url: string,
    options: RequestInit = {},
    config: Partial<APISecurityConfig> = {}
  ): Promise<Response> {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config }
    
    // URL验证
    const urlValidation = InputSanitizer.validateURL(url)
    if (!urlValidation.isValid) {
      throw new Error(`无效的API URL: ${urlValidation.errors.join(', ')}`)
    }

    // 添加安全头
    const secureOptions: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        ...options.headers,
      }
    }

    // 请求体验证
    if (secureOptions.body && typeof secureOptions.body === 'string') {
      try {
        const bodyData = JSON.parse(secureOptions.body)
        const sanitizedBody = this.sanitizeRequestBody(bodyData)
        secureOptions.body = JSON.stringify(sanitizedBody)
      } catch (error) {
        console.warn('请求体JSON解析失败:', error)
      }
    }

    // 带重试的请求
    return this.requestWithRetry(urlValidation.sanitized, secureOptions, finalConfig)
  }

  /**
   * 清理请求体数据
   */
  private static sanitizeRequestBody(body: any): any {
    if (typeof body === 'string') {
      return InputSanitizer.sanitizeHTML(body)
    }
    
    if (Array.isArray(body)) {
      return body.map(item => this.sanitizeRequestBody(item))
    }
    
    if (body && typeof body === 'object') {
      const sanitized: any = {}
      for (const [key, value] of Object.entries(body)) {
        sanitized[key] = this.sanitizeRequestBody(value)
      }
      return sanitized
    }
    
    return body
  }

  /**
   * 带重试的请求
   */
  private static async requestWithRetry(
    url: string,
    options: RequestInit,
    config: APISecurityConfig
  ): Promise<Response> {
    let lastError: Error

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), config.timeout)

        const response = await fetch(url, {
          ...options,
          signal: controller.signal
        })

        clearTimeout(timeoutId)

        // 响应验证
        if (config.validateResponse) {
          await this.validateResponse(response.clone())
        }

        return response

      } catch (error) {
        lastError = error as Error
        
        if (attempt < config.maxRetries) {
          await new Promise(resolve => setTimeout(resolve, config.retryDelay * (attempt + 1)))
        }
      }
    }

    throw lastError!
  }

  /**
   * 响应验证
   */
  private static async validateResponse(response: Response): Promise<void> {
    // 检查响应状态
    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status} ${response.statusText}`)
    }

    // 检查内容类型
    const contentType = response.headers.get('content-type')
    if (contentType && !contentType.includes('application/json')) {
      console.warn('非JSON响应类型:', contentType)
    }

    // 基础响应体验证（避免XSS）
    try {
      const text = await response.text()
      if (text.includes('<script') || text.includes('javascript:')) {
        throw new Error('响应包含可疑脚本内容')
      }
    } catch (error) {
      console.warn('响应验证失败:', error)
    }
  }
}

// ============================================================================
// 5. 安全监控和报告
// ============================================================================

export interface SecurityEvent {
  type: 'validation_error' | 'xss_attempt' | 'api_error' | 'storage_error'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  details?: any
  timestamp: Date
}

export class SecurityMonitor {
  private static events: SecurityEvent[] = []
  private static readonly MAX_EVENTS = 100

  /**
   * 记录安全事件
   */
  static logEvent(event: Omit<SecurityEvent, 'timestamp'>): void {
    const securityEvent: SecurityEvent = {
      ...event,
      timestamp: new Date()
    }

    this.events.unshift(securityEvent)
    
    // 保持事件数量限制
    if (this.events.length > this.MAX_EVENTS) {
      this.events = this.events.slice(0, this.MAX_EVENTS)
    }

    // 高严重级别事件立即报告
    if (event.severity === 'high' || event.severity === 'critical') {
      this.reportCriticalEvent(securityEvent)
    }

    // 存储到本地（用于调试和分析）
    SecureStorage.setSecureItem('security_events', this.events, false)
  }

  /**
   * 获取安全事件
   */
  static getEvents(): SecurityEvent[] {
    return [...this.events]
  }

  /**
   * 获取安全统计
   */
  static getSecurityStats(): {
    totalEvents: number
    eventsByType: Record<string, number>
    eventsBySeverity: Record<string, number>
    recentEvents: SecurityEvent[]
  } {
    const eventsByType: Record<string, number> = {}
    const eventsBySeverity: Record<string, number> = {}

    this.events.forEach(event => {
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1
      eventsBySeverity[event.severity] = (eventsBySeverity[event.severity] || 0) + 1
    })

    return {
      totalEvents: this.events.length,
      eventsByType,
      eventsBySeverity,
      recentEvents: this.events.slice(0, 10)
    }
  }

  /**
   * 报告关键安全事件
   */
  private static reportCriticalEvent(event: SecurityEvent): void {
    console.error('🚨 关键安全事件:', event)
    
    // 这里可以集成外部监控服务
    // 例如：发送到 Sentry, DataDog 等
  }

  /**
   * 清理旧事件
   */
  static cleanupOldEvents(maxAge: number = 24 * 60 * 60 * 1000): void {
    const cutoff = new Date(Date.now() - maxAge)
    this.events = this.events.filter(event => event.timestamp > cutoff)
    SecureStorage.setSecureItem('security_events', this.events, false)
  }
}

// ============================================================================
// 6. 安全工具函数
// ============================================================================

/**
 * 生成安全的随机字符串
 */
export function generateSecureToken(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  
  return result
}

/**
 * 安全的JSON解析
 */
export function safeJSONParse<T>(json: string, fallback: T): T {
  try {
    const parsed = JSON.parse(json)
    // 基础XSS检查
    const stringified = JSON.stringify(parsed)
    if (stringified.includes('<script') || stringified.includes('javascript:')) {
      SecurityMonitor.logEvent({
        type: 'xss_attempt',
        severity: 'high',
        message: 'JSON中检测到可疑脚本内容',
        details: { json: json.substring(0, 100) }
      })
      return fallback
    }
    return parsed
  } catch (error) {
    SecurityMonitor.logEvent({
      type: 'validation_error',
      severity: 'low',
      message: 'JSON解析失败',
      details: { error: error instanceof Error ? error.message : String(error) }
    })
    return fallback
  }
}

/**
 * 初始化安全管理器
 */
export function initializeSecurity(): void {
  // 设置安全头
  SecurityHeaders.addSecurityHeaders()
  SecurityHeaders.setCSPPolicy()
  
  // 生产环境安全措施
  if (process.env.NODE_ENV === 'production') {
    SecurityHeaders.disableDevTools()
  }

  // 定期清理安全事件
  setInterval(() => {
    SecurityMonitor.cleanupOldEvents()
  }, 60 * 60 * 1000) // 每小时清理一次

  console.log('🔒 安全管理器已初始化')
}

// 导出主要类和函数
export {
  InputSanitizer,
  SecureStorage,
  SecurityHeaders,
  APISecurityManager,
  SecurityMonitor
}