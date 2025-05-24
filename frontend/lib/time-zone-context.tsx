"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { TimeZone, getBrowserTimeZone } from "./date";

// 创建本地存储的键名
const TIME_ZONE_STORAGE_KEY = "nexus-time-zone";

// 定义上下文类型
interface TimeZoneContextType {
  timeZone: TimeZone;
  setTimeZone: (timeZone: TimeZone) => void;
  isAutoTimeZone: boolean;
  setIsAutoTimeZone: (isAuto: boolean) => void;
}

// 创建上下文
const TimeZoneContext = createContext<TimeZoneContextType | undefined>(
  undefined,
);

// 创建提供者组件
export const TimeZoneProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // 初始化状态
  const [timeZone, setTimeZoneState] = useState<TimeZone>(getBrowserTimeZone());
  const [isAutoTimeZone, setIsAutoTimeZone] = useState<boolean>(true);

  // 组件挂载时从本地存储加载设置
  useEffect(() => {
    try {
      const storedSettings = localStorage.getItem(TIME_ZONE_STORAGE_KEY);
      if (storedSettings) {
        const { timeZone, isAutoTimeZone } = JSON.parse(storedSettings);

        if (isAutoTimeZone) {
          setTimeZoneState(getBrowserTimeZone());
        } else if (timeZone) {
          setTimeZoneState(timeZone);
        }

        setIsAutoTimeZone(isAutoTimeZone);
      }
    } catch (error) {
      console.error("Failed to load time zone settings:", error);
    }
  }, []);

  // 设置时区并保存到本地存储
  const setTimeZone = (newTimeZone: TimeZone) => {
    setTimeZoneState(newTimeZone);
    saveSettings(newTimeZone, isAutoTimeZone);
  };

  // 设置是否自动检测时区并保存到本地存储
  const setAutoTimeZone = (isAuto: boolean) => {
    setIsAutoTimeZone(isAuto);

    // 如果启用自动检测，则使用浏览器时区
    if (isAuto) {
      const browserTimeZone = getBrowserTimeZone();
      setTimeZoneState(browserTimeZone);
      saveSettings(browserTimeZone, isAuto);
    } else {
      saveSettings(timeZone, isAuto);
    }
  };

  // 保存设置到本地存储
  const saveSettings = (timeZone: TimeZone, isAuto: boolean) => {
    try {
      localStorage.setItem(
        TIME_ZONE_STORAGE_KEY,
        JSON.stringify({ timeZone, isAutoTimeZone: isAuto }),
      );
    } catch (error) {
      console.error("Failed to save time zone settings:", error);
    }
  };

  // 提供上下文值
  const contextValue: TimeZoneContextType = {
    timeZone,
    setTimeZone,
    isAutoTimeZone,
    setIsAutoTimeZone: setAutoTimeZone,
  };

  return (
    <TimeZoneContext.Provider value={contextValue}>
      {children}
    </TimeZoneContext.Provider>
  );
};

// 创建自定义钩子
export const useTimeZone = (): TimeZoneContextType => {
  const context = useContext(TimeZoneContext);
  if (context === undefined) {
    throw new Error("useTimeZone must be used within a TimeZoneProvider");
  }
  return context;
};
