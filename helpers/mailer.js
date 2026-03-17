const nodemailer = require("nodemailer");
const crypto = require("crypto");

/**
 * Crear un hash seguro del token para guardar en BD
 * @param {string} token - Token aleatorio en texto plano
 * @returns {string} Token hasheado
 */
const hashToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

/**
 * Generar un token aleatorio de 32 caracteres
 * @returns {string} Token
 */
const generarToken = () => {
  return crypto.randomBytes(16).toString("hex");
};

/**
 * Crear transportes SMTP (primario y secundario para failover)
 */
const crearTransportes = () => {
  const transportePrimario = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  // Transportes secundario (opcional, para failover)
  const transporteSecundario = process.env.SMTP_HOST_SECONDARY
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST_SECONDARY,
        port: parseInt(process.env.SMTP_PORT_SECONDARY || 587),
        secure: process.env.SMTP_SECURE_SECONDARY === "true",
        auth: {
          user: process.env.SMTP_USER_SECONDARY,
          pass: process.env.SMTP_PASS_SECONDARY,
        },
      })
    : null;

  return { transportePrimario, transporteSecundario };
};

/**
 * Enviar correo con failover automático
 * @param {Object} opciones - { to, subject, html }
 * @returns {Promise<boolean>} true si se envió correctamente
 */
const enviarCorreo = async (opciones) => {
  const { to, subject, html } = opciones;
  const { transportePrimario, transporteSecundario } = crearTransportes();

  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    html,
  };

  // Intentar con transporte primario
  try {
    await transportePrimario.sendMail(mailOptions);
    console.log(`Mail enviado a ${to} (primario)`);
    return true;
  } catch (errorPrimario) {
    console.error(
      `Error al enviar con primario: ${errorPrimario.message}`
    );

    // Si hay error temporal y hay secundario, intentar con él
    if (transporteSecundario) {
      try {
        await transporteSecundario.sendMail(mailOptions);
        console.log(
          `Mail enviado a ${to} (secundario - fallback)`
        );
        return true;
      } catch (errorSecundario) {
        console.error(
          `Error al enviar con secundario: ${errorSecundario.message}`
        );
        throw new Error(
          "No se pudo enviar el correo con ningún proveedor"
        );
      }
    }

    throw errorPrimario;
  }
};

/**
 * Enviar correo de recuperación de contraseña
 * @param {string} email - Email del usuario
 * @param {string} token - Token de reset (sin hashear)
 * @returns {Promise<boolean>}
 */
const enviarMailRecuperacion = async (email, token) => {
  const linkReset = `${process.env.FRONTEND_URL}?token=${token}`;

  const html = `
    <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
      <h2 style="color: #333;">Recuperar contraseña</h2>
      <p>Recibimos una solicitud para restablecer tu contraseña.</p>
      <p>Si no fuiste vos, ignora este correo y tu contraseña seguirá siendo la misma.</p>
      
      <p style="margin-top: 30px;">
        <a href="${linkReset}" 
           style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; 
                  color: white; text-decoration: none; border-radius: 5px;">
          Restablecer contraseña
        </a>
      </p>
      
      <p style="margin-top: 20px; font-size: 12px; color: #999;">
        Este enlace vence en 15 minutos.
      </p>
      
      <p style="margin-top: 20px; font-size: 12px; color: #999;">
        Si no puedes hacer click en el botón, copia este enlace en tu navegador:<br/>
        <code>${linkReset}</code>
      </p>
    </div>
  `;

  return enviarCorreo({
    to: email,
    subject: "Restablecer tu contraseña - Roof",
    html,
  });
};

module.exports = {
  hashToken,
  generarToken,
  enviarCorreo,
  enviarMailRecuperacion,
};
