const TOKEN_KEY = "campusPulseToken";
const USER_KEY = "campusPulseUser";

export function getStoredUser() {
  const token = sessionStorage.getItem(TOKEN_KEY);
  const rawUser = sessionStorage.getItem(USER_KEY);

  if (!token || !rawUser) {
    return null;
  }

  try {
    const user = JSON.parse(rawUser);

    if (!user || typeof user.name !== "string" || !user.name.trim()) {
      return null;
    }

    if (typeof user.email !== "string" || !user.email.trim()) {
      return null;
    }

    return user;
  } catch {
    return null;
  }
}

export function storeSession(token, user) {
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
}

export function dashboardPath(user) {
  if (user?.role === "admin") {
    return "/admin";
  }

  if (user?.role === "staff") {
    return "/staff";
  }

  return "/dashboard";
}
