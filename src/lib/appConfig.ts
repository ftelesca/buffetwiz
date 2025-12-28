// Runtime app configuration helper (ported from yalt)
export const getNormalizedLanguage = (lang?: string): string => {
  const browserLang = lang || navigator.language || "en";
  const langCode = browserLang.toLowerCase().split("-")[0];
  if (langCode === "pt" || browserLang.toLowerCase() === "pt-br") return "pt-BR";
  if (langCode === "es") return "es";
  return "en";
};

export const getAppConfig = () => {
  const appUrl = window.location.origin;
  const appDomain =
    import.meta.env.BUFFETWIZ_RESEND_DOMAIN ||
    import.meta.env.YALT_RESEND_DOMAIN ||
    window.location.hostname;

  const appName =
    import.meta.env.BUFFETWIZ_APP_NAME ||
    import.meta.env.YALT_APP_NAME ||
    "BuffetWiz";

  const appDesc =
    import.meta.env.BUFFETWIZ_APP_DESC ||
    import.meta.env.YALT_APP_DESC ||
    "Gestao de buffet";

  const appLogo =
    import.meta.env.BUFFETWIZ_APP_LOGO ||
    import.meta.env.YALT_APP_LOGO ||
    "/favicon.ico";

  const appLogoUrl = `${appUrl}${appLogo}`;
  const storedLang = localStorage.getItem("i18nextLng");
  const language = storedLang || getNormalizedLanguage();

  return {
    appName,
    appDesc,
    appLogoUrl,
    appUrl,
    appDomain,
    language,
  };
};
