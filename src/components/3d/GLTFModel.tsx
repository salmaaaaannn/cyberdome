'use client';

import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { assetManager } from '@/lib/3d/AssetManager';

interface GLTFModelProps {
  url: string;
  fallback?: React.ReactNode;
  [key: string]: any; // allow other group/mesh props
}

export function GLTFModel({ url, fallback, ...props }: GLTFModelProps) {
  const [model, setModel] = useState<THREE.Group | null>(null);
  const [error, setError] = useState<boolean>(false);
  const loadedModelRef = useRef<THREE.Group | null>(null);

  useEffect(() => {
    let active = true;

    assetManager
      .loadModel(url)
      .then((scene) => {
        if (!active) {
          assetManager.disposeObject(scene);
          return;
        }
        loadedModelRef.current = scene;
        setModel(scene);
        setError(false);
      })
      .catch((err) => {
        if (active) {
          console.warn(`[GLTFModel] Falling back to procedural geometry for ${url}:`, err?.message || err);
          setError(true);
        }
      });

    return () => {
      active = false;
      if (loadedModelRef.current) {
        assetManager.disposeObject(loadedModelRef.current);
        loadedModelRef.current = null;
      }
    };
  }, [url]);

  if (model && !error) {
    return <primitive object={model} {...props} />;
  }

  if (fallback) {
    return <group {...props}>{fallback}</group>;
  }

  return null;
}
