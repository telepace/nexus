import {
  loginLoginAccessToken as loginAccessToken,
  loginRecoverPassword as resetForgotPassword,
  loginResetPassword as resetResetPassword,
  usersRegisterUser as registerUser,
  loginTestToken as testToken,
  usersReadUserMe as readUserMe,
  usersUpdateUserMe as updateUserMe,
  usersDeleteUserMe as deleteUserMe,
  usersUpdatePasswordMe as updatePasswordMe,
  itemsReadItems as readItems,
  itemsCreateItem as createItem,
  itemsReadItem as readItem,
  itemsUpdateItem as updateItem,
  itemsDeleteItem as deleteItem,
  promptsReadPrompts as readPrompts,
  promptsCreatePrompt as createPrompt,
  promptsReadPrompt as readPrompt,
  promptsUpdatePrompt as updatePrompt,
  promptsDeletePrompt as deletePrompt,
  promptsReadTags as readTags,
  promptsCreateTag as createTag,
  promptsUpdateTag as updateTag,
  promptsDeleteTag as deleteTag,
  promptsReadPromptVersions as readPromptVersions,
  promptsCreatePromptVersion as createPromptVersion,
  promptsReadPromptVersion as readPromptVersion,
  promptsDuplicatePrompt as duplicatePrompt,
  promptsTogglePromptEnabled as togglePromptEnabledApi,
} from "./openapi-client/sdk.gen";

import type {
  HTTPValidationError,
  LoginLoginAccessTokenError as AuthJwtLoginError,
  UsersRegisterUserError as RegisterUserError,
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
  readPrompts,
  createPrompt,
  readPrompt,
  updatePrompt,
  deletePrompt,
  readTags,
  createTag,
  updateTag,
  deleteTag,
  readPromptVersions,
  createPromptVersion,
  readPromptVersion,
  duplicatePrompt,
  togglePromptEnabledApi,
};

// 确保配置被导入
import "@/lib/clientConfig";
