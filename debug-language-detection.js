// 调试语言检测的简单脚本
console.log('=== 语言检测调试 ===');

// 1. 检查浏览器语言设置
console.log('navigator.language:', navigator.language);
console.log('navigator.languages:', navigator.languages);

// 2. 检查本地存储
console.log('localStorage preferred-language:', localStorage.getItem('preferred-language'));

// 3. 模拟detectLocale函数
const locales = ['en', 'zh'];
const defaultLocale = 'en';

function debugDetectLocale() {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('preferred-language');
    if (stored && locales.includes(stored)) {
      console.log('使用本地存储语言:', stored);
      return stored;
    }
    
    // Check browser language
    const browserLang = navigator.language.split('-')[0];
    console.log('浏览器语言代码:', browserLang);
    if (locales.includes(browserLang)) {
      console.log('使用浏览器语言:', browserLang);
      return browserLang;
    }
  }
  
  console.log('使用默认语言:', defaultLocale);
  return defaultLocale;
}

const detectedLang = debugDetectLocale();
console.log('最终检测到的语言:', detectedLang);

// 4. 模拟API调用参数
const outputLanguage = detectedLang === 'en' ? 'English' : 'Chinese';
console.log('发送给API的output_language:', outputLanguage);

console.log('=== 调试完成 ===');