'use client';

import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';
import { SecurityState } from '@/types';
import { GLTFModel } from './GLTFModel';
import { AnimatedSprite } from './AnimatedSprite';
import { ModelRegistry, SpriteRegistry } from '@/lib/3d/Registries';

interface SimulationLab3DSceneProps {
  currentState: SecurityState;
  activeStepIndex?: number;
  isDefenseActive: boolean;
  blockedNodeId?: string;
  onNodeClick?: (nodeId: string) => void;
}

interface AttackChainNode {
  id: string;
  name: string;
  role: string;
  position: [number, number, number];
  type: 'attacker' | 'firewall' | 'router' | 'server' | 'app' | 'database';
}

const ATTACK_CHAIN_NODES: AttackChainNode[] = [
  { id: 'node-attacker', name: 'External Attacker', role: 'Threat Source', position: [-5, 0.6, 0], type: 'attacker' },
  { id: 'node-firewall', name: 'Edge Firewall', role: 'Perimeter Defense', position: [-3, 0.6, 0], type: 'firewall' },
  { id: 'node-router', name: 'Core Router', role: 'Network Fabric', position: [-1, 0.6, 0], type: 'router' },
  { id: 'node-web', name: 'Web Server', role: 'DMZ Ingress', position: [1, 0.6, 0], type: 'server' },
  { id: 'node-app', name: 'Core Application', role: 'Business Logic', position: [3, 0.6, 0], type: 'app' },
  { id: 'node-db', name: 'Customer Database', role: 'Data Vault', position: [5, 0.6, 0], type: 'database' },
];

function PacketStream({
  currentState,
  isDefenseActive,
}: {
  currentState: SecurityState;
  isDefenseActive: boolean;
}) {
  const packetCount = 20;
  const packetsRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Speed and max travel index based on state
  const maxReachX = useMemo(() => {
    if (currentState === 'BLOCKED') return -3.0; // Stopped at Firewall
    if (currentState === 'ALERT') return 4.8;    // Reaching Database
    if (currentState === 'WARNING') return 2.8;  // Reaching Application
    if (currentState === 'SUSPICIOUS') return 0.8; // Reaching Web Server
    return -1.0; // Normal traffic
  }, [currentState]);

  const packetOffsets = useMemo(() => {
    return Array.from({ length: packetCount }, (_, i) => ({
      progress: (i / packetCount),
      speed: 0.15 + (i % 3) * 0.05,
      yOffset: Math.sin(i * 1.5) * 0.08,
      zOffset: Math.cos(i * 2.3) * 0.08,
    }));
  }, []);

  useFrame((_, delta) => {
    if (!packetsRef.current) return;

    packetOffsets.forEach((p, i) => {
      p.progress += delta * p.speed;
      if (p.progress > 1) p.progress = 0;

      // Interpolate along X from -5 to maxReachX
      const startX = -5.0;
      const currentX = startX + p.progress * (maxReachX - startX);
      const isBlockedPulse = isDefenseActive && currentX >= -3.2 && currentX <= -2.8;

      dummy.position.set(currentX, 0.6 + p.yOffset, p.zOffset);
      const scale = isBlockedPulse ? 0.25 : 0.14;
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();

      packetsRef.current!.setMatrixAt(i, dummy.matrix);
    });

    packetsRef.current.instanceMatrix.needsUpdate = true;
  });

  const packetColor =
    currentState === 'BLOCKED'
      ? '#FF1744'
      : currentState === 'ALERT'
      ? '#FF1744'
      : currentState === 'WARNING'
      ? '#FFB020'
      : currentState === 'SUSPICIOUS'
      ? '#EAAA08'
      : '#00E887';

  return (
    <instancedMesh ref={packetsRef} args={[undefined, undefined, packetCount]}>
      <sphereGeometry args={[1, 16, 16]} />
      <meshStandardMaterial
        color={packetColor}
        emissive={packetColor}
        emissiveIntensity={1.5}
        toneMapped={false}
      />
    </instancedMesh>
  );
}

function DefenseShield({ isActive }: { isActive: boolean }) {
  const shieldRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (shieldRef.current && isActive) {
      shieldRef.current.rotation.y += delta * 0.8;
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 6) * 0.05;
      shieldRef.current.scale.set(pulse, pulse, pulse);
    }
  });

  if (!isActive) return null;

  return (
    <group position={[-3, 0.6, 0]}>
      {/* Cylindrical energy barrier */}
      <mesh ref={shieldRef}>
        <cylinderGeometry args={[0.9, 0.9, 1.8, 32, 1, true]} />
        <meshStandardMaterial
          color="#00D2FF"
          emissive="#00D2FF"
          emissiveIntensity={1.2}
          transparent
          opacity={0.45}
          side={THREE.DoubleSide}
          wireframe
        />
      </mesh>
      {/* Blocked Barrier Plate */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.1, 1.6, 1.4]} />
        <meshStandardMaterial
          color="#00B8FF"
          emissive="#0088FF"
          emissiveIntensity={0.8}
          transparent
          opacity={0.65}
        />
      </mesh>
      <Text
        position={[0, 1.25, 0]}
        fontSize={0.22}
        color="#00E5FF"
        anchorX="center"
        anchorY="middle"
      >
        DEFENSE ACTIVE: IP BLOCKED
      </Text>
    </group>
  );
}

function SceneNode({
  node,
  currentState,
  isDefenseActive,
  onNodeClick,
}: {
  node: AttackChainNode;
  currentState: SecurityState;
  isDefenseActive: boolean;
  onNodeClick?: (id: string) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Determine compromise visual state
  const isCompromised = useMemo(() => {
    if (node.type === 'attacker') return true;
    if (currentState === 'BLOCKED' && node.type === 'firewall') return false; // Firewall holds!
    if (currentState === 'ALERT') {
      return ['firewall', 'router', 'server', 'app'].includes(node.type);
    }
    if (currentState === 'WARNING') {
      return ['firewall', 'router', 'server'].includes(node.type);
    }
    if (currentState === 'SUSPICIOUS') {
      return ['firewall'].includes(node.type);
    }
    return false;
  }, [node.type, currentState]);

  const nodeColor = useMemo(() => {
    if (node.type === 'attacker') return '#912018';
    if (isDefenseActive && node.type === 'firewall') return '#0088FF';
    if (isCompromised) return '#FF1744';
    if (currentState === 'WARNING' && node.type === 'app') return '#FFB020';
    return '#00E887';
  }, [node.type, isCompromised, isDefenseActive, currentState]);

  useFrame((state, delta) => {
    if (meshRef.current && isCompromised) {
      meshRef.current.rotation.y += delta * 0.7;
    }
  });

  return (
    <group position={node.position} onClick={() => onNodeClick?.(node.id)}>
      {/* 3D Geometry */}
      {node.type === 'attacker' ? (
        <mesh ref={meshRef}>
          <octahedronGeometry args={[0.55]} />
          <meshStandardMaterial
            color={nodeColor}
            emissive={nodeColor}
            emissiveIntensity={0.8}
            wireframe
          />
        </mesh>
      ) : node.type === 'database' ? (
        <GLTFModel
          url={ModelRegistry.DATABASE}
          fallback={
            <mesh ref={meshRef}>
              <cylinderGeometry args={[0.45, 0.45, 0.9, 24]} />
              <meshStandardMaterial
                color={nodeColor}
                emissive={nodeColor}
                emissiveIntensity={isCompromised ? 0.7 : 0.1}
                metalness={0.8}
                roughness={0.2}
              />
            </mesh>
          }
        />
      ) : node.type === 'firewall' ? (
        <GLTFModel
          url={ModelRegistry.FIREWALL}
          fallback={
            <mesh ref={meshRef}>
              <boxGeometry args={[0.8, 0.9, 0.4]} />
              <meshStandardMaterial
                color={nodeColor}
                emissive={nodeColor}
                emissiveIntensity={isDefenseActive ? 1.0 : isCompromised ? 0.7 : 0.1}
              />
            </mesh>
          }
        />
      ) : node.type === 'router' ? (
        <GLTFModel
          url={ModelRegistry.ROUTER}
          fallback={
            <mesh ref={meshRef}>
              <boxGeometry args={[0.65, 0.65, 0.65]} />
              <meshStandardMaterial
                color={nodeColor}
                emissive={nodeColor}
                emissiveIntensity={isCompromised ? 0.8 : 0.1}
                metalness={0.8}
                roughness={0.3}
              />
            </mesh>
          }
        />
      ) : (
        <GLTFModel
          url={ModelRegistry.SERVER}
          fallback={
            <mesh ref={meshRef}>
              <boxGeometry args={[0.65, 0.65, 0.65]} />
              <meshStandardMaterial
                color={nodeColor}
                emissive={nodeColor}
                emissiveIntensity={isCompromised ? 0.8 : 0.1}
                metalness={0.8}
                roughness={0.3}
              />
            </mesh>
          }
        />
      )}
      
      {/* Alert Sprite for Compromised Nodes */}
      {isCompromised && node.type !== 'attacker' && (
        <AnimatedSprite
          textureUrl={SpriteRegistry.ALERT.path}
          frames={SpriteRegistry.ALERT.frames}
          gridSize={SpriteRegistry.ALERT.gridSize as [number, number]}
          fps={SpriteRegistry.ALERT.fps}
          scale={[1.2, 1.2, 1.2]}
          position={[0, 1.1, 0]}
          color="#FF1744"
        />
      )}

      {/* Primary Label */}
      <Text
        position={[0, 0.85, 0]}
        fontSize={0.24}
        color="#F8FAFC"
        anchorX="center"
        anchorY="bottom"
      >
        {node.name}
      </Text>

      {/* Role Sub-label */}
      <Text
        position={[0, 0.65, 0]}
        fontSize={0.17}
        color={isCompromised ? '#FDA29B' : '#94A3B8'}
        anchorX="center"
        anchorY="top"
      >
        {node.role}
      </Text>
    </group>
  );
}

function AttackChainConnections() {
  const linePoints = useMemo(() => {
    return ATTACK_CHAIN_NODES.map((n) => new THREE.Vector3(...n.position));
  }, []);

  const geometry = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(linePoints);
    return new THREE.TubeGeometry(curve, 64, 0.035, 8, false);
  }, [linePoints]);

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial
        color="#334155"
        emissive="#1E293B"
        emissiveIntensity={0.5}
        metalness={0.8}
        roughness={0.2}
      />
    </mesh>
  );
}

export default function SimulationLab3DScene({
  currentState,
  activeStepIndex,
  isDefenseActive,
  onNodeClick,
}: SimulationLab3DSceneProps) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        background: 'radial-gradient(ellipse at center, #0F172A 0%, #020617 100%)',
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      <Canvas
        camera={{ position: [0, 2.5, 7.5], fov: 48 }}
        gl={{ antialias: true, alpha: false }}
      >
        <color attach="background" args={['#020617']} />
        <ambientLight intensity={0.65} />
        <pointLight position={[0, 6, 4]} intensity={1.4} color="#60A5FA" />
        <pointLight position={[-5, 2, 2]} intensity={1.8} color="#EF4444" />
        <pointLight position={[5, 2, 2]} intensity={1.2} color="#10B981" />

        {/* Attack Pathway and Traveling Packets */}
        <AttackChainConnections />
        <PacketStream currentState={currentState} isDefenseActive={isDefenseActive} />
        <DefenseShield isActive={isDefenseActive} />

        {/* 3D Nodes */}
        {ATTACK_CHAIN_NODES.map((node) => (
          <SceneNode
            key={node.id}
            node={node}
            currentState={currentState}
            isDefenseActive={isDefenseActive}
            onNodeClick={onNodeClick}
          />
        ))}

        <OrbitControls
          enablePan={true}
          enableZoom={true}
          maxPolarAngle={Math.PI / 2 + 0.1}
          minDistance={3}
          maxDistance={14}
        />
      </Canvas>

      {/* Overlay Status Badge */}
      <div
        style={{
          position: 'absolute',
          top: 14,
          left: 16,
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 8,
          padding: '6px 12px',
          color: '#F8FAFC',
          fontSize: 12,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          pointerEvents: 'none',
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor:
              currentState === 'BLOCKED'
                ? '#00D2FF'
                : currentState === 'ALERT'
                ? '#EF4444'
                : currentState === 'WARNING'
                ? '#F59E0B'
                : currentState === 'SUSPICIOUS'
                ? '#EAB308'
                : '#10B981',
            boxShadow: '0 0 8px currentColor',
          }}
        />
        <span>3D Attack Pipeline & Packet Telemetry</span>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 12,
          right: 14,
          color: '#64748B',
          fontSize: 11,
          pointerEvents: 'none',
        }}
      >
        Drag to rotate · Scroll to zoom
      </div>
    </div>
  );
}
