import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Activity, Bitcoin, Flame, Globe2, Plane, RadioTower } from "lucide-react";
import * as THREE from "three";
import countriesGeoJson from "./data/countries.geo.json";
import "./styles.css";

const DATASETS = {
  earthquakes: {
    label: "Terremoti live",
    endpoint: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson",
    accent: "#ffcb64"
  },
  internet: {
    label: "Internet BGP",
    endpoint: "https://stat.ripe.net/data/bgp-updates/data.json",
    accent: "#54f2ff"
  },
  eonet: {
    label: "NASA EONET",
    endpoint: "https://eonet.gsfc.nasa.gov/api/v3/events?status=open&days=45&limit=90",
    accent: "#ff6b4a"
  },
  flights: {
    label: "Voli live",
    endpoint: "https://opensky-network.org/api/states/all",
    accent: "#b4ff5f"
  },
  markets: {
    label: "Crypto mercati",
    endpoint: "https://api.coingecko.com/api/v3/simple/price",
    accent: "#d8f35a"
  }
};

const NETWORKS = [
  { name: "Cloudflare DNS", resource: "1.1.1.0/24", lat: 37.77, lon: -122.42, peerLat: 50.11, peerLon: 8.68 },
  { name: "Google DNS", resource: "8.8.8.0/24", lat: 37.42, lon: -122.08, peerLat: 35.68, peerLon: 139.69 },
  { name: "Quad9 DNS", resource: "9.9.9.0/24", lat: 47.37, lon: 8.54, peerLat: 51.5, peerLon: -0.12 },
  { name: "OpenDNS", resource: "208.67.222.0/24", lat: 37.77, lon: -122.42, peerLat: 1.35, peerLon: 103.82 },
  { name: "RIPE NCC", resource: "193.0.0.0/21", lat: 52.37, lon: 4.9, peerLat: 25.2, peerLon: 55.27 },
  { name: "Verisign DNS", resource: "64.6.64.0/24", lat: 38.95, lon: -77.45, peerLat: 51.5, peerLon: -0.12 },
  { name: "Lumen DNS", resource: "4.2.2.0/24", lat: 39.74, lon: -104.99, peerLat: 50.11, peerLon: 8.68 },
  { name: "NTT Backbone", resource: "129.250.0.0/16", lat: 35.68, lon: 139.69, peerLat: 37.77, peerLon: -122.42 },
  { name: "Hurricane Electric", resource: "216.218.128.0/17", lat: 37.55, lon: -121.99, peerLat: 52.37, peerLon: 4.9 },
  { name: "Arelion", resource: "62.115.0.0/16", lat: 59.33, lon: 18.07, peerLat: 40.71, peerLon: -74.0 },
  { name: "APNIC", resource: "202.12.28.0/24", lat: -27.47, lon: 153.02, peerLat: 1.35, peerLon: 103.82 },
  { name: "K-root", resource: "193.0.14.0/24", lat: 52.37, lon: 4.9, peerLat: -23.55, peerLon: -46.63 }
];

const MARKET_HUBS = [
  { name: "New York", lat: 40.71, lon: -74.0 },
  { name: "London", lat: 51.5, lon: -0.12 },
  { name: "Frankfurt", lat: 50.11, lon: 8.68 },
  { name: "Dubai", lat: 25.2, lon: 55.27 },
  { name: "Singapore", lat: 1.35, lon: 103.82 },
  { name: "Hong Kong", lat: 22.31, lon: 114.17 },
  { name: "Tokyo", lat: 35.68, lon: 139.69 },
  { name: "Sydney", lat: -33.86, lon: 151.2 }
];

const CRYPTO_ASSETS = [
  { id: "bitcoin", symbol: "BTC" },
  { id: "ethereum", symbol: "ETH" },
  { id: "solana", symbol: "SOL" },
  { id: "ripple", symbol: "XRP" },
  { id: "binancecoin", symbol: "BNB" },
  { id: "cardano", symbol: "ADA" },
  { id: "dogecoin", symbol: "DOGE" },
  { id: "chainlink", symbol: "LINK" }
];

function latLonToVector3(lat, lon, radius = 2) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

function makeArc(start, end, color, altitude = 0.55, intensity = 0.6) {
  const mid = start.clone().add(end).multiplyScalar(0.5);
  mid.normalize().multiplyScalar(2 + altitude);
  const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
  const points = curve.getPoints(64);
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const group = new THREE.Group();
  group.userData.kind = "trafficArc";

  group.add(new THREE.Line(
    geometry,
    new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.24 + intensity * 0.34,
      blending: THREE.AdditiveBlending
    })
  ));

  const pulseCount = Math.max(2, Math.round(2 + intensity * 5));
  for (let index = 0; index < pulseCount; index += 1) {
    const packet = new THREE.Mesh(
      new THREE.SphereGeometry(0.025 + intensity * 0.015, 16, 16),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending
      })
    );
    packet.userData.kind = "trafficPacket";
    packet.userData.curve = curve;
    packet.userData.offset = index / pulseCount;
    packet.userData.speed = 0.05 + intensity * 0.12;
    packet.userData.phase = Math.random();
    packet.position.copy(curve.getPoint(packet.userData.offset));
    group.add(packet);
  }

  return group;
}

function makeFlightCorridor(start, end, color, intensity = 0.55) {
  const mid = start.clone().add(end).multiplyScalar(0.5);
  mid.normalize().multiplyScalar(2.14 + intensity * 0.18);
  const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
  const points = curve.getPoints(28);
  const group = new THREE.Group();
  group.userData.kind = "flightCorridor";

  group.add(
    new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(points),
      new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: 0.16 + intensity * 0.28,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    )
  );

  const pulseCount = Math.max(1, Math.round(1 + intensity * 3));
  for (let index = 0; index < pulseCount; index += 1) {
    const pulse = new THREE.Mesh(
      new THREE.SphereGeometry(0.018 + intensity * 0.014, 14, 14),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
      })
    );
    pulse.userData.kind = "flightPulse";
    pulse.userData.curve = curve;
    pulse.userData.offset = index / pulseCount;
    pulse.userData.speed = 0.12 + intensity * 0.22;
    pulse.userData.phase = Math.random();
    pulse.position.copy(curve.getPoint(pulse.userData.offset));
    group.add(pulse);
  }

  return group;
}

function buildCountryBorders(geojson) {
  const vertices = [];
  const borderRadius = 2.07;

  const interpolateLon = (from, to, progress) => {
    let delta = to - from;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    return from + delta * progress;
  };

  const addRing = (ring) => {
    for (let index = 0; index < ring.length - 1; index += 1) {
      const [lonA, latA] = ring[index];
      const [lonB, latB] = ring[index + 1];
      if (Math.abs(lonA - lonB) > 180) continue;

      const distance = Math.max(Math.abs(latA - latB), Math.abs(lonA - lonB));
      const steps = Math.max(1, Math.ceil(distance / 1.8));

      for (let step = 0; step < steps; step += 1) {
        const startProgress = step / steps;
        const endProgress = (step + 1) / steps;
        const startLat = THREE.MathUtils.lerp(latA, latB, startProgress);
        const endLat = THREE.MathUtils.lerp(latA, latB, endProgress);
        const startLon = interpolateLon(lonA, lonB, startProgress);
        const endLon = interpolateLon(lonA, lonB, endProgress);
        const start = latLonToVector3(startLat, startLon, borderRadius);
        const end = latLonToVector3(endLat, endLon, borderRadius);
        vertices.push(start.x, start.y, start.z, end.x, end.y, end.z);
      }
    }
  };

  geojson.features.forEach((feature) => {
    const { type, coordinates } = feature.geometry || {};
    if (type === "Polygon") {
      coordinates.forEach(addRing);
    }

    if (type === "MultiPolygon") {
      coordinates.forEach((polygon) => polygon.forEach(addRing));
    }
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));

  const borders = new THREE.LineSegments(
    geometry,
    new THREE.LineBasicMaterial({
      color: 0x7ee7ff,
      transparent: true,
      opacity: 0.82,
      blending: THREE.AdditiveBlending,
      depthTest: true,
      depthWrite: false
    })
  );
  borders.renderOrder = 4;
  return borders;
}

function buildEarthMapTexture(geojson) {
  const width = 2048;
  const height = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");

  const project = ([lon, lat]) => [((lon + 180) / 360) * width, ((90 - lat) / 180) * height];

  const addRingToPath = (ring) => {
    ring.forEach((coordinate, index) => {
      const [x, y] = project(coordinate);
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.closePath();
  };

  const oceanGradient = context.createLinearGradient(0, 0, width, height);
  oceanGradient.addColorStop(0, "#020711");
  oceanGradient.addColorStop(0.48, "#052033");
  oceanGradient.addColorStop(1, "#01040a");
  context.fillStyle = oceanGradient;
  context.fillRect(0, 0, width, height);

  context.shadowColor = "rgba(86, 242, 255, 0.55)";
  context.shadowBlur = 8;
  context.fillStyle = "#3fd2b4";
  context.strokeStyle = "#e2ffff";
  context.lineWidth = 1.7;

  geojson.features.forEach((feature) => {
    const { type, coordinates } = feature.geometry || {};
    if (type === "Polygon") {
      context.beginPath();
      coordinates.forEach(addRingToPath);
      context.fill("evenodd");
      context.stroke();
    }

    if (type === "MultiPolygon") {
      coordinates.forEach((polygon) => {
        context.beginPath();
        polygon.forEach(addRingToPath);
        context.fill("evenodd");
        context.stroke();
      });
    }
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

function parseEarthquakes(payload) {
  return payload.features
    .filter((feature) => feature.geometry?.coordinates?.length >= 2)
    .slice(0, 120)
    .map((feature) => ({
      type: "point",
      label: feature.properties.place || "USGS event",
      lat: feature.geometry.coordinates[1],
      lon: feature.geometry.coordinates[0],
      intensity: Math.max(0.2, Math.min(1, (feature.properties.mag || 1) / 7)),
      value: `${(feature.properties.mag || 0).toFixed(1)}M`
    }));
}

function firstCoordinatePair(coordinates) {
  if (!Array.isArray(coordinates)) return null;
  if (coordinates.length >= 2 && typeof coordinates[0] === "number" && typeof coordinates[1] === "number") {
    return coordinates;
  }

  for (const child of coordinates) {
    const pair = firstCoordinatePair(child);
    if (pair) return pair;
  }

  return null;
}

function parseEonet(payload) {
  return (payload.events || [])
    .map((event) => {
      const geometry = event.geometry?.at(-1);
      const pair = firstCoordinatePair(geometry?.coordinates);
      if (!pair) return null;

      const category = event.categories?.[0]?.title || "Natural event";
      const daysOld = geometry?.date ? Math.max(0, (Date.now() - new Date(geometry.date).getTime()) / 86400000) : 8;
      const freshness = Math.max(0.25, 1 - daysOld / 45);

      return {
        type: "point",
        label: event.title || "NASA EONET event",
        lat: pair[1],
        lon: pair[0],
        intensity: freshness,
        value: category
      };
    })
    .filter(Boolean)
    .slice(0, 90);
}

function parseFlights(payload) {
  return (payload.states || [])
    .filter((state) => Number.isFinite(state[5]) && Number.isFinite(state[6]))
    .filter((state) => Number.isFinite(state[10]))
    .slice(0, 140)
    .map((state) => {
      const velocity = Number(state[9] || 0);
      const heading = Number(state[10] || 0);
      const altitude = Number(state[7] || state[13] || 0);
      const callsign = String(state[1] || state[0] || "Aircraft").trim();
      const distance = 2.5 + Math.min(6, velocity / 85);
      const headingRad = THREE.MathUtils.degToRad(heading);
      const targetLat = THREE.MathUtils.clamp(state[6] + Math.cos(headingRad) * distance, -84, 84);
      const targetLon = ((state[5] + Math.sin(headingRad) * distance + 540) % 360) - 180;

      return {
        type: "flightArc",
        label: callsign || "Aircraft",
        from: { lat: state[6], lon: state[5] },
        to: { lat: targetLat, lon: targetLon },
        intensity: Math.max(0.25, Math.min(1, velocity / 280)),
        value: `${Math.round(velocity * 3.6)} km/h · ${Math.round(altitude)} m`
      };
    });
}

function parseMarkets(payload) {
  return CRYPTO_ASSETS.flatMap((asset, index) => {
    const market = payload[asset.id];
    if (!market) return [];

    const source = MARKET_HUBS[index % MARKET_HUBS.length];
    const target = MARKET_HUBS[(index + 3) % MARKET_HUBS.length];
    const change = Number(market.usd_24h_change || 0);
    const volume = Number(market.usd_24h_vol || 0);
    const intensity = Math.max(0.25, Math.min(1, Math.abs(change) / 8 + Math.log10(Math.max(volume, 1)) / 24));
    const price = Number(market.usd || 0);
    const sign = change >= 0 ? "+" : "";

    return [
      {
        type: "arc",
        label: `${asset.symbol} market flow`,
        from: source,
        to: target,
        intensity,
        value: `${sign}${change.toFixed(2)}%`
      },
      {
        type: "point",
        label: asset.symbol,
        lat: source.lat,
        lon: source.lon,
        intensity,
        value: `$${price >= 100 ? price.toLocaleString("en-US", { maximumFractionDigits: 0 }) : price.toFixed(2)}`
      }
    ];
  });
}

function parseBgpSignals(results) {
  return results.flatMap(({ network, payload }) => {
    const updates = payload?.data?.updates || [];
    const announcements = updates.filter((update) => update.type === "A").length;
    const withdrawals = updates.filter((update) => update.type === "W").length;
    const total = Math.max(announcements + withdrawals, updates.length);
    const intensity = Math.max(0.25, Math.min(1, total / 24));

    return [
      {
        type: "arc",
        label: `${network.name} BGP path`,
        from: { lat: network.lat, lon: network.lon },
        to: { lat: network.peerLat, lon: network.peerLon },
        intensity,
        announcements,
        withdrawals,
        value: `${total} updates`
      },
      {
        type: "point",
        label: network.name,
        lat: network.lat,
        lon: network.lon,
        intensity,
        value: `${announcements}A/${withdrawals}W`
      }
    ];
  });
}

function fallbackBgpSignals() {
  return parseBgpSignals(
    NETWORKS.map((network, index) => ({
      network,
      payload: {
        data: {
          updates: Array.from({ length: 4 + index * 3 }, (_, updateIndex) => ({
            type: updateIndex % 4 === 0 ? "W" : "A"
          }))
        }
      }
    }))
  );
}

async function readJson(url) {
  if (window.liveData?.json) return window.liveData.json(url);
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

function GlobeScene({ dataset, points, accent }) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x020409, 0.035);

    const camera = new THREE.PerspectiveCamera(45, mount.clientWidth / mount.clientHeight, 0.1, 100);
    camera.position.set(0, 0.3, 6.2);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setClearColor(0x020409, 1);
    mount.appendChild(renderer.domElement);

    const globe = new THREE.Group();
    scene.add(globe);

    const earth = new THREE.Mesh(
      new THREE.SphereGeometry(2, 96, 96),
      new THREE.MeshStandardMaterial({
        map: buildEarthMapTexture(countriesGeoJson),
        color: 0xffffff,
        metalness: 0.04,
        roughness: 0.62,
        emissive: 0x071827,
        emissiveIntensity: 0.22,
        transparent: false,
        opacity: 1,
        depthWrite: true
      })
    );
    globe.add(earth);

    const wire = new THREE.Mesh(
      new THREE.SphereGeometry(2.012, 64, 64),
      new THREE.MeshBasicMaterial({
      color: 0x2cd7ff,
      wireframe: true,
      transparent: true,
      opacity: 0.018
      })
    );
    globe.add(wire);

    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(2.08, 96, 96),
      new THREE.MeshBasicMaterial({
      color: 0x3fdcff,
      transparent: true,
      opacity: 0.075,
        blending: THREE.AdditiveBlending
      })
    );
    globe.add(atmosphere);

    const countryLayer = new THREE.Group();
    globe.add(countryLayer);
    countryLayer.add(buildCountryBorders(countriesGeoJson));

    const starsGeometry = new THREE.BufferGeometry();
    const starPositions = [];
    for (let i = 0; i < 1200; i += 1) {
      const r = 18 + Math.random() * 24;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPositions.push(r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi));
    }
    starsGeometry.setAttribute("position", new THREE.Float32BufferAttribute(starPositions, 3));
    scene.add(
      new THREE.Points(
        starsGeometry,
        new THREE.PointsMaterial({ color: 0x9fc6d7, size: 0.022, transparent: true, opacity: 0.55 })
      )
    );

    scene.add(new THREE.AmbientLight(0x7aa8ff, 0.42));
    const sun = new THREE.DirectionalLight(0xffffff, 2.2);
    sun.position.set(4, 2, 5);
    scene.add(sun);

    const dataLayer = new THREE.Group();
    globe.add(dataLayer);
    sceneRef.current = { camera, renderer, globe, dataLayer, targetZoom: 6.2, isDragging: false };

    let lastX = 0;
    let lastY = 0;
    const onPointerDown = (event) => {
      sceneRef.current.isDragging = true;
      lastX = event.clientX;
      lastY = event.clientY;
    };
    const onPointerMove = (event) => {
      if (!sceneRef.current.isDragging) return;
      const dx = event.clientX - lastX;
      const dy = event.clientY - lastY;
      globe.rotation.y += dx * 0.005;
      globe.rotation.x += dy * 0.003;
      globe.rotation.x = THREE.MathUtils.clamp(globe.rotation.x, -1.15, 1.15);
      lastX = event.clientX;
      lastY = event.clientY;
    };
    const onPointerUp = () => {
      sceneRef.current.isDragging = false;
    };
    const onWheel = (event) => {
      sceneRef.current.targetZoom = THREE.MathUtils.clamp(sceneRef.current.targetZoom + event.deltaY * 0.003, 3.25, 8.5);
    };
    const onResize = () => {
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };

    mount.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    mount.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("resize", onResize);

    let raf = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      const elapsed = performance.now() * 0.001;
      if (!sceneRef.current.isDragging) globe.rotation.y += 0.0009;
      camera.position.z = THREE.MathUtils.lerp(camera.position.z, sceneRef.current.targetZoom, 0.08);
      atmosphere.rotation.y -= 0.0007;
      dataLayer.traverse((object) => {
        if (object.userData.kind === "trafficPacket") {
          const progress = (elapsed * object.userData.speed + object.userData.offset + object.userData.phase) % 1;
          object.position.copy(object.userData.curve.getPoint(progress));
          object.material.opacity = 0.35 + Math.sin(progress * Math.PI) * 0.65;
        }

        if (object.userData.kind === "quakeRing" || object.userData.kind === "eventRing") {
          const pulse = (elapsed * object.userData.speed + object.userData.phase) % 1;
          const scale = 0.45 + pulse * (1.9 + object.userData.intensity * 1.6);
          object.scale.setScalar(scale);
          object.material.opacity = (1 - pulse) * (0.18 + object.userData.intensity * 0.42);
        }

        if (object.userData.kind === "quakeCore" || object.userData.kind === "eventCore") {
          const pulse = 0.72 + Math.sin(elapsed * object.userData.speed + object.userData.phase) * 0.28;
          object.scale.setScalar(pulse);
          object.material.opacity = 0.62 + pulse * 0.28;
        }

        if (object.userData.kind === "flightPulse") {
          const progress = (elapsed * object.userData.speed + object.userData.offset + object.userData.phase) % 1;
          object.position.copy(object.userData.curve.getPoint(progress));
          object.material.opacity = 0.18 + Math.sin(progress * Math.PI) * 0.72;
        }
      });
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      mount.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      mount.removeEventListener("wheel", onWheel);
      window.removeEventListener("resize", onResize);
      mount.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, []);

  useEffect(() => {
    const state = sceneRef.current;
    if (!state) return;
    state.dataLayer.clear();

    points.forEach((item) => {
      if (item.type === "arc") {
        const start = latLonToVector3(item.from.lat, item.from.lon, 2.04);
        const end = latLonToVector3(item.to.lat, item.to.lon, 2.04);
        state.dataLayer.add(makeArc(start, end, accent, 0.36 + item.intensity * 0.34, item.intensity));
        return;
      }

      if (item.type === "flightArc") {
        const start = latLonToVector3(item.from.lat, item.from.lon, 2.07);
        const end = latLonToVector3(item.to.lat, item.to.lon, 2.07);
        state.dataLayer.add(makeFlightCorridor(start, end, accent, item.intensity));
        return;
      }

      const pos = latLonToVector3(item.lat, item.lon, 2.08);
      const isPulsingEvent = dataset === "earthquakes" || dataset === "eonet";
      const core = new THREE.Mesh(
        new THREE.SphereGeometry(isPulsingEvent ? 0.025 + item.intensity * 0.055 : 0.04, 18, 18),
        new THREE.MeshBasicMaterial({
          color: new THREE.Color(accent),
          transparent: true,
          opacity: 0.86,
          blending: THREE.AdditiveBlending
        })
      );
      core.position.copy(pos);
      core.userData.kind = dataset === "earthquakes" ? "quakeCore" : dataset === "eonet" ? "eventCore" : "networkCore";
      core.userData.speed = 3.6 + item.intensity * 6;
      core.userData.phase = Math.random() * Math.PI * 2;
      state.dataLayer.add(core);

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.035, 0.048 + item.intensity * 0.09, 36),
        new THREE.MeshBasicMaterial({
          color: new THREE.Color(accent),
          transparent: true,
          opacity: 0.42,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending
        })
      );
      ring.position.copy(pos);
      ring.lookAt(new THREE.Vector3(0, 0, 0));
      ring.userData.kind = dataset === "earthquakes" ? "quakeRing" : dataset === "eonet" ? "eventRing" : "networkRing";
      ring.userData.speed = 0.42 + item.intensity * 0.72;
      ring.userData.intensity = item.intensity;
      ring.userData.phase = Math.random();
      state.dataLayer.add(ring);

      if (isPulsingEvent) {
        const secondRing = ring.clone();
        secondRing.material = ring.material.clone();
        secondRing.userData = { ...ring.userData, phase: ring.userData.phase + 0.5 };
        state.dataLayer.add(secondRing);
      }
    });
  }, [dataset, points, accent]);

  return <div className="globeScene" ref={mountRef} />;
}

function useLiveData(dataset) {
  const [status, setStatus] = useState("Connessione dati live");
  const [items, setItems] = useState([]);
  const [updatedAt, setUpdatedAt] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setStatus("Aggiornamento feed live");
      try {
        if (dataset === "earthquakes") {
          const payload = await readJson(DATASETS.earthquakes.endpoint);
          if (!cancelled) {
            setItems(parseEarthquakes(payload));
            setUpdatedAt(new Date());
            setStatus("Feed USGS live");
          }
          return;
        }

        if (dataset === "eonet") {
          const payload = await readJson(DATASETS.eonet.endpoint);
          if (!cancelled) {
            setItems(parseEonet(payload));
            setUpdatedAt(new Date());
            setStatus("NASA EONET eventi naturali live");
          }
          return;
        }

        if (dataset === "flights") {
          const payload = await readJson(DATASETS.flights.endpoint);
          if (!cancelled) {
            setItems(parseFlights(payload));
            setUpdatedAt(new Date());
            setStatus("OpenSky ADS-B voli live");
          }
          return;
        }

        if (dataset === "markets") {
          const ids = CRYPTO_ASSETS.map((asset) => asset.id).join(",");
          const params = new URLSearchParams({
            ids,
            vs_currencies: "usd",
            include_24hr_change: "true",
            include_24hr_vol: "true",
            include_last_updated_at: "true"
          });
          const payload = await readJson(`${DATASETS.markets.endpoint}?${params.toString()}`);
          if (!cancelled) {
            setItems(parseMarkets(payload));
            setUpdatedAt(new Date());
            setStatus("CoinGecko crypto market live");
          }
          return;
        }

        const stop = new Date();
        const start = new Date(stop.getTime() - 1000 * 60 * 60 * 2);
        const params = new URLSearchParams({
          starttime: start.toISOString(),
          endtime: stop.toISOString()
        });
        const settledResults = await Promise.allSettled(
          NETWORKS.map(async (network) => ({
            network,
            payload: await readJson(`${DATASETS.internet.endpoint}?resource=${network.resource}&${params.toString()}`)
          }))
        );
        const results = settledResults.filter((result) => result.status === "fulfilled").map((result) => result.value);
        if (results.length === 0) throw new Error("nessuna fonte BGP raggiungibile");

        if (!cancelled) {
          setItems(parseBgpSignals(results));
          setUpdatedAt(new Date());
          setStatus(`RIPEstat BGP live (${results.length}/${NETWORKS.length})`);
        }
      } catch (error) {
        if (!cancelled) {
          setItems(dataset === "internet" ? fallbackBgpSignals() : []);
          setUpdatedAt(new Date());
          setStatus(dataset === "internet" ? `RIPEstat non disponibile: ${error.message}` : `Feed non disponibile: ${error.message}`);
        }
      }
    }

    load();
    const refreshMs = dataset === "internet" ? 30000 : dataset === "markets" ? 45000 : dataset === "flights" ? 60000 : 90000;
    const interval = window.setInterval(load, refreshMs);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [dataset]);

  return { items, status, updatedAt };
}

function App() {
  const [dataset, setDataset] = useState("earthquakes");
  const { items, status, updatedAt } = useLiveData(dataset);
  const config = DATASETS[dataset];
  const topItems = useMemo(() => items.filter((item) => item.type !== "arc").slice(0, 5), [items]);

  return (
    <main className="app" style={{ "--accent": config.accent }}>
      <GlobeScene dataset={dataset} points={items} accent={config.accent} />

      <section className="hud">
        <div className="brand">
          <Globe2 size={21} />
          <span>Live Globe</span>
        </div>

        <div className="datasetSwitch" aria-label="Dataset">
          {Object.entries(DATASETS).map(([key, item]) => (
            <button key={key} className={key === dataset ? "active" : ""} onClick={() => setDataset(key)}>
              {key === "earthquakes" ? (
                <Activity size={16} />
              ) : key === "eonet" ? (
                <Flame size={16} />
              ) : key === "flights" ? (
                <Plane size={16} />
              ) : key === "markets" ? (
                <Bitcoin size={16} />
              ) : (
                <RadioTower size={16} />
              )}
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        <div className="telemetry">
          <div>
            <span>Sorgente</span>
            <strong>{status}</strong>
          </div>
          <div>
            <span>Eventi</span>
            <strong>{items.length}</strong>
          </div>
          <div>
            <span>Update</span>
            <strong>{updatedAt ? updatedAt.toLocaleTimeString("it-IT") : "--:--:--"}</strong>
          </div>
        </div>
      </section>

      <section className="feed">
        {topItems.map((item, index) => (
          <div className="feedRow" key={`${item.label}-${item.value}-${index}`}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
