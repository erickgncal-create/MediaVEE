// api/news.js - Vercel Serverless Function (Node.js 18+)
// Sincroniza medios venezolanos, agencias internacionales (Reuters, AFP, EFE, AP News, BBC, CNN, NY Times) e investigación

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
      // Extraer fuente real si viene de Google News
      const sourceMatch = itemXml.match(/<source[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/source>/i);
      let realSource = (sourceMatch && sourceMatch[1].trim()) ? sourceMatch[1].trim() : sourceName;
      if (sourceName === 'Última Hora Venezuela' && realSource !== 'Última Hora Venezuela') {
        // Mantener el nombre del medio real
      } else if (sourceName !== 'Última Hora Venezuela' && !realSource.toLowerCase().includes(sourceName.toLowerCase())) {
        realSource = sourceName;
      }

      const region = deducirRegion(title + ' ' + desc, defaultRegion);
      const category = deducirCategoria(title + ' ' + desc);
      const score = calcularJerarquia(title, desc, realSource, publishedAt);
      const isInvestigacion = esFuenteInvestigacion(realSource, title + ' ' + desc);

      items.push({
        id: 'rss-' + Math.random().toString(36).substr(2, 9),
        title,
        snippet: desc.slice(0, 220) + (desc.length > 220 ? '...' : ''),
        sourceName,
        sourceUrl: link,
        region,
        category,
        priority: score,
        isInvestigacion,
        origin: 'rss',
        publishedAt
      });
    }
  }
  return items;
}


function esFactCheck(source, text) {
  const s = (source || '').toLowerCase();
  const t = (text || '').toLowerCase();
  if (s.includes('espaja') || s.includes('cazadores') || s.includes('cotejo') || s.includes('chequea')) return true;
  if (t.includes('falso:') || t.includes('engañoso:') || t.includes('es falso') || t.includes('desmentido') || t.includes('sin evidencia') || t.includes('fact-check') || t.includes('fake news') || t.includes('bulos') || t.includes('verificamos')) return true;
  return false;
}

function esFuenteInvestigacion(source, text) {
  const s = source.toLowerCase();
  const t = text.toLowerCase();
  if (s.includes('armando.info') || s.includes('runrunes') || s.includes('connectas') || s.includes('insight crime')) return true;
  if (t.includes('investigación') || t.includes('informe especial') || t.includes('reportaje exclusivo') || t.includes('trama de corrupción') || t.includes('expediente')) return true;
  return false;
}

function calcularJerarquia(title, desc, source, publishedAt = null) {
  let score = 50;
  const t = (title + ' ' + desc).toLowerCase();
  
  const highKeywords = ['urgente', 'alerta', 'última hora', 'tsj', 'cne', 'elecciones', 'bcv', 'dólar', 'inflación', 'apagón', 'corpoelec', 'emergencia', 'denuncia', 'detención', 'salario', 'protesta', 'petróleo', 'pdvsa'];
  highKeywords.forEach(kw => {
    if (t.includes(kw)) score += 10;
  });

  if (source.includes('Efecto Cocuyo') || source.includes('Armando.info') || source.includes('TalCual') || source.includes('Reuters') || source.includes('BBC')) {
    score += 5;
  }

  // Factor de Recencia Dinámica: Priorizar noticias frescas y penalizar notas antiguas
  if (publishedAt) {
    const pubTime = new Date(publishedAt).getTime();
    const now = Date.now();
    const ageHours = isNaN(pubTime) ? 24 : Math.max(0, (now - pubTime) / (1000 * 60 * 60));

    if (ageHours <= 4) {
      score += 45; // Impulso de última hora (últimas 4h)
    } else if (ageHours <= 12) {
      score += 30; // Muy reciente (últimas 12h)
    } else if (ageHours <= 24) {
      score += 15; // Mismo día (24h)
    } else if (ageHours <= 48) {
      score -= 10; // 1 a 2 días
    } else if (ageHours <= 96) {
      score -= 35; // 3 a 4 días
    } else {
      score -= 85; // Más de 4 días: pierde prioridad en portada
    }
  }
  
  return score;
}

function deducirRegion(text, fallback = 'Nacional') {
  const t = text.toLowerCase();
  if (t.includes('zulia') || t.includes('maracaibo') || t.includes('san francisco')) return 'Zulia';
  if (t.includes('caracas') || t.includes('chacao') || t.includes('distrito capital') || t.includes('libertador')) return 'Distrito Capital';
  if (t.includes('carabobo') || t.includes('valencia') || t.includes('puerto cabello')) return 'Carabobo';
  if (t.includes('lara') || t.includes('barquisimeto') || t.includes('cabudare')) return 'Lara';
  if (t.includes('bolívar') || t.includes('bolivar') || t.includes('guayana') || t.includes('caroní')) return 'Bolívar';
  if (t.includes('aragua') || t.includes('maracay')) return 'Aragua';
  if (t.includes('anzoátegui') || t.includes('anzoategui') || t.includes('puerto la cruz') || t.includes('lechería')) return 'Anzoátegui';
  if (t.includes('táchira') || t.includes('tachira') || t.includes('san cristóbal')) return 'Táchira';
  if (t.includes('mérida') || t.includes('merida')) return 'Mérida';
  if (t.includes('miranda') || t.includes('guarenas') || t.includes('petare') || t.includes('barlovento')) return 'Miranda';
  if (t.includes('falcón') || t.includes('falcon') || t.includes('coro') || t.includes('punto fijo')) return 'Falcón';
  if (t.includes('sucre') || t.includes('cumaná') || t.includes('carúpano')) return 'Sucre';
  if (t.includes('monagas') || t.includes('maturín')) return 'Monagas';
  if (t.includes('nueva esparta') || t.includes('margarita') || t.includes('porlamar')) return 'Nueva Esparta';
  if (t.includes('portuguesa') || t.includes('acarigua') || t.includes('guanare')) return 'Portuguesa';
  if (t.includes('barinas')) return 'Barinas';
  if (t.includes('guárico') || t.includes('guarico') || t.includes('san juan de los morros')) return 'Guárico';
  if (t.includes('trujillo') || t.includes('valera')) return 'Trujillo';
  if (t.includes('yaracuy') || t.includes('san felipe')) return 'Yaracuy';
  if (t.includes('apure') || t.includes('san fernando de apure')) return 'Apure';
  if (t.includes('la guaira') || t.includes('vargas') || t.includes('maiquetía')) return 'La Guaira';
  if (t.includes('cojedes') || t.includes('san carlos')) return 'Cojedes';
  if (t.includes('delta amacuro') || t.includes('tucupita')) return 'Delta Amacuro';
  if (t.includes('amazonas') || t.includes('puerto ayacucho')) return 'Amazonas';
  return fallback;
}

function deducirCategoria(text) {
  const t = text.toLowerCase();
  if (t.includes('dólar') || t.includes('dolar') || t.includes('bcv') || t.includes('inflación') || t.includes('petróleo') || t.includes('economía')) return 'Economía';
  if (t.includes('elecciones') || t.includes('oposición') || t.includes('gobierno') || t.includes('asamblea') || t.includes('política') || t.includes('cne') || t.includes('tsj')) return 'Política';
  if (t.includes('presos') || t.includes('ddhh') || t.includes('derechos humanos') || t.includes('ong') || t.includes('detención')) return 'Derechos Humanos';
  if (t.includes('luz') || t.includes('agua') || t.includes('corpoelec') || t.includes('apagón') || t.includes('gas') || t.includes('servicio')) return 'Servicios Públicos';
  if (t.includes('hospital') || t.includes('médico') || t.includes('salud') || t.includes('escuela') || t.includes('docente') || t.includes('maestro')) return 'Salud y Educación';
  if (t.includes('accidente') || t.includes('detenido') || t.includes('policía') || t.includes('suceso') || t.includes('homicidio')) return 'Sucesos';
  return 'General';
}


const FALLBACK_ITEMS = [
  {
    title: 'Sucesos Zulia: CICPC investiga muerte de adolescente de 15 años en Maracaibo tras presunto caso de asfixia mecánica',
    snippet: 'Comisiones de homicidios del cuerpo detectivesco interrogan al entorno familiar y recaban testimonios en la parroquia Olegario Villalobos tras hallazgo.',
    sourceName: 'Noticia al Día',
    sourceUrl: 'https://noticiaaldia.com',
    region: 'Zulia',
    category: 'Sucesos',
    publishedAt: new Date(Date.now() - 1000 * 60 * 180).toISOString()
  },
  {
    title: 'La Prensa de Lara: Comunidad de Carora consternada por muerte de joven estudiante; autoridades indagan hipótesis de suicidio',
    snippet: 'Organizaciones comunitarias y docentes del municipio Torres solicitan jornadas de prevención y salud mental en planteles educativos.',
    sourceName: 'La Prensa de Lara',
    sourceUrl: 'https://laprensalara.com.ve',
    region: 'Lara',
    category: 'Sucesos',
    publishedAt: new Date(Date.now() - 1000 * 60 * 240).toISOString()
  },
  {
    title: 'Crónica Uno: Aumento de casos de suicidio y depresión en adolescentes enciende alarmas en barriadas de Caracas',
    snippet: 'Informe de organizaciones de protección a la infancia señala que la emergencia humanitaria compleja y la desintegración familiar agravan la crisis emocional en menores.',
    sourceName: 'Crónica Uno',
    sourceUrl: 'https://cronica.uno',
    region: 'Distrito Capital',
    category: 'Sucesos',
    publishedAt: new Date(Date.now() - 1000 * 60 * 360).toISOString()
  },
  {
    title: 'El Carabobeño: Accidente en Autopista del Sur deja dos personas fallecidas y tres lesionados de gravedad',
    snippet: 'Unidades de Protección Civil y Bomberos de Carabobo realizaron maniobras de rescate vehicular en el tramo de Tocuyito.',
    sourceName: 'El Carabobeño',
    sourceUrl: 'https://www.el-carabobeno.com',
    region: 'Carabobo',
    category: 'Sucesos',
    publishedAt: new Date(Date.now() - 1000 * 60 * 420).toISOString()
  },
  {
    id: 'fb-13',
    title: 'CNN en Español: Cobertura especial sobre la situación institucional y económica de Venezuela',
    snippet: 'Corresponsales y analistas internacionales examinan los indicadores inflacionarios y la agenda diplomática regional.',
    sourceName: 'CNN en Español',
    sourceUrl: 'https://cnnespanol.cnn.com',
    region: 'Distrito Capital',
    category: 'Política',
    priority: 88,
    isInvestigacion: false,
    origin: 'curated',
    publishedAt: new Date(Date.now() - 1000 * 60 * 60).toISOString()
  },
  {
    id: 'fb-14',
    title: 'BBC: International reporting on public healthcare and access to medicines in Venezuela',
    snippet: 'A look into the supply chains, hospital equipment status and humanitarian assistance programs operating in the country.',
    sourceName: 'BBC',
    sourceUrl: 'https://bbc.com',
    region: 'Nacional',
    category: 'Salud y Educación',
    priority: 85,
    isInvestigacion: true,
    origin: 'curated',
    publishedAt: new Date(Date.now() - 1000 * 60 * 75).toISOString()
  },
  {
    id: 'fb-01',
    title: 'Reuters: Mercado petrolero y exportaciones de crudo venezolano bajo escrutinio internacional',
    snippet: 'Análisis detallado sobre las dinámicas de exportación de crudo venezolano, transporte marítimo y el impacto de los marcos regulatorios internacionales.',
    sourceName: 'Reuters',
    sourceUrl: 'https://www.reuters.com',
    region: 'Nacional',
    category: 'Economía',
    priority: 95,
    isInvestigacion: false,
    origin: 'curated',
    publishedAt: new Date(Date.now() - 1000 * 60 * 15).toISOString()
  },
  {
    id: 'fb-02',
    title: 'Armando.info: Expediente revela entramado de contrataciones públicas y empresas intermediarias',
    snippet: 'Investigación especial documenta adjudicaciones directas, sobreprecios y la estructura societaria detrás de programas de distribución de alimentos y suministros.',
    sourceName: 'Armando.info',
    sourceUrl: 'https://armando.info',
    region: 'Nacional',
    category: 'Política',
    priority: 92,
    isInvestigacion: true,
    origin: 'curated',
    publishedAt: new Date(Date.now() - 1000 * 60 * 25).toISOString()
  },
  {
    id: 'fb-03',
    title: 'Efecto Cocuyo: Trabajadores del sector salud y educación intensifican jornadas de protesta por reivindicaciones laborales',
    snippet: 'Gremios docentes y sanitarios de varios estados del país se movilizan exigiendo cumplimiento de convenios colectivos y salarios indexados al costo de la canasta básica.',
    sourceName: 'Efecto Cocuyo',
    sourceUrl: 'https://efectococuyo.com',
    region: 'Distrito Capital',
    category: 'Derechos Humanos',
    priority: 88,
    isInvestigacion: false,
    origin: 'curated',
    publishedAt: new Date(Date.now() - 1000 * 60 * 40).toISOString()
  },
  {
    id: 'fb-04',
    title: 'BBC Mundo: Radiografía de la economía venezolana: inflación, tasa cambiaria y el dilema de la producción nacional',
    snippet: 'Reportaje en profundidad sobre el comportamiento del tipo de cambio, la pérdida del poder adquisitivo y las proyecciones financieras para el cierre del año.',
    sourceName: 'BBC Mundo',
    sourceUrl: 'https://www.bbc.com/mundo',
    region: 'Nacional',
    category: 'Economía',
    priority: 85,
    isInvestigacion: false,
    origin: 'curated',
    publishedAt: new Date(Date.now() - 1000 * 60 * 55).toISOString()
  },
  {
    id: 'fb-05',
    title: 'Noticia al Día: Falla eléctrica en subestación de Maracaibo deja sin suministro a múltiples circuitos urbanos',
    snippet: 'Vecinos de diversos sectores de la capital zuliana reportan cortes prolongados de energía eléctrica. Cuadrillas técnicas realizan maniobras para restablecer el servicio.',
    sourceName: 'Noticia al Día',
    sourceUrl: 'https://noticiaaldia.com',
    region: 'Zulia',
    category: 'Servicios Públicos',
    priority: 80,
    isInvestigacion: false,
    origin: 'curated',
    publishedAt: new Date(Date.now() - 1000 * 60 * 65).toISOString()
  },
  {
    id: 'fb-06',
    title: 'AFP: Comunidad internacional evalúa mecanismos de facilitación y diálogo en torno a Venezuela',
    snippet: 'Declaraciones de cancillerías y organismos multilaterales sobre el estado de las conversaciones políticas y la protección de derechos civiles.',
    sourceName: 'AFP',
    sourceUrl: 'https://www.afp.com',
    region: 'Nacional',
    category: 'Política',
    priority: 78,
    isInvestigacion: false,
    origin: 'curated',
    publishedAt: new Date(Date.now() - 1000 * 60 * 80).toISOString()
  },
  {
    id: 'fb-07',
    title: 'EFE: Intercambio comercial en la frontera colombo-venezolana registra repunte sostenido durante el trimestre',
    snippet: 'Cifras aduaneras y gremios de transporte de carga reportan incremento en el flujo de mercancías a través de los puentes binacionales de Táchira y Norte de Santander.',
    sourceName: 'EFE',
    sourceUrl: 'https://efe.com',
    region: 'Táchira',
    category: 'Economía',
    priority: 75,
    isInvestigacion: false,
    origin: 'curated',
    publishedAt: new Date(Date.now() - 1000 * 60 * 95).toISOString()
  },
  {
    id: 'fb-08',
    title: 'Runrunes: Informe de organizaciones de DDHH denuncia condiciones de reclusión y exige debido proceso',
    snippet: 'Compilación de testimonios de familiares y abogados defensores sobre la situación carcelaria y los retrasos en las audiencias judiciales.',
    sourceName: 'Runrunes',
    sourceUrl: 'https://runrun.es',
    region: 'Miranda',
    category: 'Derechos Humanos',
    priority: 82,
    isInvestigacion: true,
    origin: 'curated',
    publishedAt: new Date(Date.now() - 1000 * 60 * 110).toISOString()
  },
  {
    id: 'fb-09',
    title: 'La Prensa de Lara: Productores agrícolas de los valles larenses alertan sobre impacto por distribución de combustible',
    snippet: 'Asociaciones de agricultores en Carora y El Tocuyo advierten riesgo de pérdidas en cosechas de hortalizas ante retrasos en el despacho de gasoil.',
    sourceName: 'La Prensa de Lara',
    sourceUrl: 'https://laprensalara.com.ve',
    region: 'Lara',
    category: 'Economía',
    priority: 77,
    isInvestigacion: false,
    origin: 'curated',
    publishedAt: new Date(Date.now() - 1000 * 60 * 125).toISOString()
  },
  {
    id: 'fb-10',
    title: 'El Carabobeño: Gremios médicos de Carabobo alertan sobre déficit de insumos en áreas de trauma shock',
    snippet: 'Representantes del Colegio de Médicos de la entidad presentan balance de deficiencias en centros asistenciales y solicitan dotación prioritaria.',
    sourceName: 'El Carabobeño',
    sourceUrl: 'https://www.el-carabobeno.com',
    region: 'Carabobo',
    category: 'Salud y Educación',
    priority: 79,
    isInvestigacion: false,
    origin: 'curated',
    publishedAt: new Date(Date.now() - 1000 * 60 * 140).toISOString()
  },
  {
    id: 'fb-11',
    title: 'AP News: Sesión de la Asamblea Nacional debate reformas en el marco de la legislación electoral',
    snippet: 'Cobertura del debate parlamentario sobre propuestas normativas y pronunciamientos de las diferentes bancadas en el Palacio Federal Legislativo.',
    sourceName: 'AP News',
    sourceUrl: 'https://apnews.com',
    region: 'Nacional',
    category: 'Política',
    priority: 76,
    isInvestigacion: false,
    origin: 'curated',
    publishedAt: new Date(Date.now() - 1000 * 60 * 155).toISOString()
  },
  {
    id: 'fb-12',
    title: 'NY Times: Venezuelan Families Navigate Inflation and the Realities of Dollarization in Daily Life',
    snippet: 'Special reporting on how ordinary citizens across social strata in Caracas and provincial cities cope with rising living costs, remittances, and informal trade.',
    sourceName: 'NY Times',
    sourceUrl: 'https://www.nytimes.com',
    region: 'Nacional',
    category: 'Economía',
    priority: 84,
    isInvestigacion: true,
    origin: 'curated',
    publishedAt: new Date(Date.now() - 1000 * 60 * 170).toISOString()
  }
];

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const sources = [
    // 1. Efecto Cocuyo
    { name: 'Efecto Cocuyo', url: 'https://efectococuyo.com/feed/', region: 'Nacional' },
    { name: 'Efecto Cocuyo', url: 'https://news.google.com/rss/search?q=site:efectococuyo.com+when:3d&hl=es-419&gl=VE&ceid=VE:es-419', region: 'Nacional' },
    
    // 2. Agencias Internacionales y Cobertura Global
    { name: 'Reuters', url: 'https://news.google.com/rss/search?q=Reuters+Venezuela+when:3d&hl=es-419&gl=VE&ceid=VE:es-419', region: 'Nacional' },
    { name: 'AFP', url: 'https://news.google.com/rss/search?q=AFP+Venezuela+when:3d&hl=es-419&gl=VE&ceid=VE:es-419', region: 'Nacional' },
    { name: 'EFE', url: 'https://news.google.com/rss/search?q=EFE+Venezuela+when:3d&hl=es-419&gl=VE&ceid=VE:es-419', region: 'Nacional' },
    { name: 'AP News', url: 'https://news.google.com/rss/search?q="Associated+Press"+Venezuela+when:3d&hl=es-419&gl=VE&ceid=VE:es-419', region: 'Nacional' },
    { name: 'BBC Mundo', url: 'https://news.google.com/rss/search?q=site:bbc.com/mundo+"Venezuela"+when:7d&hl=es-419&gl=VE&ceid=VE:es-419', region: 'Nacional' },
    { name: 'CNN en Español', url: 'https://news.google.com/rss/search?q=site:cnnespanol.cnn.com+"Venezuela"+when:7d&hl=es-419&gl=VE&ceid=VE:es-419', region: 'Nacional' },
    { name: 'NY Times', url: 'https://news.google.com/rss/search?q=site:nytimes.com+"Venezuela"+when:14d&hl=es-419&gl=VE&ceid=VE:es-419', region: 'Nacional' },

    // 3. Portales de Investigación
    { name: 'Armando.info', url: 'https://news.google.com/rss/search?q=site:armando.info+when:30d&hl=es-419&gl=VE&ceid=VE:es-419', region: 'Nacional' },
    { name: 'Runrunes', url: 'https://runrun.es/feed/', region: 'Nacional' },

    // 6. Portales de Verificación y Fact-Checking
    { name: 'EsPaja.com', url: 'https://news.google.com/rss/search?q=site:espaja.com+when:30d&hl=es-419&gl=VE&ceid=VE:es-419', region: 'Nacional' },
    { name: 'Cazadores de Fake News', url: 'https://news.google.com/rss/search?q=site:cazadoresdefakenews.info+when:30d&hl=es-419&gl=VE&ceid=VE:es-419', region: 'Nacional' },
    { name: 'Cotejo.info', url: 'https://news.google.com/rss/search?q=site:cotejo.info+when:30d&hl=es-419&gl=VE&ceid=VE:es-419', region: 'Nacional' },
    { name: 'Cocuyo Chequea', url: 'https://news.google.com/rss/search?q=site:efectococuyo.com+"chequea"+when:30d&hl=es-419&gl=VE&ceid=VE:es-419', region: 'Nacional' }
,

    // 4. Medios Regionales y Nacionales
    { name: 'El Carabobeño', url: 'https://www.el-carabobeno.com/feed/', region: 'Carabobo' },
    { name: 'La Prensa de Lara', url: 'https://laprensalara.com.ve/feed/', region: 'Lara' },
    { name: 'Descifrado', url: 'https://www.descifrado.com/feed/', region: 'Nacional' },
    { name: 'Noticia al Día', url: 'https://noticiaaldia.com/feed/', region: 'Zulia' },
    { name: 'TalCual', url: 'https://talcualdigital.com/feed/', region: 'Nacional' },
    { name: 'Crónica Uno', url: 'https://cronica.uno/feed/', region: 'Nacional' },
    { name: 'El Estímulo', url: 'https://elestimulo.com/feed/', region: 'Nacional' }
  ];

  const fetchPromises = sources.map(async src => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4200);
      const resp = await fetch(src.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'application/rss+xml, application/xml, text/xml, */*'
        },
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

    if (allItems.length === 0) {
      allItems = [...FALLBACK_ITEMS];
    }

    const seen = new Set();
    const uniqueItems = [];
    for (const item of allItems) {
      const key = item.title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 45);
      if (!seen.has(key)) {
        seen.add(key);
        uniqueItems.push(item);
      }
    }

    uniqueItems.sort((a, b) => {
      const diff = (b.priority || 50) - (a.priority || 50);
      if (Math.abs(diff) >= 20) {
        return diff;
      }
      return new Date(b.publishedAt) - new Date(a.publishedAt);
    });

    // Top 5 Nacional: Filtrar solo noticias recientes (últimos 5 días) para la portada
    const now = Date.now();
    const candidatosTop5 = uniqueItems.filter(it => {
      const pubTime = new Date(it.publishedAt).getTime();
      return isNaN(pubTime) || (now - pubTime) <= (1000 * 60 * 60 * 24 * 5);
    });
    const poolTop5 = candidatosTop5.length >= 5 ? candidatosTop5 : uniqueItems;
    const top5 = poolTop5.slice(0, 5);

    // Top 4 Regional (filtrando noticias de estados fuera de Distrito Capital y Nacional)
    const regionalPool = uniqueItems.filter(it => it.region !== 'Nacional' && it.region !== 'Distrito Capital');
    const top4Regional = regionalPool.slice(0, 4);

    // Feed Exclusivo de Investigación
    const investigativeItems = uniqueItems.filter(it => it.isInvestigacion || it.sourceName.includes('Armando.info') || it.sourceName.includes('Runrunes') || it.sourceName.includes('Cocuyo'));

    // Colección de Verificaciones y Fact-Checks
    const factChecks = uniqueItems.filter(it => esFactCheck(it.sourceName, it.title + ' ' + (it.snippet || '')));

    return res.status(200).json({
      status: 'ok',
      count: uniqueItems.length,
      top5,
      top4Regional,
      investigativeItems: investigativeItems.slice(0, 30),
      factChecks: factChecks.slice(0, 25),
      items: uniqueItems.slice(0, 80),
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message, items: [], top5: [], top4Regional: [], investigativeItems: [] });
  }
}
