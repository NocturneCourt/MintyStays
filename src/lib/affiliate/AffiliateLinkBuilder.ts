export type AffiliateProvider = "booking" | "generic";

export type AffiliateLinkInput = {
  baseUrl: string;
  provider?: AffiliateProvider;
  partnerId?: string;
  campaign?: string;
};

/** Hosts allowed for outbound affiliate redirects (suffix match). */
export const ALLOWED_AFFILIATE_HOST_SUFFIXES = [
  "booking.com",
  "airbnb.com",
  "trivago.com",
] as const;

export class AffiliateUrlNotAllowedError extends Error {
  readonly statusCode = 400;

  constructor(message = "Affiliate URL host is not allowed") {
    super(message);
    this.name = "AffiliateUrlNotAllowedError";
  }
}

export function isAllowedAffiliateUrl(baseUrl: string): boolean {
  try {
    const url = new URL(baseUrl);
    const hostname = url.hostname.toLowerCase();

    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return url.protocol === "http:" || url.protocol === "https:";
    }

    if (url.protocol !== "https:") {
      return false;
    }

    return ALLOWED_AFFILIATE_HOST_SUFFIXES.some(
      (suffix) => hostname === suffix || hostname.endsWith(`.${suffix}`),
    );
  } catch {
    return false;
  }
}

export function assertAllowedAffiliateUrl(baseUrl: string) {
  if (!isAllowedAffiliateUrl(baseUrl)) {
    throw new AffiliateUrlNotAllowedError(
      `Affiliate URL host is not allowlisted: ${safeHost(baseUrl)}`,
    );
  }
}

export function buildAffiliateLink(input: AffiliateLinkInput) {
  assertAllowedAffiliateUrl(input.baseUrl);

  const url = new URL(input.baseUrl);
  const provider = input.provider ?? "generic";

  if (input.partnerId) {
    if (provider === "booking") {
      url.searchParams.set("aid", input.partnerId);
    } else {
      url.searchParams.set("partner_id", input.partnerId);
    }
  }

  url.searchParams.set("utm_source", "mintystays");
  url.searchParams.set("utm_medium", "affiliate");
  url.searchParams.set("utm_campaign", input.campaign ?? "launch_city");

  return url.toString();
}

function safeHost(baseUrl: string) {
  try {
    return new URL(baseUrl).hostname;
  } catch {
    return "(invalid URL)";
  }
}
