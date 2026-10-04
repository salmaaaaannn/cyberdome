'use client';

import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Float } from '@react-three/drei';
import * as THREE from 'three';
import { DigitalTwinNode, DigitalTwinConnection, ActiveSimulationState } from '@/types';
import { GLTFModel } from './GLTFModel';
import { AnimatedSprite } from './AnimatedSprite';
import { ModelRegistry, SpriteRegistry } from '@/lib/3d/Registries';
import { assetManager } from '@/lib/3d/AssetManager';

interface Node3DProps {
  node: DigitalTwinNode;
  isCompromised: boolean;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

function Node3D({ node, isCompromised, isSelected, onSelect }: Node3DProps) {
  const meshRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  // Position scaled into 3D space
  const position = useMemo<[number, number, number]>(() => {
    const x = (node.position.x - 4) * 1.8;
    const z = (node.position.y - 3) * 1.6;
    const y = node.position.z ? node.position.z : (node.type === 'cloud' ? 1.4 : node.type === 'database' ? 0.3 : 0.6);
    return [x, y, z];
  }, [node.position]);

  // Color scheme - Dark premium cybersecurity aesthetic
  const statusColor = isCompromised
    ? '#FF1744' // Cyber Red
    : node.status === 'CRITICAL'
    ? '#FF1744'
    : node.status === 'WARNING'
    ? '#FFB020' // Amber
    : '#00E887'; // Subtle Green for healthy, though for normal nodes we might use dark metal
    
  const nodeColor = isCompromised || node.status === 'CRITICAL' || node.status === 'WARNING' ? statusColor : '#2A2E33'; // Dark metal base


  useFrame((state, delta) => {
    if (assetManager.isReducedMotion()) return;
    if (ringRef.current && (isCompromised || isSelected)) {
      ringRef.current.rotation.z += delta * 1.5;
      const s = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.15;
      ringRef.current.scale.set(s, s, s);
    }
    if (meshRef.current && isCompromised) {
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 3) * 0.08;
    }
  });

  return (
    <group position={position} ref={meshRef}>
      {/* Visual geometry depending on node type */}
      {node.type === 'database' ? (
        <GLTFModel
          url={ModelRegistry.DATABASE}
          onClick={(e: any) => { e.stopPropagation(); onSelect(node.id); }}
          fallback={
            <mesh onClick={(e) => { e.stopPropagation(); onSelect(node.id); }} castShadow>
              <cylinderGeometry args={[0.45, 0.45, 0.8, 24]} />
              <meshStandardMaterial
                color={nodeColor}
                metalness={0.8}
                roughness={0.2}
                emissive={statusColor}
                emissiveIntensity={isCompromised ? 0.8 : 0.1}
              />
            </mesh>
          }
        />
      ) : node.type === 'server' ? (
        <GLTFModel
          url={ModelRegistry.SERVER}
          onClick={(e: any) => { e.stopPropagation(); onSelect(node.id); }}
          fallback={
            <mesh onClick={(e) => { e.stopPropagation(); onSelect(node.id); }} castShadow>
              <boxGeometry args={[0.7, 0.9, 0.7]} />
              <meshStandardMaterial
                color={nodeColor}
                metalness={0.8}
                roughness={0.3}
                emissive={statusColor}
                emissiveIntensity={isCompromised ? 0.8 : 0.1}
              />
            </mesh>
          }
        />
      ) : node.type === 'cloud' ? (
        <GLTFModel
          url={ModelRegistry.CLOUD}
          onClick={(e: any) => { e.stopPropagation(); onSelect(node.id); }}
          fallback={
            <mesh onClick={(e) => { e.stopPropagation(); onSelect(node.id); }} castShadow>
              <sphereGeometry args={[0.55, 32, 32]} />
              <meshStandardMaterial
                color={nodeColor}
                metalness={0.3}
                roughness={0.5}
                emissive={statusColor}
                emissiveIntensity={isCompromised ? 0.9 : 0.1}
                wireframe={!isCompromised}
              />
            </mesh>
          }
        />
      ) : node.type === 'firewall' ? (
        <GLTFModel
          url={ModelRegistry.FIREWALL}
          onClick={(e: any) => { e.stopPropagation(); onSelect(node.id); }}
          fallback={
            <mesh onClick={(e) => { e.stopPropagation(); onSelect(node.id); }} castShadow>
              <boxGeometry args={[0.9, 0.7, 0.25]} />
              <meshStandardMaterial
                color={nodeColor}
                metalness={0.9}
                roughness={0.4}
                emissive={statusColor}
                emissiveIntensity={0.6}
              />
            </mesh>
          }
        />
      ) : (
        <GLTFModel
          url={ModelRegistry.WORKSTATION} // Default to workstation or generic
          onClick={(e: any) => { e.stopPropagation(); onSelect(node.id); }}
          fallback={
            <mesh onClick={(e) => { e.stopPropagation(); onSelect(node.id); }} castShadow>
              <octahedronGeometry args={[0.5, 0]} />
              <meshStandardMaterial
                color={nodeColor}
                metalness={0.8}
                roughness={0.3}
                emissive={statusColor}
                emissiveIntensity={isCompromised ? 0.8 : 0.1}
              />
            </mesh>
          }
        />
      )}

      {/* Security Alert Sprite for Compromised Nodes */}
      {isCompromised && (
        <AnimatedSprite
          textureUrl={SpriteRegistry.ALERT.path}
          frames={SpriteRegistry.ALERT.frames}
          gridSize={SpriteRegistry.ALERT.gridSize as [number, number]}
          fps={SpriteRegistry.ALERT.fps}
          scale={[1.5, 1.5, 1.5]}
          position={[0, 1.2, 0]}
          color="#FF1744"
        />
      )}

      {/* Pulsing indicator ring for compromised/selected node */}
      {(isCompromised || isSelected) && (
        <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.4, 0]}>
          <ringGeometry args={[0.6, 0.75, 32]} />
          <meshBasicMaterial color={statusColor} transparent opacity={0.8} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Native WebGL 3D Floating Label */}
      <Text
        fontSize={0.24}
        color={isCompromised ? '#FF1744' : isSelected ? '#0070F3' : '#8B949E'}
        position={[0, 0.8, 0]}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#0D1117"
      >
        {isCompromised ? `⚡ ${node.label}` : node.label}
      </Text>
    </group>
  );
}

function ConnectionLine3D({
  conn,
  nodes,
  isAttackActive,
}: {
  conn: DigitalTwinConnection;
  nodes: DigitalTwinNode[];
  isAttackActive: boolean;
}) {
  const src = nodes.find((n) => n.id === conn.source);
  const tgt = nodes.find((n) => n.id === conn.target);

  const points = useMemo(() => {
    if (!src || !tgt) return null;
    const p1 = new THREE.Vector3(
      (src.position.x - 4) * 1.8,
      src.position.z ? src.position.z : 0.5,
      (src.position.y - 3) * 1.6
    );
    const p2 = new THREE.Vector3(
      (tgt.position.x - 4) * 1.8,
      tgt.position.z ? tgt.position.z : 0.5,
      (tgt.position.y - 3) * 1.6
    );
    return [p1, p2];
  }, [src, tgt]);

  const lineColor = isAttackActive
    ? '#FF1744'
    : conn.type === 'attack_path'
    ? '#FF1744'
    : conn.type === 'trust'
    ? '#A855F7'
    : '#30363D'; // Darker line for connections

  const lineObject = useMemo(() => {
    if (!points) return null;
    const g = new THREE.BufferGeometry().setFromPoints(points);
    const m = new THREE.LineBasicMaterial({
      color: lineColor,
      transparent: true,
      opacity: isAttackActive ? 0.9 : 0.4,
    });
    return new THREE.Line(g, m);
  }, [points, lineColor, isAttackActive]);

  if (!lineObject) return null;

  return (
    <group>
      <primitive object={lineObject} />
      {/* Sprite for data packets flowing - mock placement at midpoint */}
      {points && !isAttackActive && (
        <AnimatedSprite
          textureUrl={SpriteRegistry.NETWORK_PACKET.path}
          frames={SpriteRegistry.NETWORK_PACKET.frames}
          gridSize={SpriteRegistry.NETWORK_PACKET.gridSize as [number, number]}
          fps={SpriteRegistry.NETWORK_PACKET.fps}
          scale={[0.4, 0.4, 0.4]}
          position={[
            (points[0].x + points[1].x) / 2,
            (points[0].y + points[1].y) / 2,
            (points[0].z + points[1].z) / 2
          ]}
          color="#00E887"
        />
      )}
    </group>
  );
}

interface DigitalTwin3DSceneProps {
  nodes: DigitalTwinNode[];
  connections: DigitalTwinConnection[];
  selectedNodeId: string | null;
  onSelectNode: (id: string) => void;
  activeSimulation: ActiveSimulationState | null;
}

export default function DigitalTwin3DScene({
  nodes,
  connections,
  selectedNodeId,
  onSelectNode,
  activeSimulation,
}: DigitalTwin3DSceneProps) {
  const compromisedIds = activeSimulation?.compromisedNodeIds || [];

  return (
    <div style={{ width: '100%', height: '100%', minHeight: 520, position: 'relative' }}>
      <Canvas
        camera={{ position: [0, 6, 8], fov: 42 }}
        shadows={{ type: THREE.PCFShadowMap }}
        style={{ background: '#090A0C', borderRadius: 8 }} // Dark premium background
      >
        <ambientLight intensity={0.4} color="#ffffff" />
        <directionalLight position={[10, 15, 10]} intensity={1.5} color="#e0e7ff" castShadow />
        <pointLight position={[-10, -5, -10]} intensity={0.6} color="#FF1744" />
        <pointLight position={[0, 2, 0]} intensity={0.3} color="#00e887" />

        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          maxPolarAngle={Math.PI / 2.05}
          minDistance={3}
          maxDistance={18}
        />

        {/* Cyber Ground Grid - Dark Mode */}
        <gridHelper args={[24, 24, '#1F2937', '#111827']} position={[0, -0.01, 0]} />

        {/* 3D Connection Lines */}
        {connections.map((conn) => {
          const isAttack =
            conn.type === 'attack_path' ||
            (compromisedIds.includes(conn.source) && compromisedIds.includes(conn.target));
          return (
            <ConnectionLine3D
              key={conn.id}
              conn={conn}
              nodes={nodes}
              isAttackActive={isAttack}
            />
          );
        })}

        {/* 3D Infrastructure Nodes */}
        {nodes.map((node) => {
          const isCompromised = compromisedIds.includes(node.id);
          const isSelected = selectedNodeId === node.id;
          return (
            <Node3D
              key={node.id}
              node={node}
              isCompromised={isCompromised}
              isSelected={isSelected}
              onSelect={onSelectNode}
            />
          );
        })}
      </Canvas>
    </div>
  );
}
