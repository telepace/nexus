"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function ProgressBar() {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const router = useRouter();

  useEffect(() => {
    let progressTimer: NodeJS.Timeout;
    let finishTimer: NodeJS.Timeout;

    const handleStart = () => {
      setIsLoading(true);
      setProgress(0);

      // 模拟进度增长
      progressTimer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 10;
        });
      }, 100);
    };

    const handleComplete = () => {
      setProgress(100);
      finishTimer = setTimeout(() => {
        setIsLoading(false);
        setProgress(0);
      }, 200);
    };

    // 监听路由变化 - 修复Promise处理
    const originalPush = router.push;
    router.push = function (...args) {
      handleStart();

      try {
        const result = originalPush.apply(this, args);

        // 检查返回值是否是Promise
        if (result && typeof result.then === "function") {
          return result
            .then((res) => {
              handleComplete();
              return res;
            })
            .catch((error) => {
              handleComplete();
              throw error;
            });
        } else {
          // 如果不是Promise，延迟一点时间再完成进度条
          setTimeout(handleComplete, 100);
          return result;
        }
      } catch (error) {
        handleComplete();
        throw error;
      }
    };

    return () => {
      if (progressTimer) clearInterval(progressTimer);
      if (finishTimer) clearTimeout(finishTimer);
      // 恢复原始的push方法
      router.push = originalPush;
    };
  }, [router]);

  if (!isLoading) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-transparent">
      <div
        className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-200 ease-out shadow-sm"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
