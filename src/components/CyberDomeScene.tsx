'use client';

import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial, Line, OrbitControls, Environment, Sphere, MeshDistortMaterial, Stars } from '@react-three/drei';
import * as THREE from 'three';

// Particle network connecting the nodes
function NetworkParticles({ count = 200 }) {
  const points = useRef<THREE.Points>(null);
  const lines = useRef<THREE.LineSegments>(null);

  const [positions, colors] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 50;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 50;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 50;

      // Primary color: Cyber Red (#FF1744) and Cyan (#00B8FF)
      const isRed = Math.random() > 0.3;
      const color = new THREE.Color(isRed ? '#FF1744' : '#00B8FF');
      col[i * 3] = color.r;
      col[i * 3 + 1] = color.g;
      col[i * 3 + 2] = color.b;
    }
    return [pos, col];
  }, [count]);

  const lineGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [positions]);

  useFrame((state, delta) => {
    if (points.current) {
      points.current.rotation.y += delta * 0.05;
      points.current.rotation.x += delta * 0.02;
    }
  });

  return (
    <group>
      <Points ref={points} positions={positions} colors={colors}>
        <PointMaterial vertexColors size={0.15} sizeAttenuation transparent opacity={0.8} />
      </Points>
    </group>
  );
}

// The core Dome structure
function CoreDome() {
  const meshRef = useRef<THREE.Mesh>(null);
  const shieldRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.2;
      meshRef.current.rotation.z += delta * 0.1;
    }
    if (shieldRef.current) {
      shieldRef.current.rotation.y -= delta * 0.1;
      // Pulse effect
      shieldRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 2) * 0.02);
    }
  });

  return (
    <group>
      {/* Inner Core */}
      <Sphere ref={meshRef} args={[4, 32, 32]}>
        <MeshDistortMaterial
          color="#111111"
          emissive="#FF1744"
          emissiveIntensity={1.5}
          wireframe
          distort={0.4}
          speed={2}
          roughness={0}
        />
      </Sphere>
      
      {/* Outer Defensive Shield */}
      <Sphere ref={shieldRef} args={[5.5, 64, 64]}>
        <meshPhysicalMaterial 
          color="#FF1744"
          transparent
          opacity={0.1}
          metalness={0.9}
          roughness={0.1}
          transmission={0.9}
          emissive="#FF1744"
          emissiveIntensity={0.2}
          side={THREE.DoubleSide}
        />
      </Sphere>
    </group>
  );
}

export default function CyberDomeScene() {
  return (
    <div style={{ width: '100%', height: '100vh', position: 'absolute', top: 0, left: 0, zIndex: 0, pointerEvents: 'none' }}>
      <Canvas camera={{ position: [0, 0, 25], fov: 45 }} gl={{ antialias: true, alpha: true }}>
        <fog attach="fog" args={['#050607', 10, 50]} />
        <ambientLight intensity={0.2} />
        <pointLight position={[0, 0, 0]} color="#FF1744" intensity={2} distance={30} />
        <pointLight position={[10, 10, 10]} color="#00B8FF" intensity={1} />
        
        <Stars radius={100} depth={50} count={3000} factor={4} saturation={1} fade speed={1} />
        
        <group position={[0, -2, 0]}>
          <CoreDome />
          <NetworkParticles count={400} />
        </group>
        
        <OrbitControls 
          enableZoom={false} 
          enablePan={false}
          autoRotate 
          autoRotateSpeed={0.5} 
          maxPolarAngle={Math.PI / 1.8} 
          minPolarAngle={Math.PI / 2.2}
        />
      </Canvas>
    </div>
  );
}
