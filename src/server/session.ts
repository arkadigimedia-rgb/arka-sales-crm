import { SignJWT, jwtVerify } from "jose";
export type Session = { id: string; role: "FOUNDER" | "SALES_HEAD" | "SALESPERSON"; name: string };
const secret = () => new TextEncoder().encode(process.env.AUTH_SECRET);
export async function signSession(user: Session) { return new SignJWT(user).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("8h").sign(secret()); }
export async function verifySession(token: string) { const { payload } = await jwtVerify(token, secret()); return payload as unknown as Session; }
