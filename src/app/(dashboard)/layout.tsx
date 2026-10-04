'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout';
import { useAppStore } from '@/stores/appStore';
import { CyberdomeLoader } from '@/components/ui/CyberdomeLoader';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { initAuth, isAuthenticated, user } = useAppStore();
  const router = useRouter();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const init = async () => {
      await initAuth();
      setInitialized(true);
    };
    init();
  }, [initAuth]);

  useEffect(() => {
    if (initialized && !isAuthenticated) {
      router.replace('/login');
    }
  }, [initialized, isAuthenticated, router]);

  if (!initialized) {
    return (
      <CyberdomeLoader
        fullscreen={true}
        label="AUTHENTICATING DEFENSE CLEARANCE..."
        subtext="VERIFYING TENANT ISOLATION · ROLE CLEARANCE ACTIVE"
      />
    );
  }

  if (!isAuthenticated || !user) {
    return null; // Will redirect to /login
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
