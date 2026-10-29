'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { DashboardLayout } from '@/components/layout';
import { useAppStore } from '@/stores/appStore';
import { CyberdomeLoader } from '@/components/ui/CyberdomeLoader';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { initAuth, isAuthenticated, user } = useAppStore();
  const router = useRouter();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    let mounted = true;
    const startTime = Date.now();
    // Guarantee a smooth 600ms presence so the loader is visible and never flickers/blinks
    const MIN_LOADER_MS = 600;

    const init = async () => {
      await initAuth();
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, MIN_LOADER_MS - elapsed);
      setTimeout(() => {
        if (mounted) {
          setInitialized(true);
        }
      }, remaining);
    };

    init();
    return () => {
      mounted = false;
    };
  }, [initAuth]);

  useEffect(() => {
    if (initialized && !isAuthenticated) {
      router.replace('/login');
    }
  }, [initialized, isAuthenticated, router]);

  return (
    <>
      <AnimatePresence mode="wait">
        {!initialized && (
          <motion.div
            key="cyberdome-defense-loader"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.35, ease: 'easeInOut' } }}
            style={{ position: 'fixed', inset: 0, zIndex: 99999 }}
          >
            <CyberdomeLoader
              fullscreen={true}
              label="AUTHENTICATING DEFENSE CLEARANCE..."
              subtext="VERIFYING TENANT ISOLATION · ROLE CLEARANCE ACTIVE"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {initialized && isAuthenticated && user && (
        <motion.div
          key="dashboard-viewport"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.28, ease: 'easeOut' } }}
          style={{ width: '100%', minHeight: '100vh' }}
        >
          <DashboardLayout>{children}</DashboardLayout>
        </motion.div>
      )}
    </>
  );
}
