'use client';

import React from 'react';
import { Cyberdome3DMonitor } from './cyberdome-3d-monitor';

export function Cyberdome3DMonitorDemo() {
  return (
    <div style={{ width: '100%', height: '100vh', backgroundColor: '#0C1118', overflow: 'hidden' }}>
      <Cyberdome3DMonitor />
    </div>
  );
}

export default Cyberdome3DMonitorDemo;
