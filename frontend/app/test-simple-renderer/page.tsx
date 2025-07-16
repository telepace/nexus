"use client";

import React, { useState } from "react";
import { SimpleContentRenderer } from "@/components/ui/SimpleContentRenderer";
// import { SeamlessContentRenderer } from "@/components/ui/SeamlessContentRenderer"; // Commented out unused import
import { Button } from "@/components/ui/button";

const testContent = `# Argo CD GitOps 实践指南：从入门到生产部署与优化

## 目录

1. [Argo CD 简介](#argo-cd-简介)
2. [环境准备](#环境准备)
3. [安装与配置](#安装与配置)
4. [基础使用](#基础使用)
5. [高级特性](#高级特性)
6. [生产部署最佳实践](#生产部署最佳实践)

## Argo CD 简介

Argo CD 是一个声明式的 GitOps 持续部署工具，专为 Kubernetes 设计。它使用 Git 仓库作为应用配置的单一真实来源，自动同步和部署应用到 Kubernetes 集群。

### 核心特性

- **声明式配置**：使用 Git 仓库管理应用配置
- **自动同步**：监控 Git 仓库变化，自动部署到集群
- **回滚能力**：快速回滚到任意历史版本
- **多集群支持**：管理多个 Kubernetes 集群
- **Web UI**：直观的用户界面
- **CLI 工具**：强大的命令行接口

## 环境准备

### 前置条件

确保你已经安装了以下工具：

\`\`\`bash
# Kubernetes 集群 (v1.20+)
kubectl version --client

# Helm (可选，用于安装复杂应用)
helm version

# Git (用于管理配置仓库)
git --version
\`\`\`

### 集群要求

- Kubernetes 版本：1.20 或更高
- 可用内存：至少 2GB
- 可用 CPU：至少 1 核心
- 持久化存储：推荐使用 SSD

## 安装与配置

### 方式一：使用 kubectl 安装

\`\`\`bash
# 创建命名空间
kubectl create namespace argocd

# 安装 Argo CD
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
\`\`\`

### 方式二：使用 Helm 安装

\`\`\`bash
# 添加 Helm 仓库
helm repo add argo https://argoproj.github.io/argo-helm
helm repo update

# 安装 Argo CD
helm install argocd argo/argo-cd -n argocd --create-namespace
\`\`\`

### 访问 Web UI

\`\`\`bash
# 端口转发
kubectl port-forward svc/argocd-server -n argocd 8080:443

# 获取初始密码
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d
\`\`\`

## 基础使用

### 创建第一个应用

\`\`\`yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: guestbook
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/argoproj/argocd-example-apps.git
    targetRevision: HEAD
    path: guestbook
  destination:
    server: https://kubernetes.default.svc
    namespace: guestbook
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
\`\`\`

### 同步策略配置

Argo CD 支持多种同步策略：

- **手动同步**：需要手动触发同步
- **自动同步**：Git 仓库有变更时自动同步
- **自动修剪**：删除集群中不再需要的资源
- **自我修复**：自动纠正配置漂移

## 高级特性

### 多源配置

\`\`\`yaml
spec:
  sources:
  - repoURL: https://github.com/my-org/my-app
    path: .
    targetRevision: main
  - repoURL: https://helm-charts.example.com
    chart: my-chart
    targetRevision: 1.2.3
\`\`\`

### Webhook 配置

配置 Git 仓库的 webhook 以实现实时同步：

\`\`\`json
{
  "url": "https://argocd.example.com/api/webhook",
  "content_type": "json",
  "events": ["push", "pull_request"]
}
\`\`\`

## 生产部署最佳实践

### 1. 高可用配置

\`\`\`yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-server
spec:
  replicas: 3
  template:
    spec:
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchLabels:
                app.kubernetes.io/name: argocd-server
            topologyKey: kubernetes.io/hostname
\`\`\`

### 2. 资源限制

\`\`\`yaml
resources:
  limits:
    cpu: 500m
    memory: 256Mi
  requests:
    cpu: 250m
    memory: 128Mi
\`\`\`

### 3. 监控与告警

配置 Prometheus 监控：

\`\`\`yaml
serviceMonitor:
  enabled: true
  labels:
    prometheus: monitoring
\`\`\`

### 4. 备份策略

定期备份 Argo CD 配置：

\`\`\`bash
# 导出应用配置
kubectl get applications -n argocd -o yaml > applications-backup.yaml

# 导出项目配置
kubectl get appprojects -n argocd -o yaml > projects-backup.yaml
\`\`\`

## 故障排除

### 常见问题

1. **同步失败**
   - 检查 Git 仓库访问权限
   - 验证 YAML 语法
   - 查看应用事件日志

2. **资源冲突**
   - 使用 \`kubectl diff\` 比较差异
   - 检查资源标签和注解
   - 考虑使用 \`replace\` 同步选项

3. **性能问题**
   - 调整控制器并发数
   - 优化资源请求和限制
   - 使用应用分片策略

### 日志查看

\`\`\`bash
# 查看 Argo CD 服务器日志
kubectl logs -n argocd deployment/argocd-server

# 查看应用控制器日志
kubectl logs -n argocd deployment/argocd-application-controller
\`\`\`

## 总结

Argo CD 是一个强大的 GitOps 工具，能够简化 Kubernetes 应用的部署和管理。通过遵循本指南的最佳实践，你可以在生产环境中安全、可靠地使用 Argo CD。

### 关键要点

- 始终使用声明式配置
- 定期备份重要配置
- 监控应用同步状态
- 遵循安全最佳实践
- 合理配置资源限制

继续学习和实践，你将能够充分发挥 Argo CD 在 GitOps 工作流中的优势。`;

export default function TestSimpleRendererPage() {
  const [renderMode, setRenderMode] = useState<"simple" | "seamless">("simple");
  const [contentSize, setContentSize] = useState("small");

  const getTestContent = () => {
    switch (contentSize) {
      case "medium":
        return testContent.repeat(3);
      case "large":
        return testContent.repeat(10);
      default:
        return testContent;
    }
  };

  const content = getTestContent();
  const contentSizeKB = Math.round(content.length / 1024);

  return (
    <div className="h-screen flex flex-col">
      {/* Controls */}
      <div className="p-4 border-b bg-muted/50">
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            <Button
              variant={renderMode === "simple" ? "default" : "outline"}
              size="sm"
              onClick={() => setRenderMode("simple")}
            >
              Simple Renderer
            </Button>
            <Button
              variant={renderMode === "seamless" ? "default" : "outline"}
              size="sm"
              onClick={() => setRenderMode("seamless")}
            >
              Seamless Renderer
            </Button>
          </div>

          <div className="flex gap-2">
            <Button
              variant={contentSize === "small" ? "default" : "outline"}
              size="sm"
              onClick={() => setContentSize("small")}
            >
              Small ({Math.round(testContent.length / 1024)}KB)
            </Button>
            <Button
              variant={contentSize === "medium" ? "default" : "outline"}
              size="sm"
              onClick={() => setContentSize("medium")}
            >
              Medium
            </Button>
            <Button
              variant={contentSize === "large" ? "default" : "outline"}
              size="sm"
              onClick={() => setContentSize("large")}
            >
              Large
            </Button>
          </div>

          <div className="ml-auto text-sm text-muted-foreground">
            Content: {contentSizeKB}KB | Mode: {renderMode}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1">
        {renderMode === "simple" ? (
          <SimpleContentRenderer
            content={content}
            title="Argo CD GitOps 实践指南"
            className="w-full h-full px-4 sm:px-6 lg:px-10 xl:px-14 py-6"
          />
        ) : (
          <div className="h-full p-4 text-center">
            <p className="text-muted-foreground">
              SeamlessContentRenderer 需要真实的
              contentId，在此测试页面中不可用。
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              请在实际的内容阅读页面中测试虚拟滚动渲染器。
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
