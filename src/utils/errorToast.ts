type MaybeError = {
  message?: string;
  request?: unknown;
  response?: { status?: number };
  __globalToastHandled?: boolean;
};

const NETWORK_ERROR_TOKENS = [
  "no response received from server",
  "network error",
  "failed to fetch",
  "load failed",
  "internet",
  "offline",
];

export function shouldSuppressLocalErrorToast(
  error: unknown,
  fallbackMessage?: string
): boolean {
  const e = (error || {}) as MaybeError;

  if (e.__globalToastHandled) {
    return true;
  }

  const text = `${e.message || ""} ${fallbackMessage || ""}`.toLowerCase();
  const looksLikeNetworkMessage = NETWORK_ERROR_TOKENS.some((token) =>
    text.includes(token)
  );

  // Axios no-response shape: request exists and response is absent.
  const noResponseFromRequest = Boolean(e.request && !e.response);

  return looksLikeNetworkMessage || noResponseFromRequest;
}
