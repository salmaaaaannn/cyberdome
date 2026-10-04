import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TextureLoader } from 'three';

interface AnimatedSpriteProps {
  textureUrl: string;
  frames: number;
  gridSize: [number, number]; // [columns, rows]
  fps?: number;
  loop?: boolean;
  scale?: [number, number, number];
  position?: [number, number, number];
  color?: string;
  opacity?: number;
}

export function AnimatedSprite({
  textureUrl,
  frames,
  gridSize,
  fps = 30,
  loop = true,
  scale = [1, 1, 1],
  position = [0, 0, 0],
  color = '#ffffff',
  opacity = 1.0,
}: AnimatedSpriteProps) {
  const materialRef = useRef<THREE.SpriteMaterial>(null);
  
  const texture = useMemo(() => {
    const loader = new TextureLoader();
    try {
      const tex = loader.load(textureUrl);
      tex.colorSpace = THREE.SRGBColorSpace;
      // Define how much of the texture one frame takes
      tex.repeat.set(1 / gridSize[0], 1 / gridSize[1]);
      return tex;
    } catch (err) {
      console.warn(`Failed to load sprite texture at ${textureUrl}`);
      return null;
    }
  }, [textureUrl, gridSize]);

  const state = useRef({
    currentFrame: 0,
    elapsedTime: 0,
  });

  useFrame((_, delta) => {
    if (!texture || !materialRef.current) return;

    state.current.elapsedTime += delta;
    const timePerFrame = 1 / fps;

    if (state.current.elapsedTime >= timePerFrame) {
      state.current.elapsedTime = 0;
      state.current.currentFrame++;

      if (state.current.currentFrame >= frames) {
        if (loop) {
          state.current.currentFrame = 0;
        } else {
          state.current.currentFrame = frames - 1; // stay on last frame
        }
      }

      const column = state.current.currentFrame % gridSize[0];
      const row = gridSize[1] - 1 - Math.floor(state.current.currentFrame / gridSize[0]);

      texture.offset.x = column / gridSize[0];
      texture.offset.y = row / gridSize[1];
    }
  });

  if (!texture) {
    // Return a simple colored square fallback if texture fails
    return (
      <sprite position={new THREE.Vector3(...position)} scale={new THREE.Vector3(...scale)}>
        <spriteMaterial color={color} opacity={opacity} transparent />
      </sprite>
    );
  }

  return (
    <sprite position={new THREE.Vector3(...position)} scale={new THREE.Vector3(...scale)}>
      <spriteMaterial
        ref={materialRef}
        map={texture}
        color={color}
        transparent
        opacity={opacity}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </sprite>
  );
}
