export async function onRequest(context) {
    const url = new URL(context.request.url);
    const targetApiUrl = url.searchParams.get('url');

    try {
        const response = await fetch(targetApiUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                'Accept': 'application/json'
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
        return new Response(JSON.stringify({ error: 'Proxy failed' }), { status: 500 });
    }
}
