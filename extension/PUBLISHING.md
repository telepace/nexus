# 浏览器扩展发布指南

本文档介绍如何设置自动发布 Nexus 浏览器扩展到各大扩展商店的 CI/CD 流程。

## 前提条件

1. 在各个浏览器扩展商店创建开发者账户:
   - [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
   - [Firefox Add-ons Developer Hub](https://addons.mozilla.org/developers/)
   - [Microsoft Edge Add-ons](https://partner.microsoft.com/dashboard/microsoftedge/overview)

2. 初次发布后获取扩展 ID 和必要的 API 密钥

## GitHub Secrets 设置

在 GitHub 仓库中添加以下 Secrets，用于自动发布流程:

### Chrome Web Store

1. `CHROME_EXTENSION_ID`: 在 Chrome Web Store 上发布的扩展 ID
2. `CHROME_CLIENT_ID`: OAuth 客户端 ID
3. `CHROME_CLIENT_SECRET`: OAuth 客户端密钥
4. `CHROME_REFRESH_TOKEN`: OAuth 刷新令牌

获取这些凭证的步骤:
1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建一个新项目
3. 启用 Chrome Web Store API
4. 设置 OAuth 同意屏幕
5. 创建 OAuth 客户端 ID (类型为 "其他")
6. 使用以下命令获取刷新令牌:
   ```bash
   curl -X POST \
     -d "client_id=YOUR_CLIENT_ID&client_secret=YOUR_CLIENT_SECRET&refresh_token=YOUR_REFRESH_TOKEN&grant_type=refresh_token" \
     https://accounts.google.com/o/oauth2/token
   ```

### Firefox Add-ons

1. `FIREFOX_EXTENSION_ID`: 扩展的 UUID
2. `FIREFOX_EXTENSION_SLUG`: 扩展的 slug，出现在 URL 中
3. `FIREFOX_API_KEY`: Firefox API 密钥
4. `FIREFOX_API_SECRET`: Firefox API 密钥对应的密钥

获取这些凭证的步骤:
1. 登录 [Firefox Add-on Developer Hub](https://addons.mozilla.org/developers/)
2. 前往你的个人资料页面
3. 点击 "Manage API Keys"
4. 生成新的 JWT 凭证

### Microsoft Edge Add-ons

1. `EDGE_PRODUCT_ID`: 在 Edge 商店注册的产品 ID
2. `EDGE_CLIENT_ID`: Microsoft 合作伙伴中心 API 的客户端 ID
3. `EDGE_CLIENT_SECRET`: Microsoft 合作伙伴中心 API 的客户端密钥
4. `EDGE_ACCESS_TOKEN_URL`: 通常为 `https://login.microsoftonline.com/{TENANT_ID}/oauth2/v2.0/token`

获取这些凭证的步骤:
1. 访问 [Microsoft Partner Center](https://partner.microsoft.com/dashboard/)
2. 前往账户设置 -> API 访问
3. 创建 Azure AD 应用程序
4. 为该应用添加密钥
5. 授予应用适当的权限

## 发布新版本

发布新版本有两种方式:

### 1. 推送标签触发自动发布

```bash
# 更新 extension/package.json 中的版本号
# 然后提交更改
git add extension/package.json
git commit -m "Bump extension version to 1.0.0"

# 推送标签触发发布流程
git tag extension-v1.0.0
git push origin extension-v1.0.0
```

### 2. 使用 GitHub Actions 手动触发

1. 进入 GitHub 仓库的 "Actions" 选项卡
2. 选择 "发布浏览器扩展" 工作流
3. 点击 "Run workflow"
4. 输入版本号 (例如 1.0.0) 并启动工作流

## 故障排除

### Chrome Web Store 发布问题

- 确保清单文件中的版本号大于已发布的版本
- 验证 OAuth 凭证是否有效
- 检查是否对 API 有正确的权限

### Firefox Add-ons 问题

- 验证 JWT 密钥是否正确
- 确保扩展通过验证检查

### Edge Add-ons 问题

- 确认产品 ID 是否正确
- 验证授权令牌 URL 和凭证是否正确

## 手动发布

如果自动化流程失败，可以手动上传:

1. 从 GitHub Actions 下载构建的 ZIP 文件
2. 手动上传到各个扩展商店开发者后台 