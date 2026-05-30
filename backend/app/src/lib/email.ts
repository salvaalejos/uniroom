import { Resend } from "resend";
import * as fs from "fs";
import * as path from "path";

let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY no configurada");
    }
    _resend = new Resend(apiKey);
  }
  return _resend;
}

const OTP_TEMPLATE_PATH = path.join(__dirname, "..", "templates", "email-otp.html");

function loadEmailTemplate(otpCode: string, email: string): string {
  let html = fs.readFileSync(OTP_TEMPLATE_PATH, "utf-8");
  html = html.replace("{{OTP_CODE}}", otpCode);
  html = html.replace("{{EMAIL}}", email);
  html = html.replace("{{EXPIRES_MINUTES}}", "10");
  html = html.replace("{{YEAR}}", new Date().getFullYear().toString());
  return html;
}

export async function sendOTPEmail(email: string, otpCode: string): Promise<{ success: boolean; error?: string }> {
  try {
    const html = loadEmailTemplate(otpCode, email);

    const result = await getResend().emails.send({
      from: "uniroomie@uniroomie.tech",
      to: email,
      subject: "Verifica tu correo electrónico - Código UniRoom",
      html,
    });

    if (result.error) {
      console.error("[email] Error de Resend:", result.error);
      return { success: false, error: result.error.message };
    }

    console.log(`[email] OTP enviado a ${email}`);
    return { success: true };
  } catch (error) {
    console.error("[email] Error:", error);
    return { success: false, error: "Error al enviar el correo" };
  }
}

const FORGOT_PASSWORD_TEMPLATE_PATH = path.join(__dirname, "..", "templates", "email-forgot-password.html");

function loadForgotPasswordTemplate(otpCode: string, email: string): string {
  let html = fs.readFileSync(FORGOT_PASSWORD_TEMPLATE_PATH, "utf-8");
  html = html.replace("{{OTP_CODE}}", otpCode);
  html = html.replace("{{EMAIL}}", email);
  html = html.replace("{{EXPIRES_MINUTES}}", "10");
  html = html.replace("{{YEAR}}", new Date().getFullYear().toString());
  return html;
}

export async function sendForgotPasswordEmail(email: string, otpCode: string): Promise<{ success: boolean; error?: string }> {
  try {
    const html = loadForgotPasswordTemplate(otpCode, email);

    const result = await getResend().emails.send({
      from: "uniroomie@uniroomie.tech",
      to: email,
      subject: "Recupera tu contraseña - Código UniRoomie",
      html,
    });

    if (result.error) {
      console.error("[email] Error de Resend:", result.error);
      return { success: false, error: result.error.message };
    }

    console.log(`[email] Correo de recuperación enviado a ${email}`);
    return { success: true };
  } catch (error) {
    console.error("[email] Error:", error);
    return { success: false, error: "Error al enviar el correo de recuperación" };
  }
}