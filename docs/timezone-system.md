# 时区系统使用指南

## 概述

本项目实现了完整的时区处理系统，确保前端用户看到的是本地化时间，而后端统一使用UTC时间进行存储和处理。

## 架构设计

### 前端时区处理
- **存储**：用户时区偏好保存在localStorage
- **显示**：根据用户时区显示本地时间
- **API**：自动在请求头中添加时区信息

### 后端时区处理
- **存储**：所有时间都以UTC格式存储在数据库
- **API响应**：根据用户时区返回本地化的时间格式
- **转换**：提供完整的时区转换工具类

## 前端使用

### 1. 时间显示组件

#### SmartDateDisplay - 智能日期显示
```tsx
import { SmartDateDisplay } from "@/components/ui/SmartDateDisplay";

// 智能格式 - 根据时间远近自动选择显示方式
<SmartDateDisplay date="2024-01-01T12:00:00Z" format="smart" />

// 相对时间 - "今天 15:30"
<SmartDateDisplay date="2024-01-01T12:00:00Z" format="relative" />

// 距离时间 - "2小时前"
<SmartDateDisplay date="2024-01-01T12:00:00Z" format="distance" />

// 绝对时间 - "2024-01-01 20:00"
<SmartDateDisplay date="2024-01-01T12:00:00Z" format="absolute" />
```

#### 便捷组件
```tsx
import { 
  CompactDateDisplay, 
  DetailedDateDisplay, 
  LiveDateDisplay 
} from "@/components/ui/SmartDateDisplay";

// 紧凑显示 - 显示相对时间，悬停显示详情
<CompactDateDisplay date="2024-01-01T12:00:00Z" />

// 详细显示 - 显示绝对时间，悬停显示相对时间
<DetailedDateDisplay date="2024-01-01T12:00:00Z" />

// 实时显示 - 自动更新，智能格式
<LiveDateDisplay date="2024-01-01T12:00:00Z" />
```

### 2. 时区设置

#### 时区选择器
```tsx
import { TimeZoneSelector } from "@/components/ui/TimeZoneSelector";
import { useTimeZone } from "@/lib/time-zone-context";

function TimeZoneSettings() {
  const { timeZone, setTimeZone } = useTimeZone();

  return (
    <TimeZoneSelector 
      value={timeZone} 
      onChange={setTimeZone}
      label="选择时区"
    />
  );
}
```

#### 时区上下文使用
```tsx
import { useTimeZone } from "@/lib/time-zone-context";

function MyComponent() {
  const { timeZone, isAutoTimeZone, setIsAutoTimeZone } = useTimeZone();

  return (
    <div>
      <p>当前时区: {timeZone}</p>
      <label>
        <input 
          type="checkbox" 
          checked={isAutoTimeZone}
          onChange={(e) => setIsAutoTimeZone(e.target.checked)}
        />
        自动检测时区
      </label>
    </div>
  );
}
```

### 3. API调用

#### 自动时区处理
```tsx
import { withTimezone } from "@/lib/api/timezone";

// 装饰API函数，自动添加时区信息
const fetchUserData = withTimezone(async (userId: string) => {
  const response = await fetch(`/api/users/${userId}`);
  return response.json();
});

// 使用时区感知的fetch
import { timezoneAwareFetch } from "@/lib/api/timezone";

const response = await timezoneAwareFetch('/api/data');
const data = await response.json();
```

#### 手动时区处理
```tsx
import { getTimezoneApiClient } from "@/lib/api/timezone";

const client = getTimezoneApiClient();
const headers = client.getTimezoneHeaders();

const response = await fetch('/api/data', { headers });
const rawData = await response.json();
const processedData = client.processResponseData(rawData);
```

## 后端使用

### 1. 时区工具类

#### 基本使用
```python
from app.utils.timezone import TimezoneUtil, now_utc

# 获取当前UTC时间
current_time = now_utc()

# 转换为用户时区
user_timezone = "Asia/Shanghai"
local_time = TimezoneUtil.from_utc(current_time, user_timezone)

# 转换为UTC时间
utc_time = TimezoneUtil.to_utc(local_time)

# 格式化为API响应
api_response = TimezoneUtil.format_for_api(current_time, user_timezone)
```

#### API响应格式化
```python
from app.utils.timezone import format_datetime_for_api

# 单个时间字段
formatted_time = format_datetime_for_api(datetime_obj, user_timezone)
# 返回: {
#   "utc": "2024-01-01T12:00:00+00:00",
#   "timestamp": 1704110400,
#   "local": "2024-01-01T20:00:00+08:00",
#   "timezone": "Asia/Shanghai"
# }
```

### 2. 模型定义

#### 使用时区工具的模型
```python
from app.utils.timezone import now_utc
from sqlmodel import Field

class MyModel(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=now_utc)
    updated_at: datetime = Field(
        default_factory=now_utc,
        sa_column_kwargs={"onupdate": now_utc}
    )
```

### 3. API路由

#### 获取用户时区
```python
from fastapi import Request
from app.api.middlewares.timezone_middleware import get_user_timezone

@app.get("/api/data")
async def get_data(request: Request):
    user_timezone = get_user_timezone(request)
    
    # 获取数据
    data = await get_some_data()
    
    # 格式化时间字段
    if user_timezone:
        formatted_data = format_datetime_for_api(data.created_at, user_timezone)
        data.created_at = formatted_data
    
    return data
```

#### 使用响应帮助器
```python
from app.api.middlewares.timezone_middleware import TimezoneResponseHelper

@app.get("/api/data")
async def get_data(request: Request):
    user_timezone = get_user_timezone(request)
    data = await get_some_data()
    
    return TimezoneResponseHelper.create_timezone_aware_response(
        data, user_timezone
    )
```

### 4. 中间件配置

#### 添加时区中间件
```python
from app.api.middlewares.timezone_middleware import TimezoneHTTPMiddleware

app.add_middleware(TimezoneHTTPMiddleware)
```

## 最佳实践

### 前端
1. **统一使用时区感知组件**：使用`SmartDateDisplay`等组件而不是直接显示时间
2. **保持时区同步**：时区变更时确保API客户端同步更新
3. **优雅降级**：如果时区检测失败，回退到UTC显示
4. **性能考虑**：相对时间更新不要太频繁，建议30秒以上

### 后端
1. **统一使用UTC存储**：所有datetime字段都使用`now_utc()`
2. **API响应格式化**：为包含时间的API响应提供时区感知格式
3. **验证时区**：使用`TimezoneUtil.is_valid_timezone()`验证用户提供的时区
4. **错误处理**：时区转换失败时提供合理的默认值

### 通用
1. **ISO 8601格式**：前后端交互使用ISO 8601时间格式
2. **时区标识**：使用标准的IANA时区标识符（如`Asia/Shanghai`）
3. **测试覆盖**：包含不同时区的测试用例
4. **文档维护**：及时更新时区相关的API文档

## 支持的时区

当前系统支持以下时区：
- `UTC` - 协调世界时
- `Asia/Shanghai` - 中国标准时间
- `America/New_York` - 美国东部时间
- `Europe/London` - 英国时间
- `Australia/Sydney` - 澳大利亚东部时间
- `America/Los_Angeles` - 美国西部时间
- `Europe/Paris` - 欧洲中部时间
- `Asia/Tokyo` - 日本标准时间

## 故障排除

### 常见问题

1. **时间显示不正确**
   - 检查用户时区设置
   - 确认API响应包含正确的时区信息
   - 验证时区转换逻辑

2. **API请求缺少时区信息**
   - 确认使用了时区感知的API客户端
   - 检查请求头中是否包含`X-User-Timezone`

3. **时区选择器不工作**
   - 确认组件被`TimeZoneProvider`包裹
   - 检查localStorage权限

4. **后端时区转换失败**
   - 验证时区字符串格式
   - 检查`zoneinfo`模块是否正确安装
   - 确认系统时区数据是否最新

### 调试技巧

1. **前端调试**：
   ```tsx
   import { getCurrentTimezone } from "@/lib/api/timezone";
   console.log("当前时区:", getCurrentTimezone());
   ```

2. **后端调试**：
   ```python
   from app.utils.timezone import TimezoneUtil
   print(f"支持的时区: {TimezoneUtil.SUPPORTED_TIMEZONES}")
   ```

3. **网络调试**：检查请求头是否包含时区信息
   ```
   X-User-Timezone: Asia/Shanghai
   ``` 