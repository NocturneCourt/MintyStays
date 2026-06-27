import type { DefaultSession, DefaultUser } from "next-auth";
import type { UserRole } from "@/lib/auth/roles";

declare module "next-auth" {
  interface Session {
    user?: DefaultSession["user"] & {
      id: string;
      role: UserRole;
      verifiedAt: Date | null;
    };
  }

  interface User extends DefaultUser {
    role?: UserRole | null;
    verifiedAt?: Date | null;
  }
}
