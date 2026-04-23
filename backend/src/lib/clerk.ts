import { createClerkClient, verifyToken } from '@clerk/backend';
import { config } from '../config';

export const clerkClient = createClerkClient({
  secretKey: config.clerkSecretKey,
});

export async function verifyClerkToken(token: string) {
  return verifyToken(token, {
    secretKey: config.clerkSecretKey || undefined,
    jwtKey: config.clerkJwtKey || undefined,
    authorizedParties: [config.corsOrigin],
  });
}
