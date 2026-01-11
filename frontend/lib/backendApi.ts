/**
 * Backend API utility functions
 * Centralized configuration and helpers for backend API calls
 */

const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000';

/**
 * Get access token from the server-side API route
 */
async function getAccessToken(): Promise<string | null> {
  try {
    const response = await fetch('/api/token');
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    return data.accessToken;
  } catch (error) {
    console.error('Failed to get access token:', error);
    return null;
  }
}

/**
 * Create headers with optional auth token
 */
async function createHeaders(includeAuth: boolean = true): Promise<HeadersInit> {
  const headers: HeadersInit = {};

  if (includeAuth) {
    const token = await getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  return headers;
}

/**
 * Check if backend is available by calling root endpoint
 */
export async function checkBackendConnection(): Promise<boolean> {
  try {
    const response = await fetch(`${BACKEND_BASE_URL}/`, {
      method: 'GET',
    });
    return response.ok;
  } catch (error) {
    console.error('Backend connection check failed:', error);
    return false;
  }
}

/**
 * Analyze product image
 * @param imageBlob - The image blob to analyze
 */
export async function analyzeProduct(imageBlob: Blob): Promise<any> {
  const formData = new FormData();
  formData.append('image', imageBlob, 'scan.jpg');

  const headers = await createHeaders();

  const response = await fetch(`${BACKEND_BASE_URL}/api/analyze`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

/**
 * Get recommended alternatives for a product
 */
export async function getRecommendations(productName: string, overallScore: number): Promise<any> {
  const encodedProductName = encodeURIComponent(productName);
  const headers = await createHeaders();

  const response = await fetch(
    `${BACKEND_BASE_URL}/api/reccomendations/${encodedProductName}/${overallScore}`,
    {
      method: 'GET',
      headers,
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

/**
 * Update user preferences
 * @param userId - User ID to update preferences for
 * @param preferences - Preferences object with allergies, dietGoals, avoidIngredients
 */
export async function updateUserPreferences(userId: string, preferences: any): Promise<any> {
  const headers = await createHeaders();

  const response = await fetch(`${BACKEND_BASE_URL}/api/users/${encodeURIComponent(userId)}/preferences`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(preferences),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

/**
 * Get user by ID
 */
export async function getUser(userId: string): Promise<any> {
  const headers = await createHeaders();

  const response = await fetch(`${BACKEND_BASE_URL}/api/users/${encodeURIComponent(userId)}`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    if (response.status === 404) {
      return null; // User not found
    }
    const errorText = await response.text();
    throw new Error(`API Error: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

/**
 * Create or update user
 */
export async function createOrUpdateUser(userData: any): Promise<any> {
  const headers = await createHeaders();

  const response = await fetch(`${BACKEND_BASE_URL}/api/users`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

/**
 * Get user scans
 */
export async function getUserScans(userId: string, limit?: number): Promise<any> {
  const headers = await createHeaders();
  const url = new URL(`${BACKEND_BASE_URL}/api/users/${encodeURIComponent(userId)}/scans`);
  if (limit) {
    url.searchParams.append('limit', limit.toString());
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

/**
 * Add a scan for a user
 */
export async function addUserScan(userId: string, scanData: any): Promise<any> {
  const headers = await createHeaders();

  const response = await fetch(`${BACKEND_BASE_URL}/api/users/${encodeURIComponent(userId)}/scans`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(scanData),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

/**
 * Get user statistics
 */
export async function getUserStats(userId: string): Promise<any> {
  const headers = await createHeaders();

  const response = await fetch(`${BACKEND_BASE_URL}/api/users/${encodeURIComponent(userId)}/stats`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    if (response.status === 404) {
      return null; // User not found
    }
    const errorText = await response.text();
    throw new Error(`API Error: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

// ============== Favorites API ==============

/**
 * Get user favorites
 */
export async function getUserFavorites(userId: string): Promise<any> {
  const headers = await createHeaders();

  const response = await fetch(`${BACKEND_BASE_URL}/api/users/${encodeURIComponent(userId)}/favorites`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

/**
 * Add product to favorites
 */
export async function addToFavorites(userId: string, productData: {
  productName: string;
  brand?: string;
  safetyScore?: number;
  image?: string;
}): Promise<any> {
  const headers = await createHeaders();

  const response = await fetch(`${BACKEND_BASE_URL}/api/users/${encodeURIComponent(userId)}/favorites`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(productData),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

/**
 * Remove product from favorites
 */
export async function removeFromFavorites(userId: string, favoriteId: number): Promise<any> {
  const headers = await createHeaders();

  const response = await fetch(`${BACKEND_BASE_URL}/api/users/${encodeURIComponent(userId)}/favorites/${favoriteId}`, {
    method: 'DELETE',
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

/**
 * Check if product is favorited
 */
export async function checkFavorite(userId: string, productName: string): Promise<boolean> {
  const headers = await createHeaders();

  const response = await fetch(
    `${BACKEND_BASE_URL}/api/users/${encodeURIComponent(userId)}/favorites/check/${encodeURIComponent(productName)}`,
    {
      method: 'GET',
      headers,
    }
  );

  if (!response.ok) {
    return false;
  }

  const data = await response.json();
  return data.isFavorite;
}

// ============== Dietary Templates API ==============

/**
 * Get all dietary templates
 */
export async function getDietaryTemplates(): Promise<any> {
  const response = await fetch(`${BACKEND_BASE_URL}/api/dietary-templates`, {
    method: 'GET',
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

/**
 * Apply a dietary template to user preferences
 */
export async function applyDietaryTemplate(userId: string, templateKey: string): Promise<any> {
  const headers = await createHeaders();

  const response = await fetch(
    `${BACKEND_BASE_URL}/api/users/${encodeURIComponent(userId)}/apply-template/${encodeURIComponent(templateKey)}`,
    {
      method: 'POST',
      headers,
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error: ${response.status} - ${errorText}`);
  }

  return await response.json();
}
