// api/news.js - Vercel Serverless Function (Node.js 18+)
// Sincroniza noticias de medios venezolanos y Google News sin dependencias externas

function parseRss(xmlText, sourceName, defaultRegion = 'Nacional') {
  const items = [];
  const itemMatches = xmlText.match(/<item[\s\S]*?<\/item>/gi) || [];
  
  for (const itemXml of itemMatches.slice(0, 10)) {
    const titleMatch = itemXml.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
    const linkMatch = itemXml.match(/<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i);
    const descMatch = itemXml.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i);
    const pubDateMatch = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);

    const title = titleMatch ? titleMatch[1].trim().replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"') : '';
    const link = linkMatch ? linkMatch[1].trim() : '';
    let desc = descMatch ? descMatch[1].replace(/<[^>]+>/g, '').trim() : '';
    desc = desc.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
    
    let publishedAt = new Date().toISOString();
    if (pubDateMatch) {
      const parsedD = new Date(pubDateMatch[1]);
      if (!isNaN(parsedD.getTime())) publishedAt = parsedD.toISOString();
    }

    if (title && link) {
      items.push({
        id: 'rss-' + Math.random().toString(36).substr(2, 9),
        title,
        snippet: desc.slice(0, 220) + (desc.length > 220 ? '...' : ''),
        sourceName,
        sourceUrl: link,
        region: deducirRegion(title + ' ' + desc, defaultRegion),
        category: deducirCategoria(title + ' ' + desc),
        origin: 'rss',
        publishedAt
      });
    }
  }
  return items;
}

function deducirRegion(text, fallback = 'Nacional') {
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
  if (t.includes('falcón') || t.includes('falcon') || t.includes('coro') || t.includes('punto fijo')) return 'Falcón';
  return fallback;
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
  res.setHeader('Cache-Control', 's-maxage=180, stale-while-revalidate=360');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const sources = [
    { name: 'Google News VE', url: 'https://news.google.com/rss?hl=es-419&gl=VE&ceid=VE:es-419', region: 'Nacional' },
    { name: 'TalCual', url: 'https://talcualdigital.com/feed/', region: 'Nacional' },
    { name: 'Runrunes', url: 'https://runrun.es/feed/', region: 'Nacional' },
    { name: 'El Carabobeño', url: 'https://www.el-carabobeno.com/feed/', region: 'Carabobo' },
    { name: 'La Prensa de Lara', url: 'https://laprensalara.com.ve/feed/', region: 'Lara' },
    { name: 'Descifrado', url: 'https://www.descifrado.com/feed/', region: 'Nacional' },
    { name: 'Noticia al Día', url: 'https://noticiaaldia.com/feed/', region: 'Zulia' }
  ];

  const fetchPromises = sources.map(async src => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const resp = await fetch(src.url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MediaVenezuelaBot/1.0)' },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!resp.ok) return [];
      const xml = await resp.text();
      return parseRss(xml, src.name, src.region);
    } catch (e) {
      return [];
    }
  });

  try {
    const results = await Promise.allSettled(fetchPromises);
    let allItems = [];
    results.forEach(r => {
      if (r.status === 'fulfilled' && Array.isArray(r.value)) {
        allItems.push(...r.value);
      }
    });

    // Ordenar cronológicamente (más recientes primero)
    allItems.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

    // Desduplicar por título y URL
    const seen = new Set();
    const uniqueItems = allItems.filter(item => {
      const key = item.title.toLowerCase().slice(0, 40);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return res.status(200).json({
      status: 'ok',
      count: uniqueItems.length,
      items: uniqueItems.slice(0, 60),
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message, items: [] });
  }
}
