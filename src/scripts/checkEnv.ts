import { checkLaunchEnv } from "@/lib/config/env";

const result = checkLaunchEnv();

console.log("MintyStays environment check");
console.log(`AUTH_ENABLED=${result.env.AUTH_ENABLED}`);
console.log(`LAUNCH_CITY_SLUG=${result.env.LAUNCH_CITY_SLUG}`);
console.log(`NEXT_PUBLIC_SITE_URL=${result.env.NEXT_PUBLIC_SITE_URL}`);

for (const warning of result.warnings) {
  console.warn(`warning: ${warning}`);
}

if (result.errors.length) {
  for (const error of result.errors) {
    console.error(`error: ${error}`);
  }

  process.exitCode = 1;
}
