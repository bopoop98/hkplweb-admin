// utils.js
// Shared utility functions and constants for the admin panel

// The base URL for your API. Update this to your production Cloud Run URL when deploying.
export const API_BASE_URL = '/api';

export const formSchemas = {
  player: [
    { name: 'imageUrl', label: 'Image', type: 'text' },
    { name: 'name', label: 'Name', type: 'text', required: true },
    { name: 'name_en', label: 'English Name', type: 'text' },
    { name: 'number', label: 'Number', type: 'number', required: true },
    { name: 'position', label: 'Position', type: 'select', required: true, options: [
      { value: 'GK', label: 'GK' },
      { value: 'DF', label: 'DF' },
      { value: 'MF', label: 'MF' },
      { value: 'FW', label: 'FW' }
    ] },
    { name: 'team_id', label: 'Team', type: 'select', required: true, optionsKey: 'teams' },
  ],
  team: [
    { name: 'LogoUrl', label: 'Logo', type: 'text' },
    { name: 'name', label: 'Name', type: 'text', required: true },
    { name: 'name_mm', label: 'MM Name', type: 'text' },
    { name: 'played', label: 'P', type: 'number' },
    { name: 'won', label: 'W', type: 'number' },
    { name: 'draw', label: 'D', type: 'number' },
    { name: 'lost', label: 'L', type: 'number' },
    { name: 'gf', label: 'GF', type: 'number' },
    { name: 'ga', label: 'GA', type: 'number' },
  ],
  match: [
    // The match modal is custom, so this is not used
  ],
  news: [
    { name: 'title', label: 'Title', type: 'text', required: true },
    { name: 'body', label: 'Body', type: 'textarea', required: true },
    { name: 'date', label: 'Date', type: 'datetime-local', required: true },
    { name: 'tags', label: 'Tags (comma separated)', type: 'text' },
    { name: 'imgUrl', label: 'Image URLs (comma separated)', type: 'text' },
    { name: 'author', label: 'Author', type: 'text', readonly: true, default: 'admin' },
    { name: 'news_id', label: 'News ID', type: 'text', readonly: true }
  ],
};

// Shared cache for all players (used by modals and main script)
export let allPlayersCache = [];
export function setAllPlayersCache(val) {
  allPlayersCache = val;
}

// Shared cache for teams (used by modals and main script)
export let teamsCache = [];

// Loading Animation Utility
export function showLoading(targetSelector = 'body') {
    const target = document.querySelector(targetSelector) || document.body;
    let loader = target.querySelector('.inline-loading-spinner');
    if (!loader) {
        loader = document.createElement('div');
        loader.className = 'inline-loading-spinner flex justify-center items-center py-8';
        loader.innerHTML = `
            <span class="relative flex h-12 w-12 items-center justify-center">
                <span class="absolute inline-flex h-12 w-12 rounded-full bg-blue-400 opacity-30 animate-ping"></span>
                <span class="relative inline-flex h-12 w-12 items-center justify-center">
                    <span class="block h-12 w-12 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></span>
                </span>
            </span>
        `;
        target.appendChild(loader);
    }
}
export function hideLoading(targetSelector = 'body') {
    const target = document.querySelector(targetSelector) || document.body;
    const loader = target.querySelector('.inline-loading-spinner');
    if (loader) loader.remove();
}

// Admin API Utility
export async function callAdminApi(endpoint, method = 'GET', data = null) {
    const user = firebase.auth().currentUser;
    if (!user) {
        throw new Error('No authenticated user found. Please log in.');
    }

    const idToken = await user.getIdToken();
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
    };

    const config = {
        method: method,
        headers: headers
    };

    if (data) {
        config.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(`${API_BASE_URL}/${endpoint}`, config);
        const responseData = await response.json();

        if (!response.ok) {
            const errorMessage = responseData.message || `HTTP error! status: ${response.status}`;
            const error = new Error(errorMessage);
            error.statusCode = response.status;
            throw error;
        }
        return responseData;
    } catch (error) {
        console.error(`API Call Error (${method} ${endpoint}):`, error);
        throw error;
    }
}

// Fetch teams with caching
export async function getTeams() {
    if (teamsCache.length === 0) {
        teamsCache = await callAdminApi('teams');
    }
    return teamsCache;
}

// Generates a placeholder image URL from UI Avatars
export function generatePlaceholderImageUrl(name) {
    if (!name) return `https://ui-avatars.com/api/?name=UK&background=random&color=fff&size=128`; // Fallback for empty name
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase();
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials || name)}&background=random&color=fff&size=128`;
}

// You can add more shared utilities here as needed.
