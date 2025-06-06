"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { TimeZone, getBrowserTimeZone } from "./date";
import { updateGlobalTimezone } from "./api/timezone";

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
          const browserTimeZone = getBrowserTimeZone();
          setTimeZoneState(browserTimeZone);
          // 同步到API客户端
          updateGlobalTimezone(browserTimeZone);
        } else if (timeZone) {
          setTimeZoneState(timeZone);
          // 同步到API客户端
          updateGlobalTimezone(timeZone);
        }

        setIsAutoTimeZone(isAutoTimeZone);
      } else {
        // 首次访问，使用浏览器时区并同步到API客户端
        const browserTimeZone = getBrowserTimeZone();
        updateGlobalTimezone(browserTimeZone);
      }
    } catch (error) {
      console.error("Failed to load time zone settings:", error);
      // 出错时使用默认值并同步到API客户端
      const browserTimeZone = getBrowserTimeZone();
      updateGlobalTimezone(browserTimeZone);
    }
  }, []);

  // 设置时区并保存到本地存储
  const setTimeZone = (newTimeZone: TimeZone) => {
    setTimeZoneState(newTimeZone);
    // 同步到API客户端
    updateGlobalTimezone(newTimeZone);
    saveSettings(newTimeZone, isAutoTimeZone);
  };

  // 设置是否自动检测时区并保存到本地存储
  const setAutoTimeZone = (isAuto: boolean) => {
    setIsAutoTimeZone(isAuto);

    // 如果启用自动检测，则使用浏览器时区
    if (isAuto) {
      const browserTimeZone = getBrowserTimeZone();
      setTimeZoneState(browserTimeZone);
      // 同步到API客户端
      updateGlobalTimezone(browserTimeZone);
      saveSettings(browserTimeZone, isAuto);
    } else {
      // 同步到API客户端
      updateGlobalTimezone(timeZone);
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

  // 监听浏览器时区变化（如果启用自动检测）
  useEffect(() => {
    if (!isAutoTimeZone) return;

    // 创建一个检查时区变化的函数
    const checkTimezoneChange = () => {
      const currentBrowserTimeZone = getBrowserTimeZone();
      if (currentBrowserTimeZone !== timeZone) {
        setTimeZoneState(currentBrowserTimeZone);
        updateGlobalTimezone(currentBrowserTimeZone);
        saveSettings(currentBrowserTimeZone, true);
      }
    };

    // 每分钟检查一次时区变化
    const interval = setInterval(checkTimezoneChange, 60000);

    // 监听页面焦点事件，用户可能在另一个时区访问
    const handleFocus = () => {
      checkTimezoneChange();
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [isAutoTimeZone, timeZone]);

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
