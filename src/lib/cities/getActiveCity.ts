import { getSeedCity } from "@/lib/listings/seedData";

export async function getActiveCity() {
  const launchCitySlug = process.env.LAUNCH_CITY_SLUG ?? "lisbon";

  if (process.env.DATABASE_URL) {
    try {
      const [{ db }, { cities }, { eq }] = await Promise.all([
        import("@/db/client"),
        import("@/db/schema"),
        import("drizzle-orm"),
      ]);
      const [city] = await db
        .select()
        .from(cities)
        .where(eq(cities.slug, launchCitySlug))
        .limit(1);

      if (city) {
        return {
          id: city.id,
          name: city.name,
          country: city.country,
          slug: city.slug,
          lat: city.lat,
          lng: city.lng,
          isActive: city.isActive,
        };
      }
    } catch (error) {
      console.warn("Falling back to seed city data", error);
    }
  }

  const city = getSeedCity();

  if (city.slug !== launchCitySlug) {
    throw new Error(`No seed data is available for launch city ${launchCitySlug}`);
  }

  return city;
}
