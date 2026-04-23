const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || '';

export const clerkEnabled =
  publishableKey.startsWith('pk_') && !publishableKey.includes('your_key');
