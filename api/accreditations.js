// api/accreditations.js - Vercel Serverless Function
// Gestión de acreditaciones con control de acceso RBAC y exportación oficial a Excel/CSV

let accreditationsDb = [
  { id: 'ACR-2026-001', date: '2026-10-01 09:30', name: 'Carlos Eduardo Mendoza', email: 'carlos.mendoza@elestimulo.com', role: 'Periodista', outlet: 'El Estímulo', region: 'Distrito Capital', cnp: 'CNP-21.458', status: 'Aprobada' },
  { id: 'ACR-2026-002', date: '2026-10-02 11:15', name: 'Mariana Valenzuela Silva', email: 'mariana.valenzuela@gmail.com', role: 'Corresponsal', outlet: 'Freelance (Colabora con Efecto Cocuyo)', region: 'Zulia', cnp: 'CNP-19.832', status: 'Aprobada' },
  { id: 'ACR-2026-003', date: '2026-10-03 14:40', name: 'Jesús Alberto Rodríguez', email: 'jrodriguez@correodelcaroni.com', role: 'Fotoperiodista', outlet: 'Correo del Caroní', region: 'Bolívar', cnp: 'SNTP-8.912', status: 'Aprobada' },
  { id: 'ACR-2026-004', date: '2026-10-04 10:20', name: 'Beatriz Quintana Morales', email: 'bquintana.prensa@gmail.com', role: 'Investigación', outlet: 'Freelance / Armando.info', region: 'Carabobo', cnp: 'CNP-24.119', status: 'Aprobada' },
  { id: 'ACR-2026-005', date: '2026-10-05 16:05', name: 'Roberto Carlos Pernía', email: 'roberto.pernia@laprensalara.com', role: 'Corresponsal', outlet: 'La Prensa de Lara', region: 'Lara', cnp: 'CNP-18.740', status: 'Pendiente' },
  { id: 'ACR-2026-006', date: '2026-10-06 08:50', name: 'Valeria Elena Gómez', email: 'valeria.gomez@cronica.uno', role: 'Periodista', outlet: 'Crónica Uno', region: 'Miranda', cnp: 'CNP-26.331', status: 'Aprobada' },
  { id: 'ACR-2026-007', date: '2026-10-06 13:10', name: 'Daniel José Uzcátegui', email: 'duzcategui.media@outlook.com', role: 'Corresponsal', outlet: 'Freelance (Mérida / Táchira)', region: 'Mérida', cnp: 'CNP-22.095', status: 'Pendiente' }
];

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const role = req.headers['x-user-role'] || req.query.role || 'PUBLICO';

  // 1. Exportación a Excel / CSV (Solo para Administrador)
  if (req.query.export === 'excel' || req.query.export === 'csv') {
    if (role !== 'ADMIN') {
      return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de Administrador para exportar datos confidenciales.' });
    }

    const headers = ['ID Credencial', 'Fecha Solicitud', 'Nombre Completo', 'Correo Electrónico', 'Rol / Cargo', 'Medio / Freelance', 'Estado Asignado', 'CNP / SNTP', 'Estatus'];
    const rows = accreditationsDb.map(a => [
      a.id,
      a.date,
      `"${a.name.replace(/"/g, '""')}"`,
      `"${a.email.replace(/"/g, '""')}"`,
      `"${a.role.replace(/"/g, '""')}"`,
      `"${a.outlet.replace(/"/g, '""')}"`,
      `"${a.region.replace(/"/g, '""')}"`,
      `"${(a.cnp || 'No colegiado').replace(/"/g, '""')}"`,
      `"${a.status.replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="registro_acreditaciones_periodistas.csv"');
    return res.status(200).send(csvContent);
  }

  // 2. Consulta GET
  if (req.method === 'GET') {
    if (role !== 'ADMIN') {
      // Para el público general, no se devuelven los correos ni datos sensibles
      return res.status(200).json({
        restricted: true,
        message: 'Acceso confidencial restringido a Administradores.',
        totalActive: accreditationsDb.length,
        items: [] // Datos ocultos para no administradores
      });
    }

    return res.status(200).json({
      restricted: false,
      total: accreditationsDb.length,
      items: accreditationsDb
    });
  }

  // 3. Envío POST de nueva solicitud (Abierto a cualquier periodista)
  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const { name, email, role: pRole, outlet, region, cnp } = body;

      if (!name || !email || !outlet) {
        return res.status(400).json({ error: 'Campos requeridos incompletos.' });
      }

      const newId = 'ACR-2026-0' + String(accreditationsDb.length + 1).padStart(2, '0');
      const newRecord = {
        id: newId,
        date: new Date().toISOString().replace('T', ' ').slice(0, 16),
        name: name.trim(),
        email: email.trim(),
        role: pRole || 'Periodista',
        outlet: outlet.trim(),
        region: region || 'Distrito Capital',
        cnp: cnp ? cnp.trim() : 'No colegiado',
        status: 'Pendiente'
      };

      accreditationsDb.unshift(newRecord);
      return res.status(201).json({ status: 'ok', id: newId, message: 'Solicitud registrada de forma confidencial.' });
    } catch (e) {
      return res.status(500).json({ error: 'Error procesando solicitud.' });
    }
  }

  return res.status(405).json({ error: 'Método no permitido' });
}

