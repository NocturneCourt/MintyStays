export type AffiliateProvider = "booking" | "generic";

export type AffiliateLinkInput = {
  baseUrl: string;
  provider?: AffiliateProvider;
  partnerId?: string;
  campaign?: string;
};

export function buildAffiliateLink(input: AffiliateLinkInput) {
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
