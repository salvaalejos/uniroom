import { Resend } from "resend";
import * as fs from "fs";
import * as path from "path";

let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY no configurada en el archivo .env");
    }
    _resend = new Resend(apiKey);
  }
  return _resend;
}

const DEFAULT_FROM_EMAIL = process.env.EMAIL_FROM || "UniRoomie <uniroomie@uniroomie.tech>";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const OTP_TEMPLATE_PATH = path.join(__dirname, "..", "templates", "email-otp.html");

function loadEmailTemplate(otpCode: string, email: string): string {
  let html = fs.readFileSync(OTP_TEMPLATE_PATH, "utf-8");
  html = html.replace("{{OTP_CODE}}", escapeHtml(otpCode));
  html = html.replace("{{EMAIL}}", escapeHtml(email));
  html = html.replace("{{EXPIRES_MINUTES}}", "10");
  html = html.replace("{{YEAR}}", new Date().getFullYear().toString());
  return html;
}

export async function sendOTPEmail(email: string, otpCode: string): Promise<{ success: boolean; error?: string }> {
  try {
    const html = loadEmailTemplate(otpCode, email);

    const result = await getResend().emails.send({
      from: DEFAULT_FROM_EMAIL,
      to: email,
      subject: "Verifica tu correo electrónico - Código UniRoomie",
      html,
    });

    if (result.error) {
      console.error("[email] Error de Resend:", result.error);
      return { success: false, error: result.error.message };
    }

    console.log(`[email] Código OTP enviado exitosamente desde correo oficial a ${email}`);
    return { success: true };
  } catch (error: any) {
    console.error("[email] Error enviando OTP:", error);
    return { success: false, error: error?.message || "Error al enviar el correo de verificación" };
  }
}

const FORGOT_PASSWORD_TEMPLATE_PATH = path.join(__dirname, "..", "templates", "email-forgot-password.html");

function loadForgotPasswordTemplate(otpCode: string, email: string): string {
  let html = fs.readFileSync(FORGOT_PASSWORD_TEMPLATE_PATH, "utf-8");
  html = html.replace("{{OTP_CODE}}", escapeHtml(otpCode));
  html = html.replace("{{EMAIL}}", escapeHtml(email));
  html = html.replace("{{EXPIRES_MINUTES}}", "10");
  html = html.replace("{{YEAR}}", new Date().getFullYear().toString());
  return html;
}

export async function sendForgotPasswordEmail(email: string, otpCode: string): Promise<{ success: boolean; error?: string }> {
  try {
    const html = loadForgotPasswordTemplate(otpCode, email);

    const result = await getResend().emails.send({
      from: DEFAULT_FROM_EMAIL,
      to: email,
      subject: "Recupera tu contraseña - Código UniRoomie",
      html,
    });

    if (result.error) {
      console.error("[email] Error de Resend:", result.error);
      return { success: false, error: result.error.message };
    }

    console.log(`[email] Correo de recuperación enviado exitosamente a ${email}`);
    return { success: true };
  } catch (error: any) {
    console.error("[email] Error enviando correo de recuperación:", error);
    return { success: false, error: error?.message || "Error al enviar el correo de recuperación" };
  }
}
