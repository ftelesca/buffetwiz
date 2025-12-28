import { getTranslations, replaceVariables, AllTranslations } from './email-translations.ts';

export interface EmailContent {
  subject: string;
  text: string;
  html: string;
}

export interface EmailParams<T extends keyof AllTranslations> {
  language: string;
  functionName: T;
  variables: Record<string, string>;
  appName: string;
  appDesc: string;
  appLogoUrl: string;
  appUrl: string;
}

export function generateEmail<T extends keyof AllTranslations>(
  params: EmailParams<T>
): EmailContent {
  const { language, functionName, variables, appName, appDesc, appLogoUrl, appUrl } = params;
  const t = getTranslations(language, functionName);
  const allVariables = { ...variables, appName, appDesc, appLogoUrl, appUrl };

  const processedTranslations: Record<string, string> = {};
  for (const [key, value] of Object.entries(t)) {
    processedTranslations[key] = replaceVariables(value, allVariables);
  }

  let textContent = '';
  let htmlContent = '';

  switch (functionName) {
    case 'email-share':
      textContent = generateShareTextContent(processedTranslations as any, allVariables);
      htmlContent = generateShareHtmlContent(processedTranslations as any, allVariables);
      break;
    case 'email-validation':
      textContent = generateValidationTextContent(processedTranslations as any, allVariables);
      htmlContent = generateValidationHtmlContent(processedTranslations as any, allVariables);
      break;
    case 'email-change':
      textContent = generateChangeTextContent(processedTranslations as any, allVariables);
      htmlContent = generateChangeHtmlContent(processedTranslations as any, allVariables);
      break;
    case 'email-change-verify':
      textContent = generateChangeVerifyTextContent(processedTranslations as any, allVariables);
      htmlContent = generateChangeVerifyHtmlContent(processedTranslations as any, allVariables);
      break;
    case 'email-resetpwd':
      textContent = generateResetPwdTextContent(processedTranslations as any, allVariables);
      htmlContent = generateResetPwdHtmlContent(processedTranslations as any, allVariables);
      break;
  }

  return {
    subject: processedTranslations.subject,
    text: textContent,
    html: htmlContent,
  };
}

function generateShareTextContent(t: any, vars: Record<string, string>): string {
  return `${t.greeting}

${t.body}

${t.stepsTitle}
1. ${t.step1}
2. ${t.step2}
3. ${t.step3}

${t.securityNote}

---
${vars.appName} - ${vars.appDesc}
${vars.appUrl}/auth`;
}

function generateShareHtmlContent(t: any, vars: Record<string, string>): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 35px; padding-bottom: 25px; border-bottom: 3px solid #10b981;">
        <div style="text-align: center;">
          <img src="${vars.appLogoUrl}" alt="${vars.appName}" style="height: 32px; vertical-align: middle; margin-right: 10px;">
          <h1 style="color: #10b981; font-size: 26px; font-weight: 700; margin: 0; letter-spacing: -0.5px; display: inline-block; vertical-align: middle;">${vars.appName}</h1>
        </div>
        <div style="color: #6b7280; font-size: 14px; margin-top: 5px; font-weight: 400;">${vars.appDesc}</div>
      </div>

      <h2 style="color: #1e293b; margin-top: 0; font-size: 20px; font-weight: 600;">${t.greeting}</h2>
      <p>${t.body}</p>
      
      <h3 style="color: #555; margin-top: 30px;">${t.stepsTitle}</h3>
      <ol style="line-height: 1.8; color: #333;">
        <li><a href="${vars.appUrl}/auth" style="color: #10b981; text-decoration: none;">${t.step1}</a></li>
        <li>${t.step2}</li>
        <li>${t.step3}</li>
      </ol>
      
      <p style="color: #666; font-size: 0.9em; margin-top: 30px; padding-top: 20px; border-top: 1px solid #f0f0f0;">
        ${t.securityNote}
      </p>

      <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 2px solid #f0f0f0; color: #94a3b8; font-size: 12px;">
        <p style="margin: 5px 0; font-weight: 600; color: #10b981;">${vars.appName}</p>
        <p style="margin: 5px 0; color: #6b7280;">${vars.appDesc}</p>
        <p style="margin: 10px 0 5px 0;"><a href="${vars.appUrl}/auth" style="color: #10b981; text-decoration: none;">${vars.appName}</a></p>
      </div>
    </div>
  `;
}

function generateValidationTextContent(t: any, vars: Record<string, string>): string {
  return `${t.greeting}

${t.body}

${t.instructions}

${vars.verificationUrl}

${t.securityNote}

${t.footer}

---
${vars.appName} - ${vars.appDesc}
${vars.appUrl}`;
}

function generateValidationHtmlContent(t: any, vars: Record<string, string>): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 35px; padding-bottom: 25px; border-bottom: 3px solid #10b981;">
        <img src="${vars.appLogoUrl}" alt="${vars.appName}" style="height: 32px; vertical-align: middle; margin-right: 10px;">
        <h1 style="color: #10b981; font-size: 26px; font-weight: 700; margin: 0; letter-spacing: -0.5px; display: inline-block; vertical-align: middle;">${vars.appName}</h1>
      </div>

      <h2 style="color: #1e293b; margin-top: 0; font-size: 20px; font-weight: 600;">${t.greeting}</h2>
      <p style="color: #333; line-height: 1.6;">${t.body}</p>
      <p style="color: #333; line-height: 1.6;">${t.instructions}</p>
      
      <div style="text-align: center; margin: 35px 0;">
        <a href="${vars.verificationUrl}" style="background-color: #10b981; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 16px;">${t.button}</a>
      </div>

      <p style="color: #666; font-size: 0.9em; margin-top: 30px; padding-top: 20px; border-top: 1px solid #f0f0f0;">${t.securityNote}</p>
      <p style="color: #999; font-size: 0.85em; font-style: italic;">${t.footer}</p>

      <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 2px solid #f0f0f0; color: #94a3b8; font-size: 12px;">
        <p style="margin: 5px 0; font-weight: 600; color: #10b981;">${vars.appName}</p>
        <p style="margin: 5px 0; color: #6b7280;">${vars.appDesc}</p>
      </div>
    </div>
  `;
}

function generateChangeTextContent(t: any, vars: Record<string, string>): string {
  return `${t.greeting}

${t.body}

${t.explanation}

${vars.authorizationUrl}

${t.securityNote}

${t.footer}

---
${vars.appName} - ${vars.appDesc}
${vars.appUrl}`;
}

function generateChangeHtmlContent(t: any, vars: Record<string, string>): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 35px; padding-bottom: 25px; border-bottom: 3px solid #10b981;">
        <img src="${vars.appLogoUrl}" alt="${vars.appName}" style="height: 32px; vertical-align: middle; margin-right: 10px;">
        <h1 style="color: #10b981; font-size: 26px; font-weight: 700; margin: 0; letter-spacing: -0.5px; display: inline-block; vertical-align: middle;">${vars.appName}</h1>
      </div>

      <h2 style="color: #1e293b; margin-top: 0; font-size: 20px; font-weight: 600;">${t.greeting}</h2>
      <p style="color: #333; line-height: 1.6;">${t.body}</p>
      <p style="color: #333; line-height: 1.6;">${t.explanation}</p>
      
      <div style="text-align: center; margin: 35px 0;">
        <a href="${vars.authorizationUrl}" style="background-color: #10b981; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 16px;">${t.button}</a>
      </div>

      <p style="color: #666; font-size: 0.9em; margin-top: 30px; padding-top: 20px; border-top: 1px solid #f0f0f0;">${t.securityNote}</p>
      <p style="color: #999; font-size: 0.85em; font-style: italic;">${t.footer}</p>

      <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 2px solid #f0f0f0; color: #94a3b8; font-size: 12px;">
        <p style="margin: 5px 0; font-weight: 600; color: #10b981;">${vars.appName}</p>
        <p style="margin: 5px 0; color: #6b7280;">${vars.appDesc}</p>
      </div>
    </div>
  `;
}

function generateChangeVerifyTextContent(t: any, vars: Record<string, string>): string {
  return `${t.greeting}

${t.body}

${vars.verificationUrl}

${t.securityNote}

${t.footer}

---
${vars.appName} - ${vars.appDesc}
${vars.appUrl}`;
}

function generateChangeVerifyHtmlContent(t: any, vars: Record<string, string>): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 35px; padding-bottom: 25px; border-bottom: 3px solid #10b981;">
        <img src="${vars.appLogoUrl}" alt="${vars.appName}" style="height: 32px; vertical-align: middle; margin-right: 10px;">
        <h1 style="color: #10b981; font-size: 26px; font-weight: 700; margin: 0; letter-spacing: -0.5px; display: inline-block; vertical-align: middle;">${vars.appName}</h1>
      </div>

      <h2 style="color: #1e293b; margin-top: 0; font-size: 20px; font-weight: 600;">${t.greeting}</h2>
      <p style="color: #333; line-height: 1.6;">${t.body}</p>
      
      <div style="text-align: center; margin: 35px 0;">
        <a href="${vars.verificationUrl}" style="background-color: #10b981; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 16px;">${t.button}</a>
      </div>

      <p style="color: #666; font-size: 0.9em; margin-top: 30px; padding-top: 20px; border-top: 1px solid #f0f0f0;">${t.securityNote}</p>
      <p style="color: #999; font-size: 0.85em; font-style: italic;">${t.footer}</p>

      <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 2px solid #f0f0f0; color: #94a3b8; font-size: 12px;">
        <p style="margin: 5px 0; font-weight: 600; color: #10b981;">${vars.appName}</p>
        <p style="margin: 5px 0; color: #6b7280;">${vars.appDesc}</p>
      </div>
    </div>
  `;
}

function generateResetPwdTextContent(t: any, vars: Record<string, string>): string {
  return `${t.greeting}

${t.body}

${t.instructions}

${vars.resetUrl}

${t.expirationNote}

${t.securityNote}

${t.footer}

---
${vars.appName} - ${vars.appDesc}
${vars.appUrl}`;
}

function generateResetPwdHtmlContent(t: any, vars: Record<string, string>): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 35px; padding-bottom: 25px; border-bottom: 3px solid #10b981;">
        <img src="${vars.appLogoUrl}" alt="${vars.appName}" style="height: 32px; vertical-align: middle; margin-right: 10px;">
        <h1 style="color: #10b981; font-size: 26px; font-weight: 700; margin: 0; letter-spacing: -0.5px; display: inline-block; vertical-align: middle;">${vars.appName}</h1>
      </div>

      <h2 style="color: #1e293b; margin-top: 0; font-size: 20px; font-weight: 600;">${t.greeting}</h2>
      <p style="color: #333; line-height: 1.6;">${t.body}</p>
      <p style="color: #333; line-height: 1.6;">${t.instructions}</p>
      
      <div style="text-align: center; margin: 35px 0;">
        <a href="${vars.resetUrl}" style="background-color: #10b981; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 16px;">${t.button}</a>
      </div>

      <p style="color: #999; font-size: 0.85em; font-style: italic;">${t.expirationNote}</p>
      <p style="color: #666; font-size: 0.9em; margin-top: 30px; padding-top: 20px; border-top: 1px solid #f0f0f0;">${t.securityNote}</p>
      <p style="color: #999; font-size: 0.85em; font-style: italic;">${t.footer}</p>

      <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 2px solid #f0f0f0; color: #94a3b8; font-size: 12px;">
        <p style="margin: 5px 0; font-weight: 600; color: #10b981;">${vars.appName}</p>
        <p style="margin: 5px 0; color: #6b7280;">${vars.appDesc}</p>
      </div>
    </div>
  `;
}
