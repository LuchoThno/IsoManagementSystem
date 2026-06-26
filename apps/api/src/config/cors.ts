const parseOrigins = (value?: string) =>
  (value ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

export const getAllowedOrigins = () => {
  const configuredOrigins = parseOrigins(process.env.CORS_ORIGIN);

  if (!configuredOrigins.length) {
    return true;
  }

  return configuredOrigins;
};
