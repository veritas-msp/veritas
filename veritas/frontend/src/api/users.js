import API_BASE_URL from "../config";
import { readApiErrorPayload, createApiError } from "../utils/apiErrors";
const BASE_URL = `${API_BASE_URL}/users`;
const jsonHeaders = {
  "Content-Type": "application/json"
};
export const fetchUsers = async (options = {}) => {
  const res = await fetch(BASE_URL, {
    headers: jsonHeaders,
    credentials: "include",
    signal: options.signal
  });
  if (!res.ok) throw new Error("Error loading users");
  return await res.json();
};
export const fetchActiveUsers = async () => {
  const res = await fetch(`${BASE_URL}/active`, {
    headers: jsonHeaders,
    credentials: "include"
  });
  if (!res.ok) throw new Error("Error loading active users");
  return await res.json();
};
export const fetchUser = async id => {
  const res = await fetch(`${BASE_URL}/${id}`, {
    headers: jsonHeaders,
    credentials: "include"
  });
  if (!res.ok) throw new Error("Error loading user");
  return await res.json();
};
export const fetchCurrentUser = async () => {
  const res = await fetch(`${BASE_URL}/me`, {
    headers: jsonHeaders,
    credentials: "include"
  });
  if (!res.ok) throw new Error("Error loading profile");
  return await res.json();
};
const DEFAULT_USER_PROFILE = "Agent";
function buildUserUpdatePayload(user) {
  const payload = {
    is_active: !!user?.is_active
  };
  const username = String(user?.username ?? "").trim();
  const email = String(user?.email ?? "").trim();
  const profile = String(user?.profile ?? "").trim();
  const role = String(user?.role ?? "").trim();
  if (username) payload.username = username;
  if (email) payload.email = email;
  if (profile) payload.profile = profile;
  if (role) payload.role = role;
  return payload;
}
async function readApiError(res, fallbackMessage) {
  try {
    const data = await res.json();
    const validationMsg = Array.isArray(data?.errors) ? data.errors.map(e => e.msg).filter(Boolean).join(" · ") : "";
    return validationMsg || data?.error || fallbackMessage;
  } catch {
    return fallbackMessage;
  }
}
export const createUser = async ({
  email,
  username,
  password,
  profile,
  is_active
}) => {
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({
      email,
      username,
      password,
      profile: profile || DEFAULT_USER_PROFILE,
      is_active
    }),
    credentials: "include"
  });
  if (!res.ok) {
    const data = await readApiErrorPayload(res);
    throw createApiError(data.error || "Error creating user", {
      code: data.code,
      status: res.status
    });
  }
  return await res.json();
};
export const updateUserRole = async (id, role) => {
  const res = await fetch(`${BASE_URL}/${id}/role`, {
    method: "PUT",
    headers: jsonHeaders,
    body: JSON.stringify({
      role
    }),
    credentials: "include"
  });
  if (!res.ok) throw new Error("Error updating role");
  return await res.json();
};
export const resetPassword = async (id, newPassword) => {
  const res = await fetch(`${BASE_URL}/${id}/password`, {
    method: "PATCH",
    headers: jsonHeaders,
    body: JSON.stringify({
      newPassword
    }),
    credentials: "include"
  });
  if (!res.ok) throw new Error(await readApiError(res, "Error resetting password"));
  return await res.json();
};
export const updateUser = async (id, data) => {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: "PATCH",
    headers: jsonHeaders,
    body: JSON.stringify(data),
    credentials: "include"
  });
  if (!res.ok) {
    throw new Error(await readApiError(res, "Error updating user"));
  }
  return await res.json();
};
export { buildUserUpdatePayload };
export const updateEmail = async (id, email) => {
  const res = await fetch(`${BASE_URL}/${id}/email`, {
    method: "PATCH",
    headers: jsonHeaders,
    body: JSON.stringify({
      email
    }),
    credentials: "include"
  });
  if (!res.ok) throw new Error(await readApiError(res, "Error updating email"));
  return await res.json();
};
export const updateUsername = async (id, username) => {
  const res = await fetch(`${BASE_URL}/${id}/username`, {
    method: "PATCH",
    headers: jsonHeaders,
    body: JSON.stringify({
      username
    }),
    credentials: "include"
  });
  if (!res.ok) throw new Error(await readApiError(res, "Error updating username"));
  return await res.json();
};
export const deleteUser = async id => {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: "DELETE",
    headers: jsonHeaders,
    credentials: "include"
  });
  if (!res.ok) {
    throw new Error(await readApiError(res, "Error deleting user"));
  }
  return await res.json();
};
export const releaseUserMfa = async id => {
  const res = await fetch(`${BASE_URL}/${id}/mfa`, {
    method: "DELETE",
    headers: jsonHeaders,
    credentials: "include"
  });
  if (!res.ok) {
    throw new Error(await readApiError(res, "Error resetting MFA"));
  }
  return await res.json();
};
export const uploadUserAvatar = async file => {
  const formData = new FormData();
  formData.append("avatar", file);
  const res = await fetch(`${BASE_URL}/me/avatar`, {
    method: "POST",
    credentials: "include",
    body: formData
  });
  if (!res.ok) {
    throw new Error(await readApiError(res, "Error uploading avatar"));
  }
  return await res.json();
};
export const saveUserAvatarPreset = async presetId => {
  const res = await fetch(`${BASE_URL}/me/avatar/preset`, {
    method: "POST",
    headers: jsonHeaders,
    credentials: "include",
    body: JSON.stringify({
      presetId
    })
  });
  if (!res.ok) {
    throw new Error(await readApiError(res, "Error saving avatar"));
  }
  return await res.json();
};
export const clearUserAvatar = async () => {
  const res = await fetch(`${BASE_URL}/me/avatar`, {
    method: "DELETE",
    headers: jsonHeaders,
    credentials: "include"
  });
  if (!res.ok) {
    throw new Error(await readApiError(res, "Error deleting avatar"));
  }
  return await res.json();
};

export const impersonateUser = async userId => {
  const res = await fetch(`${API_BASE_URL}/auth/impersonate/users/${userId}`, {
    method: "POST",
    headers: jsonHeaders,
    credentials: "include"
  });
  if (!res.ok) {
    throw new Error(await readApiError(res, "Unable to start impersonation"));
  }
  return await res.json();
};

export const stopUserImpersonation = async () => {
  const res = await fetch(`${API_BASE_URL}/auth/impersonate/stop`, {
    method: "POST",
    headers: jsonHeaders,
    credentials: "include"
  });
  if (!res.ok) {
    throw new Error(await readApiError(res, "Unable to exit impersonation"));
  }
  return await res.json();
};
