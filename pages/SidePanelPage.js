async isLoggedIn() {
  if (!this.page) throw new Error("Page not initialized for SidePanelPage.");
  // 检查是否存在登录表单，如果存在则说明未登录
  try {
    // 检查是否有登录相关的按钮
    const loginButtons = await this.page.$$('button');
    for (const button of loginButtons) {
      const text = await this.page.evaluate(el => el.textContent?.trim(), button);
      if (text && (text.includes('立即登录') || text.includes('Login') || text.includes('同步登录'))) {
        return false; // 找到登录按钮，说明未登录
      }
    }
    
    // 检查是否有邮箱输入框（登录表单的标志）
    const emailInput = await this.page.$('input[type="email"]');
    if (emailInput) {
      return false; // 找到登录表单，说明未登录
    }
    
    // 如果没有找到登录相关元素，说明已登录
    return true;
  } catch (error) {
    // 如果出错，默认认为未登录
    return false;
  }
} 