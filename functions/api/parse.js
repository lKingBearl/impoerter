export async function onRequest(context) {
    const url = new URL(context.request.url);
    const targetPoeUrl = url.searchParams.get('url');

    try {
        const response = await fetch(targetPoeUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html'
            }
        });
        
        const html = await response.text();

        return new Response(html, {
            headers: { 
                'Content-Type': 'text/html',
                'Access-Control-Allow-Origin': '*' 
            }
        });
    } catch (err) {
        return new Response('Proxy Error', { status: 500 });
    }
}
