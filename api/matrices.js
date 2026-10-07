// api/matrices.js - Vercel Serverless Function (Node.js 18+)
// API para consulta, filtrado, creación de perfiles y exportación de matrices de datos

let hechosDb = [
  {
    id: 'HCH-01',
    fecha: '2026-10-06',
    categoria: 'Servicios Públicos',
    tipologiaHecho: 'Corte Eléctrico Masivo',
    caso: 'Colapso Subestaciones Occidente',
    descripcion: 'Apagón superior a 6 horas afectó a más de 12 municipios zulianos por sobrecarga en transformadores.',
    estado: 'Zulia',
    medio: 'Noticia al Día',
    keywords: ['apagón', 'maracaibo', 'corpoelec', 'emergencia', 'fallas eléctricas'],
    urlFuente: 'https://noticiaaldia.com'
  },
  {
    id: 'HCH-02',
    fecha: '2026-10-06',
    categoria: 'Economía',
    tipologiaHecho: 'Brecha Cambiaria & Alimentos',
    caso: 'Canasta Básica Familiar Q3',
    descripcion: 'Disparidad entre tasa oficial y mercado paralelo presiona al alza los rubros de primera necesidad en abastos.',
    estado: 'Distrito Capital',
    medio: 'Efecto Cocuyo',
    keywords: ['dólar', 'canasta alimentaria', 'inflación', 'salario', 'bcv'],
    urlFuente: 'https://efectococuyo.com'
  },
  {
    id: 'HCH-03',
    fecha: '2026-10-05',
    categoria: 'Derechos Humanos',
    tipologiaHecho: 'Medidas Cautelares de Salud',
    caso: 'Docentes & Sindicalistas Detenidos',
    descripcion: 'Defensores interponen peticiones de traslado a centros hospitalarios por patologías crónicas de dirigentes.',
    estado: 'Distrito Capital',
    medio: 'Efecto Cocuyo',
    keywords: ['ddhh', 'gremio docente', 'cautelares', 'tribunales', 'salud'],
    urlFuente: 'https://efectococuyo.com'
  },
  {
    id: 'HCH-04',
    fecha: '2026-10-05',
    categoria: 'Sucesos',
    tipologiaHecho: 'Deslizamiento de Vía',
    caso: 'Emergencia Troncal 9 Barlovento',
    descripcion: 'Lluvias torrenciales provocaron desprendimiento de talud interrumpiendo el tránsito hacia Oriente.',
    estado: 'Miranda',
    medio: 'El Nacional',
    keywords: ['vialidad', 'troncal 9', 'derrumbe', 'barlovento', 'tránsito'],
    urlFuente: 'https://elnacional.com'
  },
  {
    id: 'HCH-05',
    fecha: '2026-10-04',
    categoria: 'Derechos Humanos',
    tipologiaHecho: 'Contaminación Minera',
    caso: 'Mercurio en Cuenca del Caroní',
    descripcion: 'Consejos de ancianos indígenas exigen paralización de dragas en reservas forestales y pruebas toxicológicas.',
    estado: 'Bolívar',
    medio: 'Correo del Caroní',
    keywords: ['minería ilegal', 'caroní', 'indígenas', 'mercurio', 'medio ambiente'],
    urlFuente: 'https://correodelcaroni.com'
  },
  {
    id: 'HCH-06',
    fecha: '2026-10-04',
    categoria: 'Salud y Educación',
    tipologiaHecho: 'Protesta Laboral',
    caso: 'Insumos Hospital Barquisimeto',
    descripcion: 'Asamblea de trabajadores y residentes advierte paralización de cirugías electivas por falta de anestésicos.',
    estado: 'Lara',
    medio: 'La Prensa de Lara',
    keywords: ['hospital', 'protesta', 'médicos', 'salud pública', 'barquisimeto'],
    urlFuente: 'https://laprensalara.com.ve'
  }
];

let actoresDb = [
  {
    id: 'ACT-01',
    nombre: 'Delcy Rodríguez Gómez',
    edad: '57 años',
    tipoFuente: 'Oficial / Funcionario',
    cargoRol: 'Vicepresidenta Ejecutiva y Ministra de Petróleo',
    casoAsociado: 'Supervisión de producción en la Faja del Orinoco y medidas cambiarias',
    medio: 'Descifrado',
    fecha: '2026-10-06',
    urlFuente: 'https://descifrado.com'
  },
  {
    id: 'ACT-02',
    nombre: 'Dra. Caryslia Beatriz Rodríguez',
    edad: '56 años',
    tipoFuente: 'Oficial / Funcionario',
    cargoRol: 'Magistrada Presidenta del Tribunal Supremo de Justicia (TSJ)',
    casoAsociado: 'Gestión de recursos y sentencias de la Sala Constitucional',
    medio: 'El Nacional',
    fecha: '2026-10-05',
    urlFuente: 'https://elnacional.com'
  },
  {
    id: 'ACT-03',
    nombre: 'Adán Celis Michelena',
    edad: '59 años',
    tipoFuente: 'Empresarial / Privado',
    cargoRol: 'Presidente de Fedecámaras',
    casoAsociado: 'Demandas del sector empresarial sobre tarifas de servicios y comercio exterior',
    medio: 'El Carabobeño',
    fecha: '2026-10-05',
    urlFuente: 'https://el-carabobeno.com'
  },
  {
    id: 'ACT-04',
    nombre: 'Marino Alvarado',
    edad: '62 años',
    tipoFuente: 'ONG / DDHH',
    cargoRol: 'Coordinador de Investigación de PROVEA',
    casoAsociado: 'Documentación de condiciones carcelarias y solicitudes de medidas cautelares',
    medio: 'Efecto Cocuyo',
    fecha: '2026-10-05',
    urlFuente: 'https://efectococuyo.com'
  },
  {
    id: 'ACT-05',
    nombre: 'Prof. Eduardo Sánchez',
    edad: '54 años',
    tipoFuente: 'Sociedad Civil / Gremial',
    cargoRol: 'Presidente de Sindicato Nacional de Trabajadores Universitarios (SINATRA)',
    casoAsociado: 'Marcha de educadores y exigencia de convención colectiva única',
    medio: 'TalCual',
    fecha: '2026-10-04',
    urlFuente: 'https://talcualdigital.com'
  }
];

let perfilesDb = [
  {
    id: 'PRF-01',
    nombre: 'Delcy Rodríguez Gómez',
    cargo: 'Vicepresidenta Ejecutiva de la República y Ministra de Petróleo',
    institucion: 'Poder Ejecutivo Nacional / PDVSA',
    tipoCargo: 'Poder Ejecutivo (Ministro / Viceministro)',
    edad: '57 años',
    estado: 'Distrito Capital',
    biografia: 'Abogada con trayectoria diplomática. Lidera el gabinete económico y la reestructuración petrolera.',
    mencionesRecientes: ['Discurso sobre estabilidad cambiaria', 'Inspección de refinerías en Paraguaná']
  },
  {
    id: 'PRF-02',
    nombre: 'Dra. Caryslia Beatriz Rodríguez Rodríguez',
    cargo: 'Presidenta del Tribunal Supremo de Justicia (TSJ)',
    institucion: 'Tribunal Supremo de Justicia',
    tipoCargo: 'Poder Judicial (Juez / Magistrado)',
    edad: '56 años',
    estado: 'Distrito Capital',
    biografia: 'Designada presidenta del TSJ en enero de 2024. Expresidenta del Concejo Municipal Libertador.',
    mencionesRecientes: ['Sentencias de la Sala Electoral', 'Reunión de coordinación con circuitos penales']
  },
  {
    id: 'PRF-03',
    nombre: 'Tarek William Saab Halabi',
    cargo: 'Fiscal General de la República',
    institucion: 'Ministerio Público / Consejo Moral Republicano',
    tipoCargo: 'Poder Ciudadano (Fiscal / Defensor)',
    edad: '62 años',
    estado: 'Distrito Capital',
    biografia: 'Fiscal General desde agosto de 2017. Anteriormente Defensor del Pueblo.',
    mencionesRecientes: ['Balances penales en tribunales', 'Ruedas de prensa institucionales']
  }
];

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-User-Role');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const role = req.headers['x-user-role'] || req.query.role || 'PERIODISTA';
  const tipo = req.query.tipo || 'hechos';

  // Control de acreditación
  if (role !== 'PERIODISTA' && role !== 'ADMIN') {
    return res.status(403).json({ error: 'Acceso restringido. Se requiere credencial periodística verificada.' });
  }

  // GET: Retornar matrices
  if (req.method === 'GET') {
    if (tipo === 'actores') {
      return res.status(200).json({ status: 'ok', count: actoresDb.length, items: actoresDb });
    } else if (tipo === 'perfiles') {
      return res.status(200).json({ status: 'ok', count: perfilesDb.length, items: perfilesDb });
    }
    return res.status(200).json({ status: 'ok', count: hechosDb.length, items: hechosDb });
  }

  // POST: Crear perfil
  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const { nombre, cargo, institucion, tipoCargo, edad, estado, biografia } = body;

      if (!nombre || !cargo || !institucion) {
        return res.status(400).json({ error: 'Faltan campos obligatorios para el perfil.' });
      }

      const newId = 'PRF-0' + String(perfilesDb.length + 1);
      const nuevoPerfil = {
        id: newId,
        nombre: nombre.trim(),
        cargo: cargo.trim(),
        institucion: institucion.trim(),
        tipoCargo: tipoCargo || 'Funcionario Público',
        edad: edad || 'N/D',
        estado: estado || 'Nacional',
        biografia: biografia || 'Perfil creado desde panel acreditado.',
        mencionesRecientes: ['Incorporado por equipo periodístico']
      };

      perfilesDb.unshift(nuevoPerfil);
      return res.status(201).json({ status: 'ok', id: newId, item: nuevoPerfil });
    } catch (e) {
      return res.status(500).json({ error: 'Error procesando creación de perfil.' });
    }
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
