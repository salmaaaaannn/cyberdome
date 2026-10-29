'use client';
import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, OrbitControls, Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';

function RotatingGlobe() {
  const globeRef = useRef<THREE.Mesh>(null);
  const particlesRef = useRef<THREE.Points>(null);

  useFrame((state, delta) => {
    if (globeRef.current) {
      globeRef.current.rotation.y += delta * 0.1;
      globeRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.1) * 0.2;
    }
    if (particlesRef.current) {
      particlesRef.current.rotation.y -= delta * 0.05;
    }
  });

  // Generate random particles around globe
  const particlePositions = new Float32Array(500 * 3);
  for (let i = 0; i < 500; i++) {
    const r = 2.2 + Math.random() * 1.5;
    const theta = Math.random() * 2 * Math.PI;
    const phi = Math.acos(Math.random() * 2 - 1);
    particlePositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    particlePositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    particlePositions[i * 3 + 2] = r * Math.cos(phi);
  }

  return (
    <group>
      {/* Globe base */}
      <Sphere ref={globeRef as any} args={[2, 64, 64]}>
        <meshStandardMaterial color="#0B1120" wireframe transparent opacity={0.35} emissive="#3B82F6" emissiveIntensity={0.25} />
      </Sphere>
      
      {/* Network Nodes / Particles */}
      <Points ref={particlesRef as any} positions={particlePositions}>
        <PointMaterial transparent color="#38BDF8" size={0.035} sizeAttenuation={true} depthWrite={false} />
      </Points>
      
      {/* Core light */}
      <pointLight color="#3B82F6" intensity={2.2} distance={6} />
      <ambientLight intensity={0.15} />
    </group>
  );
}

export default function CyberGlobe({ className = '' }: { className?: string }) {
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);
  
  React.useEffect(() => {
    setPrefersReducedMotion(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false);
  }, []);
  
  if (prefersReducedMotion) {
    return <div className={className} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 200, height: 200, borderRadius: '50%', border: '1px solid var(--cyberdome-red)', opacity: 0.5 }} />
    </div>;
  }

  return (
    <div className={className} style={{ width: '100%', height: '100%', minHeight: 400 }}>
      <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
        <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.5} />
        <RotatingGlobe />
      </Canvas>
    </div>
  );
}
