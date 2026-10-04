'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PersonalRootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/personal/dashboard');
  }, [router]);

  return null;
}
