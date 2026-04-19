async function validarCajaAbierta(connection) {
  const [rows] = await connection.execute(
    `SELECT id_caja FROM CajaDiaria WHERE fecha = CURDATE() AND estado = 'ABIERTA' LIMIT 1`
  );
  if (rows.length === 0) {
    const error = new Error("Debe haber una caja abierta para realizar esta operación.");
    error.statusCode = 400;
    throw error;
  }
  return rows[0].id_caja;
}

module.exports = validarCajaAbierta;