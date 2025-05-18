import React, { useEffect } from "react"
import { render } from "react-dom"
import "../../styles/globals.css"

const OnboardingPage = () => {
  // 用户完成引导页面后调用此函数
  const handleDone = () => {
    chrome.runtime.sendMessage({
      action: "onboarding", 
      type: "onboardingComplete"
    });
    
    // 可以跳转到扩展的其他页面或关闭此页面
    setTimeout(() => {
      window.close();
    }, 300);
  };

  // 记录引导页面被访问
  useEffect(() => {
    console.log("Onboarding页面加载完成");
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-gray-900">欢迎使用 Nexus AI!</h1>
          <p className="mt-2 text-sm text-gray-600">
            请将图标固定到右上角工具栏，以便随时访问
          </p>
        </div>

        <div className="my-8">
          <div className="flex justify-center">
            {/* 固定图标的引导GIF/图片 */}
            <div className="border border-gray-200 rounded-md overflow-hidden shadow-sm">
              <img 
                src={chrome.runtime.getURL("assets/pin-extension.gif")}
                alt="固定扩展图标演示" 
                className="w-full"
                // 如果不存在GIF，可以使用SVG占位图
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.onerror = null;
                  target.src = chrome.runtime.getURL("assets/pin-extension.svg");
                }}
              />
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-md bg-indigo-600 text-white">
                1
              </div>
              <div className="ml-4">
                <p className="text-base font-medium text-gray-900">点击右上角的"拼图"图标</p>
                <p className="text-sm text-gray-500">打开Chrome的扩展管理面板</p>
              </div>
            </div>

            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-md bg-indigo-600 text-white">
                2
              </div>
              <div className="ml-4">
                <p className="text-base font-medium text-gray-900">找到"Nexus AI"并点击图钉📌</p>
                <p className="text-sm text-gray-500">这样图标就会固定在工具栏上了</p>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center">
          <button
            onClick={handleDone}
            className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            我已固定图标，开始使用
          </button>
        </div>

        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">
            固定图标后，您可以随时快速访问Nexus AI的智能功能
          </p>
        </div>
      </div>
    </div>
  )
}

render(<OnboardingPage />, document.getElementById("root")) 