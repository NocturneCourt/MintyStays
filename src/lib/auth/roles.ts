export type UserRole = "insider" | "editor";

export type AuthUserLike = {
  id?: string | null;
  email?: string | null;
  role?: string | null;
  emailVerified?: Date | null;
  verifiedAt?: Date | null;
};

export type AuthPrincipal =
  | { kind: "anonymous" }
  | {
      kind: UserRole;
      userId: string;
      email: string | null;
      role: UserRole;
      verifiedAt: Date;
    };

export function isUserRole(value: unknown): value is UserRole {
  return value === "insider" || value === "editor";
}

export function getVerifiedAt(user: AuthUserLike): Date | null {
  return user.verifiedAt ?? user.emailVerified ?? null;
}

export function toAuthPrincipal(user?: AuthUserLike | null): AuthPrincipal {
  if (!user?.id || !isUserRole(user.role)) {
    return { kind: "anonymous" };
  }

  const verifiedAt = getVerifiedAt(user);

  if (!verifiedAt) {
    return { kind: "anonymous" };
  }

  return {
    kind: user.role,
    userId: user.id,
    email: user.email ?? null,
    role: user.role,
    verifiedAt,
  };
}

export function canAccessInsider(user?: AuthUserLike | null) {
  const principal = toAuthPrincipal(user);

  return principal.kind === "insider" || principal.kind === "editor";
}

export function canAccessEditor(user?: AuthUserLike | null) {
  return toAuthPrincipal(user).kind === "editor";
}

export function requireInsider(user?: AuthUserLike | null) {
  if (!canAccessInsider(user)) {
    throw new Error("Insider access requires a verified Insider Member or Editor");
  }
}

export function requireEditor(user?: AuthUserLike | null) {
  if (!canAccessEditor(user)) {
    throw new Error("Editor access requires a verified Editor");
  }
}
