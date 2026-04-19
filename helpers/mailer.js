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
 * @param {Object} options - Opciones de envio
 * @param {string} options.baseUrl - URL base de la pantalla de reset
 * @returns {Promise<boolean>}
 */
const enviarMailRecuperacion = async (email, token, options = {}) => {
  const baseUrl = options.baseUrl || process.env.FRONTEND_URL;
  const appName = "Roof by Hans";
  const year = new Date().getFullYear();

  if (!baseUrl) {
    throw new Error("No hay URL de frontend configurada para recuperación de contraseña");
  }

  const separator = baseUrl.includes("?") ? "&" : "?";
  const linkReset = `${baseUrl}${separator}token=${token}`;

  const html = `
    <div style="background-color:#f6f6f8; padding:24px 12px; font-family: Arial, sans-serif;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:640px; margin:0 auto; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 10px 25px rgba(16,22,34,0.08);">
        <tr>
          <td style="padding:24px; border-bottom:1px solid #eef1f6; text-align:center;">
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
              <tr>
                <td style="padding-left:10px; font-size:22px; color:#0f172a; font-weight:700; letter-spacing:0.2px;">${appName}</td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:32px 28px 28px 28px; text-align:center;">
            <h1 style="margin:0 0 14px 0; color:#0f172a; font-size:30px; line-height:36px; font-weight:700;">Recuperar contraseña</h1>
            <p style="margin:0 auto 24px auto; color:#475569; font-size:16px; line-height:24px; max-width:520px;">
              Recibimos una solicitud para restablecer tu contraseña. Si no fuiste vos, ignora este correo y tu contraseña seguirá siendo la misma.
            </p>

            <a href="${linkReset}" style="display:inline-block; width:100%; max-width:360px; background:#135bec; color:#ffffff; text-decoration:none; font-size:18px; line-height:54px; font-weight:700; border-radius:8px; box-shadow:0 8px 18px rgba(19,91,236,0.25);">
              Restablecer contraseña
            </a>

            <div style="margin:18px auto 0 auto; display:inline-block; background:#eef4ff; border-radius:999px; padding:8px 14px;">
              <span style="font-size:12px; color:#135bec; font-weight:600;">Este enlace vence en 15 minutos.</span>
            </div>

            <div style="height:1px; background:#eef1f6; margin:28px 0 22px 0;"></div>

            <p style="margin:0 0 8px 0; text-align:left; color:#64748b; font-size:12px; line-height:18px;">
              Si no puedes hacer click en el botón, copia este enlace en tu navegador:
            </p>

            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:10px; text-align:left; word-break:break-all;">
              <span style="font-size:12px; color:#135bec; font-family:Consolas, Monaco, monospace;">${linkReset}</span>
            </div>
          </td>
        </tr>

        <tr>
          <td style="background:#f8fafc; padding:18px 24px; text-align:center;">
            <p style="margin:0; color:#94a3b8; font-size:10px; line-height:14px; letter-spacing:1.2px; text-transform:uppercase; font-weight:700;">
              © ${year} ${appName}. Todos los derechos reservados.
            </p>
          </td>
        </tr>
      </table>
    </div>
  `;

  return enviarCorreo({
    to: email,
    subject: `Restablecer tu contraseña - ${appName}`,
    html,
  });
};

module.exports = {
  hashToken,
  generarToken,
  enviarCorreo,
  enviarMailRecuperacion,
};
