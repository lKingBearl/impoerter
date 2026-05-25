export async function onRequest(context) {
    const url = new URL(context.request.url);
    const poeUrl = url.searchParams.get('url');

    // Extract identifiers from the URL
    // Expected: /poe2/profile/[account]/[league]/character/[charName]
    const parts = poeUrl.split('/');
    const accountName = parts[parts.indexOf('profile') + 1];
    const league = parts[parts.indexOf('profile') + 2];
    const charName = parts[parts.length - 1];

    // This is the direct API endpoint for PoE2 character stats
    const apiUrl = `https://poe.ninja/api/data/character?league=${league}&name=${charName}&account=${accountName}`;

    try {
        const response = await fetch(apiUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': poeUrl
            }
        });
        
        const data = await response.json();
        return new Response(JSON.stringify(data), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: 'Failed' }), { status: 500 });
    }
}
