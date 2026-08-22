const fallbackVersion = "1.2.0+development";

export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION?.trim() || fallbackVersion;

export const APP_VERSION_LABEL = APP_VERSION.includes("+")
  ? APP_VERSION.replace("+", " · build ")
  : APP_VERSION;
