import API_BASE_URL from "../config";
const BASE_URL = `${API_BASE_URL}/clients`;
export async function getClientCampaigns(clientId, filters = {}, options = {}) {
  try {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.type) params.append('type', filters.type);
    const response = await fetch(`${BASE_URL}/${clientId}/campaigns?${params}`, {
      method: 'GET',
      credentials: 'include',
      signal: options.signal,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    console.error('Error fetching campaigns:', error);
    return [];
  }
}
export async function getAllCampaigns(filters = {}, options = {}) {
  try {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.type) params.append('type', filters.type);
    if (filters.client_id) params.append('client_id', filters.client_id);
    const response = await fetch(`${BASE_URL}/all-campaigns?${params}`, {
      method: 'GET',
      credentials: 'include',
      signal: options.signal,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    console.error('Error fetching campaigns:', error);
    return [];
  }
}
export async function createClientCampaign(clientId, campaignData) {
  try {
    const response = await fetch(`${BASE_URL}/${clientId}/campaigns`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(campaignData)
    });
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error creating campaign:', error);
    throw error;
  }
}
export async function updateClientCampaign(clientId, campaignId, campaignData) {
  try {
    const response = await fetch(`${BASE_URL}/${clientId}/campaigns/${campaignId}`, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(campaignData)
    });
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error updating campaign:', error);
    throw error;
  }
}
export async function deleteCampaign(campaignId) {
  try {
    const response = await fetch(`${BASE_URL}/campaigns/${campaignId}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error deleting campaign:', error);
    throw error;
  }
}
export async function deleteClientCampaign(clientId, campaignId) {
  try {
    const response = await fetch(`${BASE_URL}/${clientId}/campaigns/${campaignId}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error deleting campaign:', error);
    throw error;
  }
}
export async function launchCampaign(clientId, campaignId) {
  try {
    const response = await fetch(`${BASE_URL}/${clientId}/campaigns/${campaignId}/launch`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: response.statusText
      }));
      throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error launching campaign:', error);
    throw error;
  }
}
export async function pauseCampaign(clientId, campaignId) {
  try {
    const response = await fetch(`${BASE_URL}/${clientId}/campaigns/${campaignId}/pause`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: response.statusText
      }));
      throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error pausing:', error);
    throw error;
  }
}
export async function resumeCampaign(clientId, campaignId) {
  try {
    const response = await fetch(`${BASE_URL}/${clientId}/campaigns/${campaignId}/resume`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: response.statusText
      }));
      throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error resuming:', error);
    throw error;
  }
}
export async function finishCampaign(clientId, campaignId) {
  try {
    const response = await fetch(`${BASE_URL}/${clientId}/campaigns/${campaignId}/finish`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: response.statusText
      }));
      throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error ending campaign:', error);
    throw error;
  }
}
export async function resetCampaign(clientId, campaignId) {
  try {
    const response = await fetch(`${BASE_URL}/${clientId}/campaigns/${campaignId}/reset`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: response.statusText
      }));
      throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error resetting campaign:', error);
    throw error;
  }
}
export async function getCampaignStats(clientId, campaignId, options = {}) {
  try {
    const response = await fetch(`${BASE_URL}/${clientId}/campaigns/${campaignId}/stats?includeCurrent=true`, {
      method: 'GET',
      credentials: 'include',
      signal: options.signal,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    console.error('Error fetching statistics:', error);
    throw error;
  }
}
export function getCampaignReportUrl(clientId, campaignId) {
  return `${BASE_URL}/${clientId}/campaigns/${campaignId}/report.pdf`;
}
export async function downloadCampaignReport(clientId, campaignId, fileName) {
  const response = await fetch(getCampaignReportUrl(clientId, campaignId), {
    method: 'GET',
    credentials: 'include'
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      error: response.statusText
    }));
    throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName || `rapport_campagne_${campaignId}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return true;
}
export async function publishCampaignReport(clientId, campaignId, {
  visibleToClient = false,
  description = ''
} = {}) {
  const response = await fetch(`${BASE_URL}/${clientId}/campaigns/${campaignId}/publish-report`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      visibleToClient: Boolean(visibleToClient),
      description
    })
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      error: response.statusText
    }));
    throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
  }
  return response.json();
}
export async function getCampaignSteps(clientId, campaignId) {
  try {
    const response = await fetch(`${BASE_URL}/${clientId}/campaigns/${campaignId}/steps`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching steps:', error);
    throw error;
  }
}
export async function createCampaignStep(clientId, campaignId, stepData) {
  try {
    const response = await fetch(`${BASE_URL}/${clientId}/campaigns/${campaignId}/steps`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(stepData)
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: response.statusText
      }));
      throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error creating step:', error);
    throw error;
  }
}
export async function updateCampaignStep(clientId, campaignId, stepId, stepData) {
  try {
    const response = await fetch(`${BASE_URL}/${clientId}/campaigns/${campaignId}/steps/${stepId}`, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(stepData)
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: response.statusText
      }));
      throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error updating step:', error);
    throw error;
  }
}
export async function reorderCampaignSteps(clientId, campaignId, stepOrders) {
  try {
    const response = await fetch(`${BASE_URL}/${clientId}/campaigns/${campaignId}/steps/reorder`, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        stepOrders
      })
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: response.statusText
      }));
      throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error reordering steps:', error);
    throw error;
  }
}
export async function deleteCampaignStep(clientId, campaignId, stepId) {
  try {
    const response = await fetch(`${BASE_URL}/${clientId}/campaigns/${campaignId}/steps/${stepId}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: response.statusText
      }));
      throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error deleting step:', error);
    throw error;
  }
}
