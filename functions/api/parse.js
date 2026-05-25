export async function onRequest(context) {
    const url = new URL(context.request.url);
    const targetPoeUrl = url.searchParams.get('url');

    // Extract the league and character name from the URL to hit the API
    // Format: /poe2/profile/[account]/[league]/character/[name]
    const parts = targetPoeUrl.split('/');
    const league = parts[parts.indexOf('profile') + 2];
    const characterName = parts[parts.length - 1];

    const apiUrl = `https://poe.ninja/api/data/character?league=${league}&name=${characterName}`;

    try {
        const response = await fetch(apiUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        const data = await response.json();

        return new Response(JSON.stringify(data), {
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*' 
            }
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: 'API Fetch failed' }), { status: 500 });
    }
}
