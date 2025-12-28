// Email translations for i18n support
// Supported languages: pt-BR, en, es

export type SupportedLanguage = 'pt-BR' | 'en' | 'es';

interface EmailShareTranslations {
  subject: string;
  greeting: string;
  body: string;
  stepsTitle: string;
  step1: string;
  step2: string;
  step3: string;
  securityNote: string;
}

interface EmailValidationTranslations {
  subject: string;
  greeting: string;
  body: string;
  instructions: string;
  button: string;
  securityNote: string;
  footer: string;
}

interface EmailChangeTranslations {
  subject: string;
  greeting: string;
  body: string;
  explanation: string;
  button: string;
  securityNote: string;
  footer: string;
}

interface EmailChangeVerifyTranslations {
  subject: string;
  greeting: string;
  body: string;
  button: string;
  securityNote: string;
  footer: string;
}

interface EmailResetPwdTranslations {
  subject: string;
  greeting: string;
  body: string;
  instructions: string;
  button: string;
  expirationNote: string;
  securityNote: string;
  footer: string;
}

export interface AllTranslations {
  'email-share': EmailShareTranslations;
  'email-validation': EmailValidationTranslations;
  'email-change': EmailChangeTranslations;
  'email-change-verify': EmailChangeVerifyTranslations;
  'email-resetpwd': EmailResetPwdTranslations;
}

const translations: Record<SupportedLanguage, AllTranslations> = {
  'pt-BR': {
    'email-share': {
      subject: '{{ownerName}} compartilhou uma pasta com você: {{folderName}}',
      greeting: 'Você recebeu acesso a uma pasta compartilhada!',
      body: '{{ownerName}} ({{ownerEmail}}) compartilhou a pasta "{{folderName}}" com você.',
      stepsTitle: 'Para acessar a pasta compartilhada:',
      step1: 'Faça login na aplicação {{appName}}',
      step2: 'Aceite o convite pendente',
      step3: 'A pasta aparecerá na sua lista de pastas',
      securityNote: 'Se você não esperava este convite ou não conhece {{ownerName}}, você pode ignorar este email com segurança.',
    },
    'email-validation': {
      subject: 'Confirme seu email em {{appName}}',
      greeting: 'Bem-vindo ao {{appName}}!',
      body: 'Obrigado por se cadastrar, {{userName}}!',
      instructions: 'Para começar a usar sua conta, você precisa confirmar seu endereço de email clicando no botão abaixo:',
      button: 'Confirmar Email',
      securityNote: 'Se você não criou uma conta em {{appName}}, você pode ignorar este email com segurança.',
      footer: 'Este link de verificação expirará em 24 horas.',
    },
    'email-change': {
      subject: 'Autorize a mudança de email em {{appName}}',
      greeting: 'Solicitação de mudança de email',
      body: 'Olá, {{userName}}!',
      explanation: 'Recebemos uma solicitação para mudar o email da sua conta de {{oldEmail}} para {{newEmail}}.',
      button: 'Autorizar Mudança',
      securityNote: 'Se você não solicitou esta mudança, ignore este email e seu email permanecerá inalterado. Por segurança, recomendamos alterar sua senha.',
      footer: 'Este link de autorização expirará em 1 hora.',
    },
    'email-change-verify': {
      subject: 'Confirme seu novo email em {{appName}}',
      greeting: 'Confirme seu novo endereço de email',
      body: 'Olá, {{userName}}!',
      button: 'Confirmar Novo Email',
      securityNote: 'Após a confirmação, você usará {{newEmail}} para acessar sua conta.',
      footer: 'Este link de verificação expirará em 1 hora.',
    },
    'email-resetpwd': {
      subject: 'Recuperação de senha - {{appName}}',
      greeting: 'Redefinir sua senha',
      body: 'Olá!',
      instructions: 'Recebemos uma solicitação para redefinir a senha da sua conta em {{appName}}. Clique no botão abaixo para criar uma nova senha:',
      button: 'Redefinir Senha',
      expirationNote: 'Este link de recuperação expirará em 1 hora.',
      securityNote: 'Se você não solicitou a recuperação de senha, ignore este email. Sua senha permanecerá inalterada.',
      footer: 'Por segurança, nunca compartilhe este link com outras pessoas.',
    },
  },
  'en': {
    'email-share': {
      subject: '{{ownerName}} shared a folder with you: {{folderName}}',
      greeting: 'You have received access to a shared folder!',
      body: '{{ownerName}} ({{ownerEmail}}) shared the folder "{{folderName}}" with you.',
      stepsTitle: 'To access the shared folder:',
      step1: 'Log in to {{appName}}',
      step2: 'Accept the pending invitation',
      step3: 'The folder will appear in your folder list',
      securityNote: 'If you were not expecting this invitation or do not know {{ownerName}}, you can safely ignore this email.',
    },
    'email-validation': {
      subject: 'Confirm your email at {{appName}}',
      greeting: 'Welcome to {{appName}}!',
      body: 'Thank you for signing up, {{userName}}!',
      instructions: 'To start using your account, you need to confirm your email address by clicking the button below:',
      button: 'Confirm Email',
      securityNote: 'If you did not create an account at {{appName}}, you can safely ignore this email.',
      footer: 'This verification link will expire in 24 hours.',
    },
    'email-change': {
      subject: 'Authorize email change at {{appName}}',
      greeting: 'Email change request',
      body: 'Hello, {{userName}}!',
      explanation: 'We received a request to change your account email from {{oldEmail}} to {{newEmail}}.',
      button: 'Authorize Change',
      securityNote: 'If you did not request this change, ignore this email and your email will remain unchanged. For security, we recommend changing your password.',
      footer: 'This authorization link will expire in 1 hour.',
    },
    'email-change-verify': {
      subject: 'Confirm your new email at {{appName}}',
      greeting: 'Confirm your new email address',
      body: 'Hello, {{userName}}!',
      button: 'Confirm New Email',
      securityNote: 'After confirmation, you will use {{newEmail}} to access your account.',
      footer: 'This verification link will expire in 1 hour.',
    },
    'email-resetpwd': {
      subject: 'Password Recovery - {{appName}}',
      greeting: 'Reset your password',
      body: 'Hello!',
      instructions: 'We received a request to reset the password for your account at {{appName}}. Click the button below to create a new password:',
      button: 'Reset Password',
      expirationNote: 'This recovery link will expire in 1 hour.',
      securityNote: 'If you did not request a password recovery, ignore this email. Your password will remain unchanged.',
      footer: 'For security, never share this link with anyone.',
    },
  },
  'es': {
    'email-share': {
      subject: '{{ownerName}} compartió una carpeta contigo: {{folderName}}',
      greeting: '¡Has recibido acceso a una carpeta compartida!',
      body: '{{ownerName}} ({{ownerEmail}}) compartió la carpeta "{{folderName}}" contigo.',
      stepsTitle: 'Para acceder a la carpeta compartida:',
      step1: 'Inicia sesión en {{appName}}',
      step2: 'Acepta la invitación pendiente',
      step3: 'La carpeta aparecerá en tu lista de carpetas',
      securityNote: 'Si no esperabas esta invitación o no conoces a {{ownerName}}, puedes ignorar este correo de forma segura.',
    },
    'email-validation': {
      subject: 'Confirma tu correo en {{appName}}',
      greeting: '¡Bienvenido a {{appName}}!',
      body: '¡Gracias por registrarte, {{userName}}!',
      instructions: 'Para comenzar a usar tu cuenta, necesitas confirmar tu dirección de correo haciendo clic en el botón a continuación:',
      button: 'Confirmar Correo',
      securityNote: 'Si no creaste una cuenta en {{appName}}, puedes ignorar este correo de forma segura.',
      footer: 'Este enlace de verificación expirará en 24 horas.',
    },
    'email-change': {
      subject: 'Autoriza el cambio de correo en {{appName}}',
      greeting: 'Solicitud de cambio de correo',
      body: '¡Hola, {{userName}}!',
      explanation: 'Recibimos una solicitud para cambiar el correo de tu cuenta de {{oldEmail}} a {{newEmail}}.',
      button: 'Autorizar Cambio',
      securityNote: 'Si no solicitaste este cambio, ignora este correo y tu correo permanecerá sin cambios. Por seguridad, recomendamos cambiar tu contraseña.',
      footer: 'Este enlace de autorización expirará en 1 hora.',
    },
    'email-change-verify': {
      subject: 'Confirma tu nuevo correo en {{appName}}',
      greeting: 'Confirma tu nueva dirección de correo',
      body: '¡Hola, {{userName}}!',
      button: 'Confirmar Nuevo Correo',
      securityNote: 'Después de la confirmación, usarás {{newEmail}} para acceder a tu cuenta.',
      footer: 'Este enlace de verificación expirará en 1 hora.',
    },
    'email-resetpwd': {
      subject: 'Recuperación de contraseña - {{appName}}',
      greeting: 'Restablecer tu contraseña',
      body: '¡Hola!',
      instructions: 'Recibimos una solicitud para restablecer la contraseña de tu cuenta en {{appName}}. Haz clic en el botón a continuación para crear una nueva contraseña:',
      button: 'Restablecer Contraseña',
      expirationNote: 'Este enlace de recuperación expirará en 1 hora.',
      securityNote: 'Si no solicitaste la recuperación de contraseña, ignora este correo. Tu contraseña permanecerá sin cambios.',
      footer: 'Por seguridad, nunca compartas este enlace con nadie.',
    },
  },
};

export function getTranslations<T extends keyof AllTranslations>(
  language: string,
  functionName: T
): AllTranslations[T] {
  const validLanguages: SupportedLanguage[] = ['pt-BR', 'en', 'es'];
  const lang = validLanguages.includes(language as SupportedLanguage)
    ? (language as SupportedLanguage)
    : 'pt-BR';

  return translations[lang][functionName];
}

export function replaceVariables(text: string, variables: Record<string, string>): string {
  let result = text;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }
  return result;
}
