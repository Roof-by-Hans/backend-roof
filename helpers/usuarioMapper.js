const parseRoles = (roles) => {
  if (!roles) return [];
  if (Array.isArray(roles)) return roles;
  if (typeof roles === "string") {
    return roles
      .split(",")
      .map((rol) => rol.trim())
      .filter((rol) => rol.length > 0);
  }
  return [];
};

const mapUsuarioRow = (row) => {
  if (!row) return null;

  return {
    id: row.id_usuario,
    nombreUsuario: row.nombre_usuario,
    activo:
      row.activo === null ? null : row.activo === 1 || row.activo === true,
    fotoPerfil: row.foto_perfil || null,
    roles: parseRoles(row.roles),
  };
};

const mapUsuariosRows = (rows = []) => rows.map(mapUsuarioRow);

module.exports = {
  mapUsuarioRow,
  mapUsuariosRows,
  parseRoles,
};
