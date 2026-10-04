export const ModelRegistry = {
  SERVER: '/3d/models/infrastructure/server.glb',
  ROUTER: '/3d/models/network/router.glb',
  FIREWALL: '/3d/models/network/firewall.glb',
  IOT_CAMERA: '/3d/models/iot/camera.glb',
  DATABASE: '/3d/models/infrastructure/database.glb',
  CLOUD: '/3d/models/network/cloud.glb',
  WORKSTATION: '/3d/models/endpoints/workstation.glb',
  NETWORK_SWITCH: '/3d/models/network/switch.glb',
  CYBERDOME_CORE: '/3d/models/security/cyberdome_core.glb',
  SERVER_RACK: '/3d/models/infrastructure/server_rack.glb',
};

export const TextureRegistry = {
  TECH_FLOOR: '/3d/textures/environment/floor.webp',
  TECH_WALL: '/3d/textures/environment/wall.webp',
  CARBON_PANEL: '/3d/textures/infrastructure/carbon.webp',
  DARK_METAL: '/3d/textures/infrastructure/dark_metal.webp',
  SERVER_METAL: '/3d/textures/infrastructure/server_metal.webp',
};

export const SpriteRegistry = {
  ALERT: {
    path: '/3d/sprites/alerts/alert_sheet.png',
    frames: 16,
    gridSize: [4, 4],
    fps: 30,
  },
  NETWORK_PACKET: {
    path: '/3d/sprites/network/packet_sheet.png',
    frames: 16,
    gridSize: [4, 4],
    fps: 30,
  },
  SCAN_PULSE: {
    path: '/3d/sprites/scanning/scan_sheet.png',
    frames: 16,
    gridSize: [4, 4],
    fps: 30,
  },
  SHIELD_PULSE: {
    path: '/3d/sprites/security/shield_sheet.png',
    frames: 16,
    gridSize: [4, 4],
    fps: 30,
  },
};
