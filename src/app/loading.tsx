import { CyberdomeLoader } from '@/components/ui/CyberdomeLoader';

export default function RootLoading() {
  return (
    <CyberdomeLoader
      fullscreen={true}
      label="INITIALIZING CYBER DOME DEFENSE GRID..."
      subtext="SYSTEM: ONLINE · DEFENSE NODES: ACTIVE · ZERO-TRUST SECURED"
    />
  );
}
