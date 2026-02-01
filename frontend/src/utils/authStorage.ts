/**
 * 登录态存储（sessionStorage），供 API 请求头与 Redux 恢复会话共用。
 * 刷新后请求发出前可从此处同步恢复 X-Username，避免首轮请求无用户信息。
 */
const AUTH_USERNAME_KEY = 'auth_username';

export function getStoredAuthUsername(): string | null {
  try {
    const s = sessionStorage.getItem(AUTH_USERNAME_KEY);
    return s && s.trim() ? s.trim() : null;
  } catch {
    return null;
  }
}

export function setStoredAuthUsername(username: string | null): void {
  try {
    if (username) {
      sessionStorage.setItem(AUTH_USERNAME_KEY, username);
    } else {
      sessionStorage.removeItem(AUTH_USERNAME_KEY);
    }
  } catch {
    sessionStorage.removeItem(AUTH_USERNAME_KEY);
  }
}
