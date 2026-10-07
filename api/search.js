// api/search.js - Vercel Serverless Function (Node.js 18+)
// Busca noticias en Google News Venezuela en tiempo real

function parseGoogleRss(xmlText) {
  const items = [];
  const itemMatches = xmlText.match(/<item[\s\S]*?<\/item>/gi) || [];
  
  for (const itemXml of itemMatches.slice(0, 20)) {
    const titleMatch = itemXml.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
    const linkMatch = itemXml.match(/<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i);
    const descMatch = itemXml.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i);
    const pubDateMatch = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);
    const sourceMatch = itemXml.match(/<source[^>]*>([\s\S]*?)<\/source>/i);

    const title = titleMatch ? titleMatch[1].trim().replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"') : '';
    const link = linkMatch ? linkMatch[1].trim() : '';
    let desc = descMatch ? descMatch[1].replace(/<[^>]+>/g, '').trim() : '';
    desc = desc.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
    const sourceName = sourceMatch ? sourceMatch[1].trim() : 'Google News VE';

    let publishedAt = new Date().toISOString();
    if (pubDateMatch) {
      const parsedD = new Date(pubDateMatch[1]);
      if (!isNaN(parsedD.getTime())) publishedAt = parsedD.toISOString();
    }

    if (title && link) {
      items.push({
        id: 'web-' + Math.random().toString(36).substr(2, 9),
        title,
        snippet: desc.slice(0, 240) + (desc.length > 240 ? '...' : ''),
        sourceName,
        sourceUrl: link,
        region: deducirRegion(title + ' ' + desc),
        category: deducirCategoria(title + ' ' + desc),
        origin: 'web',
        publishedAt
      });
    }
  }
  return items;
}

function deducirRegion(text) {
  const t = text.toLowerCase();
  if (t.includes('zulia') || t.includes('maracaibo')) return 'Zulia';
  if (t.includes('caracas') || t.includes('chacao') || t.includes('distrito capital')) return 'Distrito Capital';
  if (t.includes('carabobo') || t.includes('valencia')) return 'Carabobo';
  if (t.includes('lara') || t.includes('barquisimeto')) return 'Lara';
  if (t.includes('bolívar') || t.includes('bolivar') || t.includes('guayana') || t.includes('caroní')) return 'Bolívar';
  if (t.includes('aragua') || t.includes('maracay')) return 'Aragua';
  if (t.includes('anzoátegui') || t.includes('anzoategui') || t.includes('puerto la cruz')) return 'Anzoátegui';
  if (t.includes('táchira') || t.includes('tachira') || t.includes('san cristóbal')) return 'Táchira';
  if (t.includes('mérida') || t.includes('merida')) return 'Mérida';
  if (t.includes('miranda') || t.includes('guarenas') || t.includes('petare')) return 'Miranda';
  if (t.includes('falcón') || t.includes('falcon') || t.includes('coro')) return 'Falcón';
  return 'Nacional';
}

function deducirCategoria(text) {
  const t = text.toLowerCase();
  if (t.includes('dólar') || t.includes('dolar') || t.includes('bcv') || t.includes('inflación') || t.includes('petróleo') || t.includes('economía')) return 'Economía';
  if (t.includes('elecciones') || t.includes('oposición') || t.includes('gobierno') || t.includes('asamblea') || t.includes('política')) return 'Política';
  if (t.includes('presos') || t.includes('ddhh') || t.includes('derechos humanos') || t.includes('ong') || t.includes('detención')) return 'Derechos Humanos';
  if (t.includes('luz') || t.includes('agua') || t.includes('corpoelec') || t.includes('apagón') || t.includes('gas') || t.includes('servicio')) return 'Servicios Públicos';
  if (t.includes('hospital') || t.includes('médico') || t.includes('salud') || t.includes('escuela') || t.includes('docente') || t.includes('maestro')) return 'Salud y Educación';
  if (t.includes('accidente') || t.includes('detenido') || t.includes('policía') || t.includes('suceso')) return 'Sucesos';
  return 'General';
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const query = (req.query.q || 'Venezuela').trim();
  const searchUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query + ' when:7d')}&hl=es-419&gl=VE&ceid=VE:es-419`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(searchUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MediaVenezuelaSearchBot/1.0)' },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return res.status(502).json({ status: 'error', message: 'Fallo al consultar Google News', items: [] });
    }

    const xml = await response.text();
    const items = parseGoogleRss(xml);

    return res.status(200).json({
      status: 'ok',
      query,
      count: items.length,
      items
    });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message, items: [] });
  }
}
