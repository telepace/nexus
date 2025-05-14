import {
  loginAccessToken,
  recoverPassword as resetForgotPassword,
  resetPassword as resetResetPassword,
  registerUser,
  testToken,
  readUserMe,
  updateUserMe,
  deleteUserMe,
  updatePasswordMe,
  readItems,
  createItem,
  readItem,
  updateItem,
  deleteItem,
} from "./openapi-client/sdk.gen";

import type {
  HTTPValidationError,
  LoginAccessTokenError as AuthJwtLoginError,
  RegisterUserError as RegisterUserError,
} from "./openapi-client/types.gen";

// 为兼容性导出别名
export const authJwtLogin = loginAccessToken;
export const registerRegister = registerUser;

// 导出错误类型别名
export type { AuthJwtLoginError, HTTPValidationError };
export type RegisterRegisterError = RegisterUserError;

// 导出所有函数
export {
  loginAccessToken,
  resetForgotPassword,
  resetResetPassword,
  registerUser,
  testToken,
  readUserMe,
  updateUserMe,
  deleteUserMe,
  updatePasswordMe,
  readItems,
  createItem,
  readItem,
  updateItem,
  deleteItem,
};

// 确保配置被导入
import "@/lib/clientConfig";
