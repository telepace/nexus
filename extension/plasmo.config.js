// Plasmo 配置文件
module.exports = {
  // 禁用远程更新检查
  updateCheck: false,
  
  // 禁用远程依赖获取
  noHoist: true,
  noRemote: true,
  
  // 构建配置
  build: {
    // 禁用源码映射以加快构建
    sourcemap: false,
    
    // 优化构建性能
    minify: true,
    
    // 构建目标
    target: 'chrome-mv3'
  },
  
  // 开发配置
  dev: {
    // 禁用HMR的网络检查
    hmr: {
      updateCheck: false
    }
  },
  
  // 网络配置
  network: {
    timeout: 120000,
    retries: 3
  }
}; 