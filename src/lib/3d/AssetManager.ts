'use client';

import * as THREE from 'three';
import { GLTFLoader } from 'three-stdlib';
import { ModelRegistry, TextureRegistry, SpriteRegistry } from './Registries';

export type QualityLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface QualitySettings {
  level: QualityLevel;
  shadows: boolean;
  antialias: boolean;
  pixelRatio: number;
  textureAnisotropy: number;
}

export const QUALITY_PRESETS: Record<QualityLevel, QualitySettings> = {
  LOW: {
    level: 'LOW',
    shadows: false,
    antialias: false,
    pixelRatio: 1.0,
    textureAnisotropy: 1,
  },
  MEDIUM: {
    level: 'MEDIUM',
    shadows: true,
    antialias: true,
    pixelRatio: 1.5,
    textureAnisotropy: 4,
  },
  HIGH: {
    level: 'HIGH',
    shadows: true,
    antialias: true,
    pixelRatio: 2.0,
    textureAnisotropy: 8,
  },
};

class AssetManager {
  private static instance: AssetManager;
  private loadingManager: THREE.LoadingManager;
  private gltfLoader: GLTFLoader;
  private textureLoader: THREE.TextureLoader;
  private modelCache: Map<string, THREE.Group> = new Map();
  private textureCache: Map<string, THREE.Texture> = new Map();
  private quality: QualitySettings = QUALITY_PRESETS.HIGH;
  private reducedMotion: boolean = false;

  private constructor() {
    this.loadingManager = new THREE.LoadingManager();
    this.loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
      // Internal progress tracking
    };
    this.loadingManager.onError = (url) => {
      console.warn(`[AssetManager] Asset failed to load: ${url}`);
    };

    this.gltfLoader = new GLTFLoader(this.loadingManager);
    this.textureLoader = new THREE.TextureLoader(this.loadingManager);

    if (typeof window !== 'undefined') {
      this.reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false;
      const savedQuality = (localStorage.getItem('cyberdome_3d_quality') as QualityLevel) || 'HIGH';
      this.setQuality(savedQuality);
    }
  }

  public static getInstance(): AssetManager {
    if (!AssetManager.instance) {
      AssetManager.instance = new AssetManager();
    }
    return AssetManager.instance;
  }

  public getQuality(): QualitySettings {
    return this.quality;
  }

  public setQuality(level: QualityLevel): void {
    this.quality = QUALITY_PRESETS[level] || QUALITY_PRESETS.HIGH;
    if (typeof window !== 'undefined') {
      localStorage.setItem('cyberdome_3d_quality', level);
    }
  }

  public isReducedMotion(): boolean {
    return this.reducedMotion;
  }

  public async loadModel(url: string): Promise<THREE.Group> {
    if (this.modelCache.has(url)) {
      return this.modelCache.get(url)!.clone();
    }

    return new Promise((resolve, reject) => {
      this.gltfLoader.load(
        url,
        (gltf) => {
          const scene = gltf.scene;
          scene.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              const mesh = child as THREE.Mesh;
              mesh.castShadow = this.quality.shadows;
              mesh.receiveShadow = this.quality.shadows;
            }
          });
          this.modelCache.set(url, scene);
          resolve(scene.clone());
        },
        undefined,
        (error) => reject(error)
      );
    });
  }

  public async loadTexture(url: string): Promise<THREE.Texture> {
    if (this.textureCache.has(url)) {
      return this.textureCache.get(url)!;
    }

    return new Promise((resolve, reject) => {
      this.textureLoader.load(
        url,
        (texture) => {
          texture.anisotropy = this.quality.textureAnisotropy;
          this.textureCache.set(url, texture);
          resolve(texture);
        },
        undefined,
        (err) => reject(err)
      );
    });
  }

  public async preloadAll(): Promise<void> {
    const modelUrls = Object.values(ModelRegistry);
    await Promise.allSettled(modelUrls.map((u) => this.loadModel(u)));
  }

  public disposeObject(obj: THREE.Object3D): void {
    obj.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => m.dispose());
          } else {
            mesh.material.dispose();
          }
        }
      }
    });
  }
}

export const assetManager = AssetManager.getInstance();
