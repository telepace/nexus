"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { Button } from "./button";
import { Badge } from "./badge";
import { Slider } from "./slider";
import { Switch } from "./switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";
import {
  Palette,
  Zap,
  Eye,
  Settings,
  Download,
  Upload,
  RotateCcw,
  Sparkles,
  Monitor,
  Sun,
  Moon,
  Contrast,
  Type,
  Layers,
  Activity,
  Accessibility,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useReferenceStore } from "@/lib/stores/referenceStore";

/**
 * 🎨 引用主题定制器
 *
 * 设计理念：
 * - 深度个性化定制
 * - 实时预览效果
 * - 主题预设系统
 * - 无障碍友好配置
 */

export interface ReferenceThemeCustomizerProps {
  onThemeChange?: (theme: ReferenceTheme) => void;
  className?: string;
}

export interface ReferenceTheme {
  id: string;
  name: string;
  description: string;

  // 颜色系统
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    muted: string;

    // 引用特定颜色
    indicator: {
      minimal: string;
      standard: string;
      elegant: string;
    };

    preview: {
      background: string;
      border: string;
      text: string;
    };

    modal: {
      background: string;
      overlay: string;
      border: string;
    };
  };

  // 尺寸系统
  sizes: {
    indicator: {
      sm: number;
      md: number;
      lg: number;
    };

    preview: {
      maxWidth: number;
      padding: number;
      borderRadius: number;
    };

    modal: {
      maxWidth: number;
      maxHeight: string;
      borderRadius: number;
    };

    typography: {
      base: number;
      scale: number;
    };
  };

  // 动画系统
  animations: {
    duration: {
      fast: number;
      normal: number;
      slow: number;
    };

    easing: {
      ease: string;
      easeIn: string;
      easeOut: string;
      easeInOut: string;
    };

    effects: {
      enableHover: boolean;
      enableGlow: boolean;
      enableBreathe: boolean;
      enableParticles: boolean;
    };
  };

  // 无障碍设置
  accessibility: {
    highContrast: boolean;
    reducedMotion: boolean;
    focusVisible: boolean;
    largeText: boolean;
  };

  // 元数据
  metadata: {
    version: string;
    author: string;
    createdAt: string;
    updatedAt: string;
  };
}

// 预设主题
const PRESET_THEMES: ReferenceTheme[] = [
  {
    id: "default",
    name: "经典蓝",
    description: "专业、可靠的经典设计",
    colors: {
      primary: "#3b82f6",
      secondary: "#8b5cf6",
      accent: "#06b6d4",
      background: "#ffffff",
      surface: "#f8fafc",
      text: "#1e293b",
      muted: "#64748b",
      indicator: {
        minimal: "#e2e8f0",
        standard: "#dbeafe",
        elegant: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
      },
      preview: {
        background: "#ffffff",
        border: "#e2e8f0",
        text: "#374151",
      },
      modal: {
        background: "#ffffff",
        overlay: "rgba(0, 0, 0, 0.1)",
        border: "#e5e7eb",
      },
    },
    sizes: {
      indicator: { sm: 16, md: 20, lg: 24 },
      preview: { maxWidth: 320, padding: 16, borderRadius: 8 },
      modal: { maxWidth: 600, maxHeight: "80vh", borderRadius: 12 },
      typography: { base: 14, scale: 1.2 },
    },
    animations: {
      duration: { fast: 150, normal: 300, slow: 500 },
      easing: {
        ease: "cubic-bezier(0.25, 0.1, 0.25, 1)",
        easeIn: "cubic-bezier(0.42, 0, 1, 1)",
        easeOut: "cubic-bezier(0, 0, 0.58, 1)",
        easeInOut: "cubic-bezier(0.42, 0, 0.58, 1)",
      },
      effects: {
        enableHover: true,
        enableGlow: true,
        enableBreathe: false,
        enableParticles: false,
      },
    },
    accessibility: {
      highContrast: false,
      reducedMotion: false,
      focusVisible: true,
      largeText: false,
    },
    metadata: {
      version: "1.0.0",
      author: "System",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  },

  {
    id: "dark",
    name: "深邃黑",
    description: "优雅的深色主题",
    colors: {
      primary: "#60a5fa",
      secondary: "#a78bfa",
      accent: "#34d399",
      background: "#0f172a",
      surface: "#1e293b",
      text: "#f1f5f9",
      muted: "#94a3b8",
      indicator: {
        minimal: "#334155",
        standard: "#1e40af",
        elegant: "linear-gradient(135deg, #60a5fa, #a78bfa)",
      },
      preview: {
        background: "#1e293b",
        border: "#334155",
        text: "#e2e8f0",
      },
      modal: {
        background: "#1e293b",
        overlay: "rgba(0, 0, 0, 0.3)",
        border: "#475569",
      },
    },
    sizes: {
      indicator: { sm: 16, md: 20, lg: 24 },
      preview: { maxWidth: 320, padding: 16, borderRadius: 8 },
      modal: { maxWidth: 600, maxHeight: "80vh", borderRadius: 12 },
      typography: { base: 14, scale: 1.2 },
    },
    animations: {
      duration: { fast: 150, normal: 300, slow: 500 },
      easing: {
        ease: "cubic-bezier(0.25, 0.1, 0.25, 1)",
        easeIn: "cubic-bezier(0.42, 0, 1, 1)",
        easeOut: "cubic-bezier(0, 0, 0.58, 1)",
        easeInOut: "cubic-bezier(0.42, 0, 0.58, 1)",
      },
      effects: {
        enableHover: true,
        enableGlow: true,
        enableBreathe: true,
        enableParticles: false,
      },
    },
    accessibility: {
      highContrast: false,
      reducedMotion: false,
      focusVisible: true,
      largeText: false,
    },
    metadata: {
      version: "1.0.0",
      author: "System",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  },

  {
    id: "minimal",
    name: "极简白",
    description: "简洁至上的设计",
    colors: {
      primary: "#6b7280",
      secondary: "#9ca3af",
      accent: "#059669",
      background: "#ffffff",
      surface: "#fefefe",
      text: "#111827",
      muted: "#6b7280",
      indicator: {
        minimal: "#f3f4f6",
        standard: "#e5e7eb",
        elegant: "#d1d5db",
      },
      preview: {
        background: "#ffffff",
        border: "#e5e7eb",
        text: "#374151",
      },
      modal: {
        background: "#ffffff",
        overlay: "rgba(0, 0, 0, 0.05)",
        border: "#d1d5db",
      },
    },
    sizes: {
      indicator: { sm: 14, md: 18, lg: 22 },
      preview: { maxWidth: 280, padding: 12, borderRadius: 4 },
      modal: { maxWidth: 500, maxHeight: "70vh", borderRadius: 8 },
      typography: { base: 13, scale: 1.15 },
    },
    animations: {
      duration: { fast: 100, normal: 200, slow: 300 },
      easing: {
        ease: "cubic-bezier(0.4, 0, 0.2, 1)",
        easeIn: "cubic-bezier(0.4, 0, 1, 1)",
        easeOut: "cubic-bezier(0, 0, 0.2, 1)",
        easeInOut: "cubic-bezier(0.4, 0, 0.2, 1)",
      },
      effects: {
        enableHover: false,
        enableGlow: false,
        enableBreathe: false,
        enableParticles: false,
      },
    },
    accessibility: {
      highContrast: false,
      reducedMotion: true,
      focusVisible: true,
      largeText: false,
    },
    metadata: {
      version: "1.0.0",
      author: "System",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  },
];

const ReferenceThemeCustomizer: React.FC<ReferenceThemeCustomizerProps> = ({
  onThemeChange,
  className,
}) => {
  // 状态管理
  const [currentTheme, setCurrentTheme] = useState<ReferenceTheme>(
    PRESET_THEMES[0],
  );
  const [activeTab, setActiveTab] = useState("presets");
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [customizations, setCustomizations] = useState<Partial<ReferenceTheme>>(
    {},
  );

  // Store hooks
  const { updateConfig } = useReferenceStore();

  // 应用主题
  const applyTheme = useCallback(
    (theme: ReferenceTheme) => {
      // 更新 CSS 变量
      const root = document.documentElement;

      // 颜色变量
      root.style.setProperty("--ref-primary", theme.colors.primary);
      root.style.setProperty("--ref-secondary", theme.colors.secondary);
      root.style.setProperty("--ref-accent", theme.colors.accent);
      root.style.setProperty("--ref-background", theme.colors.background);
      root.style.setProperty("--ref-surface", theme.colors.surface);
      root.style.setProperty("--ref-text", theme.colors.text);
      root.style.setProperty("--ref-muted", theme.colors.muted);

      // 尺寸变量
      root.style.setProperty(
        "--ref-indicator-sm",
        `${theme.sizes.indicator.sm}px`,
      );
      root.style.setProperty(
        "--ref-indicator-md",
        `${theme.sizes.indicator.md}px`,
      );
      root.style.setProperty(
        "--ref-indicator-lg",
        `${theme.sizes.indicator.lg}px`,
      );

      // 动画变量
      root.style.setProperty(
        "--ref-duration-fast",
        `${theme.animations.duration.fast}ms`,
      );
      root.style.setProperty(
        "--ref-duration-normal",
        `${theme.animations.duration.normal}ms`,
      );
      root.style.setProperty(
        "--ref-duration-slow",
        `${theme.animations.duration.slow}ms`,
      );

      // 更新 Store 配置
      updateConfig({
        animationDuration: theme.animations.duration.normal,
        enableAnimations: !theme.accessibility.reducedMotion,
      });

      setCurrentTheme(theme);
      onThemeChange?.(theme);
    },
    [updateConfig, onThemeChange],
  );

  // 创建自定义主题
  const createCustomTheme = useCallback(
    (
      base: ReferenceTheme,
      overrides: Partial<ReferenceTheme>,
    ): ReferenceTheme => {
      return {
        ...base,
        ...overrides,
        id: "custom",
        name: "自定义主题",
        description: "基于 " + base.name + " 的自定义主题",
        colors: { ...base.colors, ...overrides.colors },
        sizes: { ...base.sizes, ...overrides.sizes },
        animations: { ...base.animations, ...overrides.animations },
        accessibility: { ...base.accessibility, ...overrides.accessibility },
        metadata: {
          ...base.metadata,
          updatedAt: new Date().toISOString(),
        },
      };
    },
    [],
  );

  // 渲染预设主题
  const renderPresetThemes = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {PRESET_THEMES.map((theme) => (
        <motion.div
          key={theme.id}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.02 }}
          className={cn(
            "relative p-4 rounded-lg border-2 cursor-pointer transition-all",
            currentTheme.id === theme.id
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50",
          )}
          onClick={() => applyTheme(theme)}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{theme.name}</h3>
              {currentTheme.id === theme.id && (
                <Badge variant="default" className="text-xs">
                  当前
                </Badge>
              )}
            </div>

            <p className="text-sm text-muted-foreground">{theme.description}</p>

            {/* 颜色预览 */}
            <div className="flex gap-2">
              <div
                className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                style={{ backgroundColor: theme.colors.primary }}
              />
              <div
                className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                style={{ backgroundColor: theme.colors.secondary }}
              />
              <div
                className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                style={{ backgroundColor: theme.colors.accent }}
              />
            </div>

            {/* 特性标签 */}
            <div className="flex flex-wrap gap-1">
              {theme.animations.effects.enableGlow && (
                <Badge variant="secondary" className="text-xs">
                  发光
                </Badge>
              )}
              {theme.animations.effects.enableBreathe && (
                <Badge variant="secondary" className="text-xs">
                  呼吸
                </Badge>
              )}
              {theme.accessibility.reducedMotion && (
                <Badge variant="secondary" className="text-xs">
                  减少动画
                </Badge>
              )}
              {theme.accessibility.highContrast && (
                <Badge variant="secondary" className="text-xs">
                  高对比度
                </Badge>
              )}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );

  // 渲染颜色定制
  const renderColorCustomization = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5" />
            主色调
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(currentTheme.colors).map(([key, value]) => {
            if (typeof value === "string") {
              return (
                <div key={key} className="flex items-center justify-between">
                  <label className="text-sm font-medium capitalize">
                    {key.replace(/([A-Z])/g, " $1").trim()}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={value}
                      className="w-8 h-8 rounded border cursor-pointer"
                      onChange={(e) => {
                        const newTheme = createCustomTheme(currentTheme, {
                          colors: {
                            ...currentTheme.colors,
                            [key]: e.target.value,
                          },
                        });
                        applyTheme(newTheme);
                      }}
                    />
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {value}
                    </code>
                  </div>
                </div>
              );
            }
            return null;
          })}
        </CardContent>
      </Card>
    </div>
  );

  // 渲染尺寸定制
  const renderSizeCustomization = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="w-5 h-5" />
            指示器尺寸
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(currentTheme.sizes.indicator).map(([size, value]) => (
            <div key={size} className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium capitalize">{size}</label>
                <span className="text-sm text-muted-foreground">{value}px</span>
              </div>
              <Slider
                value={[value]}
                onValueChange={([newValue]) => {
                  const newTheme = createCustomTheme(currentTheme, {
                    sizes: {
                      ...currentTheme.sizes,
                      indicator: {
                        ...currentTheme.sizes.indicator,
                        [size]: newValue,
                      },
                    },
                  });
                  applyTheme(newTheme);
                }}
                min={12}
                max={32}
                step={2}
                className="flex-1"
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Type className="w-5 h-5" />
            字体尺寸
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">基础字号</label>
              <span className="text-sm text-muted-foreground">
                {currentTheme.sizes.typography.base}px
              </span>
            </div>
            <Slider
              value={[currentTheme.sizes.typography.base]}
              onValueChange={([newValue]) => {
                const newTheme = createCustomTheme(currentTheme, {
                  sizes: {
                    ...currentTheme.sizes,
                    typography: {
                      ...currentTheme.sizes.typography,
                      base: newValue,
                    },
                  },
                });
                applyTheme(newTheme);
              }}
              min={10}
              max={20}
              step={1}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // 渲染动画定制
  const renderAnimationCustomization = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            动画时长
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(currentTheme.animations.duration).map(
            ([speed, value]) => (
              <div key={speed} className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium capitalize">
                    {speed}
                  </label>
                  <span className="text-sm text-muted-foreground">
                    {value}ms
                  </span>
                </div>
                <Slider
                  value={[value]}
                  onValueChange={([newValue]) => {
                    const newTheme = createCustomTheme(currentTheme, {
                      animations: {
                        ...currentTheme.animations,
                        duration: {
                          ...currentTheme.animations.duration,
                          [speed]: newValue,
                        },
                      },
                    });
                    applyTheme(newTheme);
                  }}
                  min={50}
                  max={1000}
                  step={50}
                />
              </div>
            ),
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            特效开关
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(currentTheme.animations.effects).map(
            ([effect, enabled]) => (
              <div key={effect} className="flex items-center justify-between">
                <label className="text-sm font-medium">
                  {effect
                    .replace(/([A-Z])/g, " $1")
                    .replace("enable ", "")
                    .trim()}
                </label>
                <Switch
                  checked={enabled}
                  onCheckedChange={(checked) => {
                    const newTheme = createCustomTheme(currentTheme, {
                      animations: {
                        ...currentTheme.animations,
                        effects: {
                          ...currentTheme.animations.effects,
                          [effect]: checked,
                        },
                      },
                    });
                    applyTheme(newTheme);
                  }}
                />
              </div>
            ),
          )}
        </CardContent>
      </Card>
    </div>
  );

  // 渲染无障碍定制
  const renderAccessibilityCustomization = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Accessibility className="w-5 h-5" />
          无障碍设置
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.entries(currentTheme.accessibility).map(
          ([setting, enabled]) => (
            <div key={setting} className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">
                  {setting.replace(/([A-Z])/g, " $1").trim()}
                </label>
                <p className="text-xs text-muted-foreground">
                  {setting === "highContrast" && "提高颜色对比度"}
                  {setting === "reducedMotion" && "减少动画效果"}
                  {setting === "focusVisible" && "显示焦点指示器"}
                  {setting === "largeText" && "使用更大的文字"}
                </p>
              </div>
              <Switch
                checked={enabled}
                onCheckedChange={(checked) => {
                  const newTheme = createCustomTheme(currentTheme, {
                    accessibility: {
                      ...currentTheme.accessibility,
                      [setting]: checked,
                    },
                  });
                  applyTheme(newTheme);
                }}
              />
            </div>
          ),
        )}
      </CardContent>
    </Card>
  );

  // 导出主题
  const exportTheme = useCallback(() => {
    const dataStr = JSON.stringify(currentTheme, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `${currentTheme.name.replace(/\s+/g, "-").toLowerCase()}-theme.json`;
    link.click();

    URL.revokeObjectURL(url);
  }, [currentTheme]);

  // 导入主题
  const importTheme = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedTheme = JSON.parse(
            e.target?.result as string,
          ) as ReferenceTheme;
          applyTheme(importedTheme);
        } catch (error) {
          console.error("Failed to import theme:", error);
        }
      };
      reader.readAsText(file);
    },
    [applyTheme],
  );

  // 重置主题
  const resetTheme = useCallback(() => {
    applyTheme(PRESET_THEMES[0]);
  }, [applyTheme]);

  return (
    <div className={cn("space-y-6", className)}>
      {/* 头部控制 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">主题定制</h2>
          <p className="text-muted-foreground">个性化你的引用样式体验</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPreviewMode(!isPreviewMode)}
          >
            <Eye className="w-4 h-4 mr-2" />
            {isPreviewMode ? "退出预览" : "实时预览"}
          </Button>

          <Button variant="outline" size="sm" onClick={exportTheme}>
            <Download className="w-4 h-4 mr-2" />
            导出
          </Button>

          <label className="cursor-pointer">
            <Button variant="outline" size="sm" asChild>
              <span>
                <Upload className="w-4 h-4 mr-2" />
                导入
              </span>
            </Button>
            <input
              type="file"
              accept=".json"
              className="hidden"
              onChange={importTheme}
            />
          </label>

          <Button variant="outline" size="sm" onClick={resetTheme}>
            <RotateCcw className="w-4 h-4 mr-2" />
            重置
          </Button>
        </div>
      </div>

      {/* 主题标签页 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="presets">预设</TabsTrigger>
          <TabsTrigger value="colors">颜色</TabsTrigger>
          <TabsTrigger value="sizes">尺寸</TabsTrigger>
          <TabsTrigger value="animations">动画</TabsTrigger>
          <TabsTrigger value="accessibility">无障碍</TabsTrigger>
        </TabsList>

        <TabsContent value="presets" className="space-y-6">
          {renderPresetThemes()}
        </TabsContent>

        <TabsContent value="colors" className="space-y-6">
          {renderColorCustomization()}
        </TabsContent>

        <TabsContent value="sizes" className="space-y-6">
          {renderSizeCustomization()}
        </TabsContent>

        <TabsContent value="animations" className="space-y-6">
          {renderAnimationCustomization()}
        </TabsContent>

        <TabsContent value="accessibility" className="space-y-6">
          {renderAccessibilityCustomization()}
        </TabsContent>
      </Tabs>

      {/* 当前主题信息 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            当前主题信息
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="font-medium">名称</p>
              <p className="text-muted-foreground">{currentTheme.name}</p>
            </div>
            <div>
              <p className="font-medium">版本</p>
              <p className="text-muted-foreground">
                {currentTheme.metadata.version}
              </p>
            </div>
            <div>
              <p className="font-medium">作者</p>
              <p className="text-muted-foreground">
                {currentTheme.metadata.author}
              </p>
            </div>
            <div>
              <p className="font-medium">更新时间</p>
              <p className="text-muted-foreground">
                {new Date(currentTheme.metadata.updatedAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReferenceThemeCustomizer;
