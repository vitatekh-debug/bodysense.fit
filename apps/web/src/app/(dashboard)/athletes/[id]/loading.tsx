/**
 * loading.tsx — Route-level loading UI for /athletes/[id]
 *
 * Next.js App Router renders this file instantly while the page.tsx
 * Server Component streams in. Shows a full-fidelity skeleton that
 * matches the exact layout of the athlete profile page.
 */

import { AthleteProfilePageSkeleton } from "@/components/profile/ProfileSkeletons";

export default function AthleteDetailLoading() {
  return <AthleteProfilePageSkeleton />;
}
