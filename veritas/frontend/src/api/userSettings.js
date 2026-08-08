import API_BASE_URL from "../config";
const BASE_URL = `${API_BASE_URL}/user-settings`;
const jsonHeaders = {
  "Content-Type": "application/json"
};
export const getUserSetting = async key => {
  const res = await fetch(`${BASE_URL}/${key}`, {
    headers: jsonHeaders,
    credentials: "include"
  });
  if (!res.ok) {
    if (res.status === 404) {
      return {
        value: null
      };
    }
    throw new Error("Error fetching setting");
  }
  return await res.json();
};
export const saveUserSetting = async (key, value) => {
  const res = await fetch(`${BASE_URL}/${key}`, {
    method: "POST",
    headers: jsonHeaders,
    credentials: "include",
    body: JSON.stringify({
      value
    })
  });
  if (!res.ok) {
    throw new Error("Error saving setting");
  }
  return await res.json();
};
export const getAllUserSettings = async () => {
  const res = await fetch(`${BASE_URL}`, {
    headers: jsonHeaders,
    credentials: "include"
  });
  if (!res.ok) {
    throw new Error("Error fetching settings");
  }
  return await res.json();
};
