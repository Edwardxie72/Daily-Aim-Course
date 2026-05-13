// Replace these with your Supabase project details
// URL: https://your-project.supabase.co
// Key: your-public-anon-key

const SUPABASE_URL = 'https://bvsqmyevdiluuqndxpli.supabase.co'; 
const SUPABASE_KEY = 'sb_publishable_kw8MVCZFdNAVWzPFpKUKtQ_iQIVaZJg';

export async function fetchLeaderboard() {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
        // Fallback to local storage for demo if no DB configured
        const local = JSON.parse(localStorage.getItem('aim_leaderboard') || '[]');
        return local.slice(0, 10);
    }

    try {
        // Fetch Top 50 to allow for preview rows just outside the Top 10
        const response = await fetch(`${SUPABASE_URL}/rest/v1/leaderboard?select=*&order=time.asc&limit=50`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        return await response.json();
    } catch (e) {
        console.error("Failed to fetch leaderboard", e);
        return [];
    }
}

export async function submitTime(name, time) {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
        // Fallback to local storage
        const local = JSON.parse(localStorage.getItem('aim_leaderboard') || '[]');
        local.push({ name, time, created_at: new Date().toISOString() });
        local.sort((a, b) => a.time - b.time);
        localStorage.setItem('aim_leaderboard', JSON.stringify(local));
        return true;
    }

    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/leaderboard`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify({ name: name.toUpperCase(), time: parseFloat(time) })
        });
        return response.ok;
    } catch (e) {
        console.error("Failed to submit time", e);
        return false;
    }
}

export function getRank(data, time) {
    // Returns 1-indexed rank based on the provided data array
    let rank = 1;
    for (const entry of data) {
        if (time < entry.time) break;
        rank++;
    }
    return rank;
}

export async function getGlobalRank(time) {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
        const local = JSON.parse(localStorage.getItem('aim_leaderboard') || '[]');
        return getRank(local, time);
    }

    try {
        // Efficiently get the count of entries with a better time
        const response = await fetch(`${SUPABASE_URL}/rest/v1/leaderboard?time=lt.${time}&select=count`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Range': '0-0', // We don't want the actual data
                'Prefer': 'count=exact'
            }
        });
        const contentRange = response.headers.get('content-range');
        if (contentRange) {
            const total = parseInt(contentRange.split('/')[1]);
            return total + 1;
        }
        return 1;
    } catch (e) {
        console.error("Rank fetch failed", e);
        return 1;
    }
}

export function updateLeaderboardUI(data, currentTime = null, forcedRank = null) {
    const list = document.getElementById('leaderboard-list');
    if (!list) return;
    list.innerHTML = '';

    // Create a combined list for rendering if there's a current time preview
    let displayData = [...data];
    let previewRank = forcedRank || (currentTime !== null ? getRank(data, currentTime) : -1);

    if (currentTime !== null) {
        // If the rank is within our fetched data (Top 50), insert it at the right spot
        if (previewRank <= displayData.length + 1 && previewRank <= 50) {
            displayData.splice(previewRank - 1, 0, { name: 'YOU', time: currentTime, isPreview: true });
        } else {
            // If it's way outside, we'll append it specially at the end of the limited view
            displayData.push({ name: 'YOU', time: currentTime, isPreview: true, forceRank: previewRank });
        }
    }

    if (displayData.length === 0) {
        list.innerHTML = '<div style="color: #666; font-size: 0.8rem;">No scores yet. Be the first!</div>';
        return;
    }

    // Limit to 10 entries normally, but if preview is lower, show it anyway
    const maxShow = previewRank > 10 ? previewRank : 10;

    displayData.slice(0, maxShow).forEach((entry, i) => {
        const rank = entry.forceRank || (i + 1);
        const row = document.createElement('div');
        row.className = 'leader-row';
        
        if (entry.isPreview) row.classList.add('preview-row');
        if (rank === 1) row.classList.add('gold');
        else if (rank === 2) row.classList.add('silver');
        else if (rank === 3) row.classList.add('bronze');

        row.innerHTML = `
            <span class="rank">${rank}.</span>
            <span class="name">${entry.name}</span>
            <span class="time">${entry.time.toFixed(2)}s</span>
        `;
        list.appendChild(row);
    });
}
