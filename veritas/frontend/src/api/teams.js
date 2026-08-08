import API_BASE_URL from "../config";
async function handleJsonResponse(response, fallbackMessage) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || data.message || fallbackMessage);
  }
  return data;
}
export async function fetchTeams() {
  const response = await fetch(`${API_BASE_URL}/teams`, {
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    }
  });
  return handleJsonResponse(response, "Error loading teams");
}
export async function fetchTeamsForPlanning() {
  const response = await fetch(`${API_BASE_URL}/teams/planning`, {
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    }
  });
  return handleJsonResponse(response, "Error loading teams");
}
export async function fetchTeam(teamId) {
  const response = await fetch(`${API_BASE_URL}/teams/${teamId}`, {
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    }
  });
  return handleJsonResponse(response, "Error loading team");
}
export async function createTeam(payload) {
  const response = await fetch(`${API_BASE_URL}/teams`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload || {})
  });
  return handleJsonResponse(response, "Error creating team");
}
export async function updateTeam(teamId, payload) {
  const response = await fetch(`${API_BASE_URL}/teams/${teamId}`, {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload || {})
  });
  return handleJsonResponse(response, "Error updating team");
}
export async function deleteTeam(teamId) {
  const response = await fetch(`${API_BASE_URL}/teams/${teamId}`, {
    method: "DELETE",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    }
  });
  if (response.status === 204) return true;
  return handleJsonResponse(response, "Error deleting team");
}
export async function addTeamMember(teamId, payload) {
  const response = await fetch(`${API_BASE_URL}/teams/${teamId}/members`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload || {})
  });
  return handleJsonResponse(response, "Error adding member");
}
export async function updateTeamMember(teamId, userId, payload) {
  const response = await fetch(`${API_BASE_URL}/teams/${teamId}/members/${userId}`, {
    method: "PATCH",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload || {})
  });
  return handleJsonResponse(response, "Error updating member");
}
export async function removeTeamMember(teamId, userId) {
  const response = await fetch(`${API_BASE_URL}/teams/${teamId}/members/${userId}`, {
    method: "DELETE",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    }
  });
  if (response.status === 204) return true;
  return handleJsonResponse(response, "Error removing member");
}
