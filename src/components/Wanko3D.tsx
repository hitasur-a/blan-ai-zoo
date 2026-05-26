// 3D わんこビューア (3d-dog-growth-mockup から GLB + autoFit 完全移植)
// useMemo 内で確実に scale 計算 → boundingBox から自動 fit → 床着地

"use client";

import { Suspense, useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { Group } from "three";

type Stage = "puppy" | "young" | "adult";

/** SkinnedMesh の正しい bbox を取得 (3d-dog-growth-mockup の computeMeshBoundingBox 完全移植) */
function computeMeshBoundingBox(root: THREE.Object3D): THREE.Box3 {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3();
  let hasMesh = false;

  root.traverse((node) => {
    const skinned = node as THREE.SkinnedMesh;
    const mesh = node as THREE.Mesh;

    // SkinnedMesh: 専用 API で bbox 取得
    if (skinned.isSkinnedMesh) {
      // Three.js r152+ で SkinnedMesh.computeBoundingBox() が利用可能
      const skinnedAny = skinned as unknown as {
        computeBoundingBox?: () => void;
        boundingBox?: THREE.Box3 | null;
      };
      if (typeof skinnedAny.computeBoundingBox === "function") {
        skinnedAny.computeBoundingBox();
      }
      let srcBox = skinnedAny.boundingBox ?? null;
      // フォールバック: geometry.boundingBox (bind pose)
      if (!srcBox || srcBox.isEmpty()) {
        if (!skinned.geometry?.boundingBox) {
          skinned.geometry?.computeBoundingBox();
        }
        srcBox = skinned.geometry?.boundingBox ?? null;
      }
      if (srcBox && !srcBox.isEmpty()) {
        const tempBox = srcBox.clone();
        tempBox.applyMatrix4(skinned.matrixWorld);
        box.union(tempBox);
        hasMesh = true;
      }
      return;
    }

    // 通常 Mesh: geometry.boundingBox
    if (mesh.isMesh && mesh.geometry?.attributes?.position) {
      if (!mesh.geometry.boundingBox) {
        mesh.geometry.computeBoundingBox();
      }
      if (mesh.geometry.boundingBox) {
        const tempBox = mesh.geometry.boundingBox.clone();
        tempBox.applyMatrix4(mesh.matrixWorld);
        box.union(tempBox);
        hasMesh = true;
      }
    }
  });

  if (!hasMesh || box.isEmpty()) {
    console.warn("[computeMeshBoundingBox] falling back to setFromObject");
    return new THREE.Box3().setFromObject(root);
  }
  return box;
}

function WankoModel({ stage, targetHeight }: { stage: Stage; targetHeight: number }) {
  const { scene } = useGLTF(`/models/${stage}.glb`);
  const groupRef = useRef<Group>(null!);

  // useMemo 内で autoFit
  const fittedScene = useMemo(() => {
    const cloned = scene.clone(true);

    // 0) frustumCulled 無効化 + shadow 設定
    cloned.traverse((n) => {
      const mesh = n as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.frustumCulled = false;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });

    // 1) リセット
    cloned.scale.setScalar(1);
    cloned.position.set(0, 0, 0);
    cloned.updateMatrixWorld(true);

    // 2) bbox 計算 (SkinnedMesh 対応の geometry-based) → scale 算出
    const box1 = computeMeshBoundingBox(cloned);
    if (box1.isEmpty()) {
      console.warn(`[Wanko3D] bbox is empty for ${stage}`);
      return cloned;
    }
    const size1 = new THREE.Vector3();
    box1.getSize(size1);
    if (size1.y < 0.0001) {
      console.warn(`[Wanko3D] model has zero height for ${stage}`);
      return cloned;
    }
    const scale = targetHeight / size1.y;
    cloned.scale.setScalar(scale);
    cloned.updateMatrixWorld(true);

    // 3) scale 後 bbox で center / floor を計算 → 原点化 + 床着地
    const box2 = computeMeshBoundingBox(cloned);
    const center2 = new THREE.Vector3();
    box2.getCenter(center2);
    cloned.position.x -= center2.x;
    cloned.position.z -= center2.z;
    cloned.position.y -= box2.min.y;
    cloned.updateMatrixWorld(true);

    console.log(`[Wanko3D autoFit] ${stage}: original h=${size1.y.toFixed(3)}, scale=${scale.toFixed(3)}, target=${targetHeight}`);

    return cloned;
  }, [scene, stage, targetHeight]);

  // 浮遊 + 左右の見回し
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(t * 0.4) * 0.22 + Math.sin(t * 0.13) * 0.1;
      groupRef.current.position.y = Math.sin(t * 1.8) * 0.012;
    }
  });

  return (
    <group ref={groupRef}>
      <primitive object={fittedScene} />
    </group>
  );
}

interface Wanko3DProps {
  stage?: Stage;
  withGround?: boolean;
  /** わんこの target 高さ (m)。元モック: puppy 0.45 / young 0.65 / adult 0.85 */
  targetHeight?: number;
  cameraPosition?: [number, number, number];
  cameraTarget?: [number, number, number];
  cameraFov?: number;
}

export function Wanko3D({
  stage = "puppy",
  withGround = true,
  targetHeight = 0.6,
  cameraPosition = [0.9, 0.7, 1.4],
  cameraTarget = [0, 0.25, 0],
  cameraFov = 35,
}: Wanko3DProps) {
  return (
    <Canvas
      camera={{ position: cameraPosition, fov: cameraFov }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: "transparent", width: "100%", height: "100%" }}
      onCreated={({ camera }) => {
        camera.lookAt(...cameraTarget);
      }}
    >
      <ambientLight intensity={0.65} />
      <directionalLight position={[2, 4, 2]} intensity={1.15} />
      <directionalLight position={[-1.8, 2.2, -2.0]} intensity={0.55} color="#ffeacc" />
      <directionalLight position={[-2, 1, 2]} intensity={0.25} color="#cfe3ff" />

      {withGround && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
          <circleGeometry args={[2.5, 48]} />
          <meshStandardMaterial color="#c8d8c8" roughness={1} />
        </mesh>
      )}

      <Suspense fallback={null}>
        <WankoModel stage={stage} targetHeight={targetHeight} />
      </Suspense>
    </Canvas>
  );
}

useGLTF.preload("/models/puppy.glb");
