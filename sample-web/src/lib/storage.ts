const TOKEN_KEY = "family-expense.token";
const USER_KEY = "family-expense.user";

export function saveToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function saveUser(user: string) {
  localStorage.setItem(USER_KEY, user);
}

export function getUser() {
  return localStorage.getItem(USER_KEY);
}

export function clearUser() {
  localStorage.removeItem(USER_KEY);
}
