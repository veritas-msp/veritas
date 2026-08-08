const API_URL = process.env.REACT_APP_API_BASE_URL;
export async function fetchUserHistory() {
  try {
    const res = await fetch(`${API_URL}/api/history`, {
      credentials: 'include'
    });
    if (!res.ok) throw new Error("Error loading history");
    return await res.json();
  } catch (err) {
    console.error("❌ fetchUserHistory:", err);
    return [];
  }
}
export async function fetchAllHistory() {
  try {
    const res = await fetch(`${API_URL}/api/history/all`, {
      credentials: 'include'
    });
    if (res.status === 403) {
      const err = new Error('Forbidden');
      err.status = 403;
      throw err;
    }
    if (!res.ok) {
      const err = new Error("Error loading global history");
      err.status = res.status;
      throw err;
    }
    return await res.json();
  } catch (err) {
    console.error("❌ fetchAllHistory:", err);
    return [];
  }
}
function compressData(data) {
  try {
    if (data.appreciations) {
      const compressedAppreciations = {};
      Object.entries(data.appreciations).forEach(([type, appreciation]) => {
        const compressedAppreciation = {
          ...appreciation
        };
        if (compressedAppreciation.images && Array.isArray(compressedAppreciation.images)) {
          compressedAppreciation.images = compressedAppreciation.images.map(img => {
            if (typeof img === 'number') {
              return img;
            } else if (typeof img === 'string' && img.startsWith('data:image')) {
              return null;
            } else if (typeof img === 'string' && img.startsWith('/uploads/photos/')) {
              return img;
            }
            return img;
          });
        }
        compressedAppreciations[type] = compressedAppreciation;
      });
      return {
        ...data,
        appreciations: compressedAppreciations
      };
    }
    return data;
  } catch (error) {
    console.error("Error compressing data:", error);
    return data;
  }
}
export async function saveDocumentToHistory({
  name,
  type,
  data,
  overwrite,
  imageIds
}) {
  try {
    const compressedData = compressData(data);
    const payload = {
      name,
      type,
      data: compressedData
    };
    if (overwrite !== undefined) payload.overwrite = overwrite;
    if (imageIds && Array.isArray(imageIds)) payload.imageIds = imageIds;
    const res = await fetch(`${API_URL}/api/history`, {
      method: "POST",
      credentials: 'include',
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      if (res.status === 413) {
        throw new Error("The data is too large to save. Please reduce the content.");
      }
      throw new Error(`Server error: ${res.status} ${res.statusText}`);
    }
    const result = await res.json();
    return result;
  } catch (err) {
    console.error("❌ saveDocumentToHistory:", err);
    return {
      success: false,
      error: err.message || "Error saving",
      details: err.toString()
    };
  }
}
export async function deleteDocumentById(id) {
  try {
    const res = await fetch(`${API_URL}/api/history/${id}`, {
      method: "DELETE",
      credentials: 'include'
    });
    if (res.ok) {
      const result = await res.json();
      return {
        success: true,
        deletedImages: result.deletedImages || 0
      };
    }
    return {
      success: false
    };
  } catch (err) {
    console.error("❌ deleteDocumentById:", err);
    return {
      success: false
    };
  }
}
export async function deleteDocumentByName(name, preserveImageIds = []) {
  try {
    const res = await fetch(`${API_URL}/api/history/by-name/${encodeURIComponent(name)}`, {
      method: "DELETE",
      credentials: 'include',
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        preserveImageIds
      })
    });
    if (res.ok) {
      const result = await res.json();
      return {
        success: true,
        deletedImages: result.deletedImages || 0
      };
    }
    return {
      success: false
    };
  } catch (err) {
    console.error("❌ deleteDocumentByName:", err);
    return {
      success: false
    };
  }
}
export async function overwriteDocument(name, preserveImageIds = []) {
  try {
    const res = await fetch(`${API_URL}/api/history/overwrite/${encodeURIComponent(name)}`, {
      method: "DELETE",
      credentials: 'include',
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        preserveImageIds
      })
    });
    if (res.ok) {
      const result = await res.json();
      return {
        success: true,
        deletedImages: result.deletedImages || 0,
        preservedImages: result.preservedImages || 0,
        totalImages: result.totalImages || 0
      };
    }
    return {
      success: false
    };
  } catch (err) {
    console.error("❌ overwriteDocument:", err);
    return {
      success: false
    };
  }
}
export async function updateDocumentName(id, newName) {
  try {
    const res = await fetch(`${API_URL}/api/history/${id}`, {
      method: "PATCH",
      credentials: 'include',
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: newName
      })
    });
    return res.ok;
  } catch (err) {
    console.error("❌ updateDocumentName:", err);
    return false;
  }
}
export async function moveDocumentToTrash(id) {
  try {
    const res = await fetch(`${API_URL}/api/history/${id}/trash`, {
      method: "POST",
      credentials: 'include'
    });
    return res.ok;
  } catch (err) {
    console.error("❌ moveDocumentToTrash:", err);
    return false;
  }
}
export async function restoreDocumentById(id) {
  try {
    const res = await fetch(`${API_URL}/api/history/${id}/restore`, {
      method: "POST",
      credentials: 'include'
    });
    return res.ok;
  } catch (err) {
    console.error("❌ restoreDocumentById:", err);
    return false;
  }
}
export async function purgeDocumentById(id) {
  try {
    const res = await fetch(`${API_URL}/api/history/${id}/purge`, {
      method: "DELETE",
      credentials: 'include'
    });
    return res.ok;
  } catch (err) {
    console.error("❌ purgeDocumentById:", err);
    return false;
  }
}
export async function fetchLastUserDocuments(limit = 3) {
  try {
    const res = await fetch(`${API_URL}/api/recent-docs?limit=${limit}`, {
      credentials: 'include'
    });
    if (!res.ok) throw new Error("Error loading recent documents");
    return await res.json();
  } catch (err) {
    console.error("❌ fetchLastUserDocuments:", err);
    return [];
  }
}
export async function fetchDocumentsByClient(clientName) {
  return [];
}
