/**
 * 日志工具类
 * 用于在终端显示带颜色的日志信息
 */

const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
};

export const logger = {
  info: (message: string) => {
    console.log(`${colors.blue}[INFO]${colors.reset} ${message}`);
  },
  success: (message: string) => {
    console.log(`${colors.green}[SUCCESS]${colors.reset} ${message}`);
  },
  warn: (message: string) => {
    console.log(`${colors.yellow}[WARNING]${colors.reset} ${message}`);
  },
  error: (message: string) => {
    console.log(`${colors.red}[ERROR]${colors.reset} ${message}`);
  },
  api: (message: string) => {
    console.log(`${colors.cyan}[API]${colors.reset} ${message}`);
  },
};

export default logger;
