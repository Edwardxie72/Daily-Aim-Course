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
        const response = await fetch(`${SUPABASE_URL}/rest/v1/leaderboard?select=*&order=time.asc&limit=10`, {
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

export function updateLeaderboardUI(data) {
    const list = document.getElementById('leaderboard-list');
    if (!list) return;
    list.innerHTML = '';

    if (data.length === 0) {
        list.innerHTML = '<div style="color: #666; font-size: 0.8rem;">No scores yet. Be the first!</div>';
        return;
    }

    data.forEach((entry, i) => {
        const row = document.createElement('div');
        row.className = 'leader-row';
        row.innerHTML = `
            <span class="rank">${i + 1}.</span>
            <span class="name">${entry.name}</span>
            <span class="time">${entry.time.toFixed(2)}s</span>
        `;
        list.appendChild(row);
    });
}
