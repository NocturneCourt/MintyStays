/** Thrown when production/configured DB path cannot serve real data. */
export class ServiceUnavailableError extends Error {
  readonly statusCode = 503;

  constructor(message = "Service temporarily unavailable") {
    super(message);
    this.name = "ServiceUnavailableError";
  }
}

export function isServiceUnavailableError(
  error: unknown,
): error is ServiceUnavailableError {
  return error instanceof ServiceUnavailableError;
}

/** Fail closed whenever a DB is configured or we are in production. */
export function shouldFailClosedOnDbError(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return Boolean(env.DATABASE_URL) || env.NODE_ENV === "production";
}
