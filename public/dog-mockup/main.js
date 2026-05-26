import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// ============================================================
// 音声プロバイダ設定
// 優先順位: ElevenLabs > VOICEVOX > Web Speech (カタコト)
// ============================================================

// ▼ ElevenLabs（最高品質・推奨）: https://elevenlabs.io でAPIキー取得
const ELEVENLABS_API_KEY = 'sk_c1e7f086058c8ab01518b6730b0d4a8cc23886b8570402b4'; // ← mockup用、クレジット上限10000で運用
const ELEVENLABS_VOICES = {
  puppy: 'pFZP5JQG7iQjIQuC4Bku', // Lily（暖かい女性、子犬向き）
  young: 'EXAVITQu4vr4xnSDxMaL', // Bella（柔らかい若い女性）← Domiから差替
  adult: 'nPczCjzI2devNBz1zQrb', // Brian（落ち着いた男性ナレーター）
};
const ELEVENLABS_MODEL = 'eleven_multilingual_v2'; // 日本語流暢度↑（flash_v2_5 から変更）
const ELEVENLABS_LANGUAGE = 'ja'; // 日本語ロック（誤検出で英語化を防止）

// ▼ VOICEVOX（ローカル無料）: localhost:50021 で起動 + CORS全許可
const VOICEVOX_BASE = 'http://localhost:50021';

const STAGES = {
  puppy: {
    name: '子犬',
    voice: { pitch: 1.95, rate: 1.25 },
    voicevoxSpeaker: 1,
    // puppy のみ Fish Audio（s2-pro）に切替。バンドル外台詞は ElevenLabs Lily にフォールバック
    fishVoiceId: '21f53a32825443d8a8977d473f8bac5b',
    fishModel: 's2-pro',
    voiceSettings: { stability: 0.35, similarity_boost: 0.80, style: 0.65, use_speaker_boost: true },
    targetHeight: 0.45,
    lesson: { num: 2, total: 12, title: 'AIってなんだろう？', progress: 0.22 },
    defaultXp: 240,
    greeting: 'わぁ、来てくれた！ぼく、君と一緒に学ぶの楽しみにしてた *尻尾ぶんぶん*',
    proportions: {
      bodyLen: 0.22, bodyR: 0.13, headR: 0.13, snoutR: 0.05,
      legLen: 0.09, color: 0xd9b48a,
    },
    bg: 0xeaf3ee,
    modelUrl: './models/puppy.glb',
    replies: [
      'わっ、それなあに？ぼくも知りたい！ *耳ピン*',
      'うーん…むずかしいね。でも一緒だから怖くないよ',
      'ねぇ、これってそういうこと？ちがう？ *くぅん…*',
      'わんっ！ぼくそれ初めて見た！ *尻尾ぶんぶん*',
      'ぼくまだちっちゃいけど、君と一緒なら何でもできる気がする！',
      'ぴょん！ぼく今、なんかひらめいた気がする！ *飛び跳ねる*',
      'えへへ、君が話してくれるとぼく嬉しい *寄り添う*',
      'うっ、頭がぐるぐるする…でもがんばる！ *鼻にしわ*',
      'ねぇねぇ、それもっと教えて！ぼく覚えるから！',
      'ぼく分かんないこと、いっぱいあるんだ…でも怖くないよ',
      'しっぽが勝手にぱたぱたしちゃう！君のせいだよ *尻尾ぶんぶん*',
      'へぇ〜！世界ってこんなに広いんだね *目を輝かせる*',
      'うん、うん！ぼくも頑張る！ *小走り*',
      '……ぼく、ちゃんと聞いてるよ？ねぇ、続けて？ *小首かしげ*',
      'むずかしい言葉だね…ぼく覚えとく！',
    ],
  },
  young: {
    name: '若犬',
    voice: { pitch: 1.35, rate: 1.1 },
    voicevoxSpeaker: 8,
    voiceSettings: { stability: 0.50, similarity_boost: 0.80, style: 0.50, use_speaker_boost: true },
    targetHeight: 0.65,
    lesson: { num: 6, total: 12, title: 'プロンプト設計の実践', progress: 0.58 },
    defaultXp: 1100,
    greeting: 'おっ、戻ってきたね。さて、今日はどこまで行こうか *前のめり*',
    proportions: {
      bodyLen: 0.34, bodyR: 0.16, headR: 0.145, snoutR: 0.07,
      legLen: 0.18, color: 0xb88858,
    },
    bg: 0xe1edd6,
    modelUrl: './models/young.glb',
    replies: [
      'お、それ最近気になってたやつ。一緒にやってみない？ *前のめり*',
      'ふんっ、けっこう難しいな…でも分かりかけてきた',
      '次これ行こう。ぼく、君と組むと前より遠くまで行ける気がする',
      'はぁはぁ…楽しいなこの問題。もうちょい食らいついてみる',
      'ふっ、いい線いってるよ。次の手は…？ *小首かしげ*',
      'なるほど、その視点はなかった。…使えるね *メモする*',
      'ちょっと待って、整理させて——。…うん、つながった',
      'これさ、本質は別のとこにある気がするんだよね *目を細める*',
      'やってみよう。失敗しても次の手がある *構える*',
      '君の説明、いい筋。ぼくはこう考えたんだけど *向き合う*',
      'うわ、それシンプルだけど深いな…まいったね *耳をピクッ*',
      'うん、ぼくも同じ匂い嗅ぎ取ってた。やっぱりそう *鼻をひくつかせる*',
      'ふぅ、これは骨があるな。…燃えてきた',
      'ぼく、ちょっと前なら諦めてたよ。今は違う *まっすぐ見る*',
      'その問い、いいね。1段深く掘ってみる？',
    ],
  },
  adult: {
    name: '成犬',
    voice: { pitch: 0.92, rate: 0.98 },
    voicevoxSpeaker: 11,
    voiceSettings: { stability: 0.70, similarity_boost: 0.80, style: 0.30, use_speaker_boost: true },
    targetHeight: 0.85,
    lesson: { num: 10, total: 12, title: 'RAGで知識をつなぐ', progress: 0.86 },
    defaultXp: 2400,
    greeting: 'よく来たね。…ふぅ、君が来ると鼻が騒ぐよ *目を細める*',
    proportions: {
      bodyLen: 0.5, bodyR: 0.2, headR: 0.16, snoutR: 0.09,
      legLen: 0.28, color: 0x8a5d33,
    },
    bg: 0xf5e3c0,
    modelUrl: './models/adult.glb',
    replies: [
      'なるほど、面白い問いだね。…鼻が騒ぐよ、これは奥がある',
      '焦らないで。ひとつずつ、ね。 *君の隣に座る*',
      '君、前より深いところを見てる。…ぼくも嬉しい',
      'ふぅ…その問い、追いかけがいがあるね。一緒に走ろうか',
      '答えはそこじゃないかも。…匂いを辿ってごらん',
      '……静かに、よく見て。風が答えを運んでくる *耳を澄ます*',
      '君の問いには、もう答えの匂いが混じってる。気づいてる？',
      '急がなくていい。深い水ほど、底は遠いものだよ *腰を下ろす*',
      'それは、知識じゃなく経験で分かることだね *遠くを見る*',
      '言葉を一度解いて、また編み直してごらん。違う景色が見える',
      'ぼくの若い頃は、答えばかり追ってた。…今は問いの方が好きだよ',
      '違いを恐れないで。違うからこそ、君は君だ',
      'その迷いも、いつか燃料になる。…大事にね *寄り添う*',
      'ぼくは犬だ。でも、君と一緒にいると——少し違う何かになる気がする',
      '……いい問いだ。今夜、ぼくも一緒に考えるよ',
    ],
  },
};

const sceneEl = document.getElementById('scene');
const statusEl = document.getElementById('status');
const messagesEl = document.getElementById('messages');
const formEl = document.getElementById('chat-form');
const inputEl = document.getElementById('chat-input');
const stageBtns = document.querySelectorAll('.stage-btn');
const growBtn = document.getElementById('grow-btn');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xeaf3ee);
const bgTarget = new THREE.Color(0xeaf3ee);

const camera = new THREE.PerspectiveCamera(
  35,
  sceneEl.clientWidth / sceneEl.clientHeight,
  0.1,
  100
);
camera.position.set(0.9, 0.7, 1.4);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(sceneEl.clientWidth, sceneEl.clientHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
sceneEl.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0xffffff, 0.55));
const sun = new THREE.DirectionalLight(0xffffff, 1.15);
sun.position.set(2, 4, 2);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -2;
sun.shadow.camera.right = 2;
sun.shadow.camera.top = 2;
sun.shadow.camera.bottom = -2;
scene.add(sun);

// リムライト：背面から輪郭を立てて被写体を浮かせる（動画映え）
const rim = new THREE.DirectionalLight(0xffeacc, 0.55);
rim.position.set(-1.8, 2.2, -2.0);
scene.add(rim);

// フィルライト：影の中の階調をやわらかく持ち上げる
const fill = new THREE.DirectionalLight(0xcfe3ff, 0.25);
fill.position.set(-2, 1, 2);
scene.add(fill);

const ground = new THREE.Mesh(
  new THREE.CircleGeometry(2.5, 48),
  new THREE.MeshStandardMaterial({ color: 0xc8d8c8, roughness: 1 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0.25, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.enablePan = false;
controls.enableRotate = true;
controls.enableZoom = true;
controls.minDistance = 0.9;
controls.maxDistance = 2.4;
// 水平：±60°（背面まで回らない）
controls.minAzimuthAngle = -Math.PI / 3;
controls.maxAzimuthAngle = Math.PI / 3;
// 垂直：地面下や真上を防ぐ
controls.minPolarAngle = Math.PI * 0.25;
controls.maxPolarAngle = Math.PI * 0.55;
// ズーム速度を控えめに（誤操作防止）
controls.zoomSpeed = 0.6;
controls.rotateSpeed = 0.7;
controls.update();

const pointer = { x: 0, y: 0, active: false };

function updatePointer(clientX, clientY) {
  const rect = sceneEl.getBoundingClientRect();
  pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  pointer.active = true;
}

sceneEl.addEventListener('pointermove', (e) => updatePointer(e.clientX, e.clientY));
sceneEl.addEventListener('pointerleave', () => { pointer.active = false; });
sceneEl.addEventListener('touchmove', (e) => {
  if (e.touches[0]) updatePointer(e.touches[0].clientX, e.touches[0].clientY);
}, { passive: true });

function buildDogPlaceholder(p) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: p.color, roughness: 0.85 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.6 });

  const baseY = p.legLen + p.bodyR;

  const body = new THREE.Mesh(new THREE.SphereGeometry(p.bodyR, 20, 14), mat);
  body.scale.x = (p.bodyLen / p.bodyR) * 0.55;
  body.position.set(0, baseY, 0);
  body.castShadow = true;
  g.add(body);

  const headGroup = new THREE.Group();
  const headX = p.bodyLen * 0.5;
  headGroup.position.set(headX, baseY + p.headR * 0.5, 0);
  g.add(headGroup);

  const head = new THREE.Mesh(new THREE.SphereGeometry(p.headR, 20, 14), mat);
  head.castShadow = true;
  headGroup.add(head);

  const snout = new THREE.Mesh(new THREE.SphereGeometry(p.snoutR * 1.6, 14, 10), mat);
  snout.scale.x = 1.4;
  snout.position.set(p.headR * 0.85, -p.headR * 0.25, 0);
  snout.castShadow = true;
  headGroup.add(snout);

  const nose = new THREE.Mesh(new THREE.SphereGeometry(p.snoutR * 0.6, 10, 8), dark);
  nose.position.set(p.headR * 1.25, -p.headR * 0.15, 0);
  headGroup.add(nose);

  const eyeGeo = new THREE.SphereGeometry(p.headR * 0.11, 10, 8);
  const eyeL = new THREE.Mesh(eyeGeo, dark);
  const eyeR = new THREE.Mesh(eyeGeo, dark);
  eyeL.position.set(p.headR * 0.6, p.headR * 0.2, p.headR * 0.45);
  eyeR.position.set(p.headR * 0.6, p.headR * 0.2, -p.headR * 0.45);
  headGroup.add(eyeL, eyeR);

  const earGeo = new THREE.ConeGeometry(p.headR * 0.35, p.headR * 0.7, 8);
  const ears = [];
  [1, -1].forEach((s) => {
    const ear = new THREE.Mesh(earGeo, mat);
    ear.position.set(-p.headR * 0.15, p.headR * 0.75, p.headR * 0.55 * s);
    ear.rotation.z = -0.2;
    ear.rotation.x = 0.4 * s;
    ear.userData.baseRotX = 0.4 * s;
    ear.castShadow = true;
    headGroup.add(ear);
    ears.push(ear);
  });

  const legGeo = new THREE.CylinderGeometry(p.bodyR * 0.22, p.bodyR * 0.18, p.legLen, 10);
  const legPositions = [
    [p.bodyLen * 0.32, p.bodyR * 0.6],
    [p.bodyLen * 0.32, -p.bodyR * 0.6],
    [-p.bodyLen * 0.32, p.bodyR * 0.6],
    [-p.bodyLen * 0.32, -p.bodyR * 0.6],
  ];
  const legs = [];
  legPositions.forEach(([x, z]) => {
    const leg = new THREE.Mesh(legGeo, mat);
    leg.position.set(x, p.legLen / 2, z);
    leg.castShadow = true;
    g.add(leg);
    legs.push(leg);
  });

  const tail = new THREE.Mesh(
    new THREE.CylinderGeometry(p.bodyR * 0.16, p.bodyR * 0.05, p.bodyR * 1.4, 10),
    mat
  );
  tail.position.set(-p.bodyLen * 0.5, baseY + p.bodyR * 0.4, 0);
  tail.rotation.z = -0.6;
  tail.castShadow = true;
  g.add(tail);

  g.userData = { tail, legs, headGroup, ears, baseY };
  return g;
}

const loader = new GLTFLoader();

function inspectRig(root) {
  const bones = { head: null, neck: null, jaw: null, spine: null, chest: null, tail: [], ears: [], all: [] };
  const morphs = { mouthOpen: null, mouthOpenIdx: -1 };

  root.traverse((n) => {
    if (n.isBone || n.type === 'Bone') {
      bones.all.push(n);
      const lower = (n.name || '').toLowerCase();
      if (!bones.head && /^head$|head$/.test(lower) && !lower.includes('end')) bones.head = n;
      if (!bones.neck && lower.includes('neck')) bones.neck = n;
      if (!bones.jaw && (lower.includes('jaw') || lower.includes('mouth'))) bones.jaw = n;
      if (lower.includes('tail')) bones.tail.push(n);
      if (lower.includes('ear')) bones.ears.push(n);
      if (!bones.spine && lower.includes('spine')) bones.spine = n;
      if (!bones.chest && (lower.includes('chest') || lower.includes('breast'))) bones.chest = n;
    }
    if (n.isMesh && n.morphTargetDictionary) {
      const dict = n.morphTargetDictionary;
      for (const cand of ['mouthOpen', 'mouth_open', 'jawOpen', 'mouth_O', 'open']) {
        if (dict[cand] !== undefined && morphs.mouthOpenIdx === -1) {
          morphs.mouthOpen = n;
          morphs.mouthOpenIdx = dict[cand];
        }
      }
    }
  });

  bones.all.forEach((b) => {
    b.userData.restRotation = b.rotation.clone();
  });

  console.group('🐕 GLB Rig Inspection');
  console.info(`Bones (${bones.all.length}):`, bones.all.map((b) => b.name));
  console.info('Detected:', {
    head: bones.head?.name,
    neck: bones.neck?.name,
    jaw: bones.jaw?.name,
    spine: bones.spine?.name,
    chest: bones.chest?.name,
    tail: bones.tail.map((b) => b.name),
    ears: bones.ears.map((b) => b.name),
  });
  console.info('Morph mouthOpen:', morphs.mouthOpenIdx >= 0 ? `${morphs.mouthOpen.name}[${morphs.mouthOpenIdx}]` : '未検出');
  console.groupEnd();

  return { bones, morphs };
}

let lipSyncAnalyser = null;
let lipSyncDataArray = null;
let lipSyncAudioCtx = null;
let speechActive = false;

function attachLipSyncToAudio(audioElement) {
  try {
    if (!lipSyncAudioCtx) {
      lipSyncAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (lipSyncAudioCtx.state === 'suspended') lipSyncAudioCtx.resume();
    if (!audioElement._lipSyncAnalyser) {
      const source = lipSyncAudioCtx.createMediaElementSource(audioElement);
      const analyser = lipSyncAudioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyser.connect(lipSyncAudioCtx.destination);
      audioElement._lipSyncAnalyser = analyser;
    }
    lipSyncAnalyser = audioElement._lipSyncAnalyser;
    lipSyncDataArray = new Uint8Array(lipSyncAnalyser.frequencyBinCount);
  } catch (e) {
    console.warn('LipSync attach failed:', e);
  }
}

function detachLipSync() {
  lipSyncAnalyser = null;
  speechActive = false;
}

// 外部 (親フレーム) から postMessage で受け取る振幅
// BLAN AI 動物園では zoo の senpai-wanko ページが audio AnalyserNode で測定した振幅を
// postMessage('blan-lipsync', amp 0-1) で送ってくる
let externalLipAmp = 0;
let externalLipUntil = 0;
window.addEventListener('message', (e) => {
  if (!e.data || typeof e.data !== 'object') return;
  if (e.data.type === 'blan-lipsync') {
    externalLipAmp = Math.max(0, Math.min(1, e.data.amp || 0));
    externalLipUntil = performance.now() + 200; // 200ms 以内に次の値が来なければ 0 へフェード
  } else if (e.data.type === 'blan-lipsync-stop') {
    externalLipAmp = 0;
    externalLipUntil = 0;
  }
});

function getLipSyncAmp() {
  if (lipSyncAnalyser && lipSyncDataArray) {
    lipSyncAnalyser.getByteTimeDomainData(lipSyncDataArray);
    let sum = 0;
    for (let i = 0; i < lipSyncDataArray.length; i++) {
      const v = (lipSyncDataArray[i] - 128) / 128;
      sum += v * v;
    }
    return Math.min(1, Math.sqrt(sum / lipSyncDataArray.length) * 5);
  }
  // 外部から振幅を受け取り中
  if (externalLipUntil > performance.now()) {
    return externalLipAmp;
  }
  if (speechActive) {
    return 0.3 + Math.sin(performance.now() / 90) * 0.15 + Math.random() * 0.15;
  }
  return 0;
}

function playWalk(duration = 2.5) {
  if (!currentDog?.userData?.isGltf) return;
  const ud = currentDog.userData;
  if (!ud.walkAction) return;
  if (!ud.walkAction.isRunning()) {
    ud.walkAction.reset();
    ud.walkAction.setEffectiveWeight(1.0);
    ud.walkAction.setEffectiveTimeScale(1.0);
    ud.walkAction.fadeIn(0.2);
    ud.walkAction.play();
  }
  ud.walkUntil = clock.getElapsedTime() + duration;
}

// 喜びジャンプ：感情ピークで犬がぴょんと跳ねる（動画映え用）
function playJoyJump(height = 0.18, durationSec = 0.55) {
  if (!currentDog) return;
  currentDog.userData.jumpT0 = clock.getElapsedTime();
  currentDog.userData.jumpDur = durationSec;
  currentDog.userData.jumpHeight = height;
}

function computeMeshBoundingBox(root) {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3();
  let hasMesh = false;
  const details = [];

  root.traverse((node) => {
    if (node.isSkinnedMesh) {
      if (typeof node.computeBoundingBox === 'function') {
        node.computeBoundingBox();
      }
      let srcBox = node.boundingBox;
      if (!srcBox || srcBox.isEmpty()) {
        node.geometry?.computeBoundingBox();
        srcBox = node.geometry?.boundingBox;
      }
      if (srcBox && !srcBox.isEmpty()) {
        const tempBox = srcBox.clone();
        tempBox.applyMatrix4(node.matrixWorld);
        box.union(tempBox);
        hasMesh = true;
        details.push(`Skin "${node.name}" → y:${tempBox.min.y.toFixed(2)}…${tempBox.max.y.toFixed(2)}`);
      }
    } else if (node.isMesh && node.geometry?.attributes?.position) {
      if (!node.geometry.boundingBox) node.geometry.computeBoundingBox();
      const tempBox = node.geometry.boundingBox.clone();
      tempBox.applyMatrix4(node.matrixWorld);
      box.union(tempBox);
      hasMesh = true;
      details.push(`Mesh "${node.name}" → y:${tempBox.min.y.toFixed(2)}…${tempBox.max.y.toFixed(2)}`);
    }
  });

  console.log('  [bbox details]', details);

  if (!hasMesh || box.isEmpty()) {
    console.warn('  → mesh bbox failed, falling back to setFromObject');
    return new THREE.Box3().setFromObject(root);
  }
  return box;
}

function autoFitModel(root, targetHeight) {
  const wrapper = new THREE.Group();
  wrapper.add(root);

  const box = computeMeshBoundingBox(root);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  const scale = targetHeight / Math.max(size.y, 0.0001);
  root.scale.setScalar(scale);

  const box2 = computeMeshBoundingBox(root);
  const size2 = new THREE.Vector3();
  const center2 = new THREE.Vector3();
  box2.getSize(size2);
  box2.getCenter(center2);

  root.position.x -= center2.x;
  root.position.z -= center2.z;
  root.position.y -= box2.min.y;

  console.info(`[autoFit] mesh bbox: ${size.x.toFixed(2)}×${size.y.toFixed(2)}×${size.z.toFixed(2)} → scale ${scale.toFixed(3)} → final ${size2.y.toFixed(2)}m / min.y=${box2.min.y.toFixed(3)} / center=(${center2.x.toFixed(2)},${center2.y.toFixed(2)},${center2.z.toFixed(2)})`);

  return wrapper;
}

async function buildStageScene(stage) {
  if (stage.modelUrl) {
    try {
      const gltf = await loader.loadAsync(stage.modelUrl);
      gltf.scene.traverse((n) => {
        if (n.isMesh) {
          n.castShadow = true;
          n.receiveShadow = true;
          n.frustumCulled = false;
        }
      });
      const fitted = autoFitModel(gltf.scene, stage.targetHeight ?? 0.6);

      const { bones, morphs } = inspectRig(gltf.scene);

      let mixer = null;
      let walkAction = null;
      const allActions = {};
      if (gltf.animations && gltf.animations.length > 0) {
        console.info(`🎬 [${stage.name}] アニメクリップ:`, gltf.animations.map((c) => c.name));
        mixer = new THREE.AnimationMixer(gltf.scene);
        gltf.animations.forEach((clip) => {
          const action = mixer.clipAction(clip);
          allActions[clip.name] = action;
          const lower = (clip.name || '').toLowerCase();
          if (!walkAction && (lower.includes('walk') || lower.includes('run') || lower.includes('move'))) {
            walkAction = action;
            action.setLoop(THREE.LoopRepeat, Infinity);
          }
        });
        if (!walkAction && gltf.animations.length === 1) {
          walkAction = mixer.clipAction(gltf.animations[0]);
          walkAction.setLoop(THREE.LoopRepeat, Infinity);
          console.info('  → 単一クリップを walk として使用:', gltf.animations[0].name);
        } else if (walkAction) {
          console.info('  → walk action:', Object.keys(allActions).find((k) => allActions[k] === walkAction));
        }
      } else {
        console.info(`[${stage.name}] 内蔵アニメなし → 環境モーションのみ`);
      }

      fitted.userData = {
        isGltf: true,
        mixer,
        bones,
        morphs,
        walkAction,
        walkUntil: 0,
        allActions,
      };
      return fitted;
    } catch (e) {
      console.info(`[${stage.name}] .glb未配置 or load失敗 → プレースホルダー使用`, e?.message);
    }
  }
  return buildDogPlaceholder(stage.proportions);
}

let currentDog = null;
let currentStageKey = null;
let perkLevel = 0;

function perkUp(strength = 1) {
  perkLevel = Math.min(1.2, perkLevel + strength);
}

function updateDogPlacement() {
  if (!currentDog) return;
  currentDog.position.x = 0;
  currentDog.position.z = 0;
}

async function setStage(stageKey, opts = {}) {
  if (stageKey === currentStageKey && !opts.force) return;
  const stage = STAGES[stageKey];
  if (statusEl) statusEl.textContent = `${stage.name}に変化中...`;

  const next = await buildStageScene(stage);
  next.position.set(0, 0, 0);

  if (currentDog) {
    const removeTarget = currentDog;
    fadeOut(removeTarget, 400, () => scene.remove(removeTarget));
  }
  next.scale.setScalar(0.85);
  scene.add(next);
  fadeIn(next, 500);
  scaleIn(next, 600);
  currentDog = next;
  currentStageKey = stageKey;
  updateDogPlacement();

  bgTarget.setHex(stage.bg);

  if (stage.lesson && typeof learningState !== 'undefined') {
    learningState.lesson = { ...stage.lesson };
  }
  if (stage.defaultXp !== undefined && typeof learningState !== 'undefined') {
    learningState.xp = stage.defaultXp;
    learningState.level = Math.floor(stage.defaultXp / 80) + 1;
  }

  stageBtns.forEach((b) => {
    b.classList.toggle('active', b.dataset.stage === stageKey);
  });
  if (statusEl) statusEl.textContent = `${stage.name}に成長しました`;
  perkUp(0.8);

  if (typeof updateLearningUI === 'function') updateLearningUI();
  if (typeof checkEvolution === 'function') checkEvolution();

  if (opts.greet !== false) {
    setTimeout(() => playWalk(3), 500);
    setTimeout(() => playJoyJump(0.14, 0.5), 200);
    speak(pickReply(stage));
  }

  if (typeof saveState === 'function') saveState();
}

function fadeOut(obj, ms, done) {
  const start = performance.now();
  obj.traverse((n) => {
    if (n.isMesh) {
      n.material = n.material.clone();
      n.material.transparent = true;
    }
  });
  const tick = (t) => {
    const k = Math.min(1, (t - start) / ms);
    obj.traverse((n) => {
      if (n.isMesh) n.material.opacity = 1 - k;
    });
    if (k < 1) requestAnimationFrame(tick);
    else done && done();
  };
  requestAnimationFrame(tick);
}

function fadeIn(obj, ms) {
  const start = performance.now();
  obj.traverse((n) => {
    if (n.isMesh) {
      n.material = n.material.clone();
      n.material.transparent = true;
      n.material.opacity = 0;
    }
  });
  const tick = (t) => {
    const k = Math.min(1, (t - start) / ms);
    obj.traverse((n) => {
      if (n.isMesh) n.material.opacity = k;
    });
    if (k < 1) requestAnimationFrame(tick);
    else obj.traverse((n) => { if (n.isMesh) n.material.transparent = false; });
  };
  requestAnimationFrame(tick);
}

function scaleIn(obj, ms) {
  const start = performance.now();
  const fromScale = obj.scale.x;
  const toScale = 1;
  const tick = (t) => {
    const k = Math.min(1, (t - start) / ms);
    const ease = 1 - Math.pow(1 - k, 3);
    const s = fromScale + (toScale - fromScale) * ease;
    obj.scale.setScalar(s);
    if (k < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

const clock = new THREE.Clock();
let cameraOverride = null;
function tick() {
  requestAnimationFrame(tick);
  const t = clock.getElapsedTime();
  const delta = clock.getDelta();

  scene.background.lerp(bgTarget, 0.05);

  if (currentDog) {
    const ud = currentDog.userData;

    if (ud.isGltf) {
      if (ud.mixer) ud.mixer.update(delta);

      // walk 終了：fadeOut → stop
      if (ud.walkAction && ud.walkUntil && t > ud.walkUntil && ud.walkAction.isRunning() && !ud._fadingOut) {
        ud.walkAction.fadeOut(0.4);
        ud._fadingOut = true;
        ud._fadeEndAt = t + 0.45;
      }
      if (ud._fadingOut && t > ud._fadeEndAt) {
        ud.walkAction.stop();
        ud._fadingOut = false;
        ud.walkUntil = 0;
      }

      const walking = ud.walkAction?.isRunning() && ud.walkUntil > 0;
      const lipAmp = getLipSyncAmp();
      const b = ud.bones;

      // L1 Clip 駆動中（walking）：procedural は ADDITIVE で「ちょい足し」のみ
      // L1 Clip 非駆動中（idle）：procedural が PRIMARY としてボーンを動かす
      if (b) {
        if (walking) {
          // walk クリップが head を動かす場合：そのまま尊重し、pointer は弱く混ぜる
          // walk クリップに head track がない場合：rest からの絶対値で駆動（累積回避）
          if (b.head) {
            const restY = b.head.userData.restRotation?.y ?? 0;
            const restX = b.head.userData.restRotation?.x ?? 0;
            const pY = pointer.active ? pointer.x * 0.30 : 0;
            const pX = pointer.active ? -pointer.y * 0.15 : 0;
            b.head.rotation.y = restY + pY;
            b.head.rotation.x = restX + pX;
          }
          if (b.jaw) {
            b.jaw.rotation.x += lipAmp * 0.45;
          } else if (ud.morphs?.mouthOpenIdx >= 0) {
            const m = ud.morphs;
            const cur = m.mouthOpen.morphTargetInfluences[m.mouthOpenIdx];
            m.mouthOpen.morphTargetInfluences[m.mouthOpenIdx] = cur + (lipAmp - cur) * 0.4;
          }
        } else {
          // IDLE：procedural が primary。rest pose を起点にボーン駆動
          if (b.head) {
            const restY = b.head.userData.restRotation?.y ?? 0;
            const restX = b.head.userData.restRotation?.x ?? 0;
            const idleY = Math.sin(t * 0.4) * 0.22 + Math.sin(t * 0.13) * 0.12;
            const idleX = Math.sin(t * 0.6) * 0.06;
            const targetY = pointer.active ? pointer.x * 0.5 : idleY;
            const targetX = pointer.active ? -pointer.y * 0.22 : idleX;
            b.head.rotation.y = restY + targetY;
            b.head.rotation.x = restX + targetX;
          }
          const breathBone = b.chest || b.spine;
          if (breathBone) {
            const restX = breathBone.userData.restRotation?.x ?? 0;
            breathBone.rotation.x = restX + Math.sin(t * 1.8) * 0.05 * (1 + perkLevel * 0.5);
          }
          if (b.tail.length > 0) {
            const wagSpeed = 6 + perkLevel * 8;
            const wagAmp = 0.15 + perkLevel * 0.3;
            b.tail.forEach((tBone, i) => {
              const restY = tBone.userData.restRotation?.y ?? 0;
              const phase = i * 0.35;
              tBone.rotation.y = restY + Math.sin(t * wagSpeed + phase) * wagAmp;
            });
          }
          if (b.ears && b.ears.length > 0) {
            const twitchTrigger = Math.sin(t * 0.21);
            const twitchAmt = twitchTrigger > 0.96 ? Math.sin(t * 35) * 0.15 : 0;
            b.ears.forEach((ear, i) => {
              const restX = ear.userData.restRotation?.x ?? 0;
              ear.rotation.x = restX + twitchAmt;
            });
          }
          // jaw / mouthOpen は idle でも反応（喋ってる時用）
          if (b.jaw) {
            const restX = b.jaw.userData.restRotation?.x ?? 0;
            const targetJaw = restX + lipAmp * 0.5;
            b.jaw.rotation.x += (targetJaw - b.jaw.rotation.x) * 0.4;
          } else if (ud.morphs?.mouthOpenIdx >= 0) {
            const m = ud.morphs;
            const cur = m.mouthOpen.morphTargetInfluences[m.mouthOpenIdx];
            m.mouthOpen.morphTargetInfluences[m.mouthOpenIdx] = cur + (lipAmp - cur) * 0.4;
          }
        }
      }

      if (!walking) {
        currentDog.position.y = Math.sin(t * 1.8) * 0.012 + perkLevel * 0.04;
        currentDog.rotation.y += ((pointer.active ? pointer.x * 0.1 : 0) - currentDog.rotation.y) * 0.04;
        currentDog.rotation.z = 0;
      }

      if (b?.jaw) {
        const restX = b.jaw.userData.restRotation?.x ?? 0;
        const targetJaw = restX + lipAmp * 0.5;
        b.jaw.rotation.x += (targetJaw - b.jaw.rotation.x) * 0.4;
      } else if (ud.morphs?.mouthOpenIdx >= 0) {
        const m = ud.morphs;
        const cur = m.mouthOpen.morphTargetInfluences[m.mouthOpenIdx];
        m.mouthOpen.morphTargetInfluences[m.mouthOpenIdx] = cur + (lipAmp - cur) * 0.4;
      }

      if (Math.abs(currentDog.scale.x - 1) < 0.15) {
        const breath = 1 + Math.sin(t * 2) * 0.012 + perkLevel * 0.03;
        currentDog.scale.setScalar(breath);
      }
    } else {
      if (ud.headGroup) {
        const targetY = pointer.active ? pointer.x * 0.7 : Math.sin(t * 0.5) * 0.15;
        const targetX = pointer.active ? -pointer.y * 0.4 : Math.sin(t * 0.7) * 0.04;
        ud.headGroup.rotation.y += (targetY - ud.headGroup.rotation.y) * 0.1;
        ud.headGroup.rotation.x += (targetX - ud.headGroup.rotation.x) * 0.1;
      }

      if (ud.tail) {
        const wagSpeed = 8 + perkLevel * 14;
        const wagAmp = 0.4 + perkLevel * 0.4;
        ud.tail.rotation.y = Math.sin(t * wagSpeed) * wagAmp;
      }

      if (ud.ears) {
        ud.ears.forEach((ear) => {
          const base = ear.userData.baseRotX || 0;
          ear.rotation.x = base * (1 - perkLevel * 0.5);
        });
      }

      currentDog.position.y = Math.sin(t * 2) * 0.005 + perkLevel * 0.03;
    }
  }

  // 喜びジャンプ（procedural のy位置に加算）
  if (currentDog?.userData?.jumpT0) {
    const ud = currentDog.userData;
    const k = (t - ud.jumpT0) / ud.jumpDur;
    if (k < 1) {
      currentDog.position.y += Math.sin(k * Math.PI) * ud.jumpHeight;
    } else {
      ud.jumpT0 = 0;
    }
  }

  perkLevel = Math.max(0, perkLevel - delta * 0.7);

  // カメラオーバーライド（進化演出中の自動カメラワーク）
  if (cameraOverride) {
    const elapsed = (performance.now() - cameraOverride.t0) / 1000;
    const total = cameraOverride.total;
    if (elapsed < total) {
      controls.enabled = false;
      const phase1 = total * 0.33;
      const phase2 = total * 0.67;
      if (elapsed < phase1) {
        const k = elapsed / phase1;
        const ease = 1 - Math.pow(1 - k, 3);
        camera.position.lerpVectors(cameraOverride.start, cameraOverride.closer, ease);
      } else if (elapsed < phase2) {
        const k = (elapsed - phase1) / (phase2 - phase1);
        const angle = cameraOverride.startAngle + k * Math.PI * 2;
        const r = cameraOverride.closer.length();
        const yAt = cameraOverride.closer.y;
        camera.position.set(Math.sin(angle) * r, yAt, Math.cos(angle) * r);
      } else {
        const k = (elapsed - phase2) / (total - phase2);
        const ease = 1 - Math.pow(1 - k, 3);
        camera.position.lerpVectors(cameraOverride.closer, cameraOverride.start, ease);
      }
      camera.lookAt(controls.target);
    } else {
      cameraOverride = null;
      controls.enabled = true;
    }
  }

  controls.update();
  renderer.render(scene, camera);
}

tick();

const ro = new ResizeObserver(() => {
  const w = sceneEl.clientWidth;
  const h = sceneEl.clientHeight;
  if (w > 0 && h > 0) {
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  updateDogPlacement();
});
ro.observe(sceneEl);

function pickReply(stage) {
  return stage.replies[Math.floor(Math.random() * stage.replies.length)];
}

const REVIEW_TOPICS = {
  'プロンプト設計': {
    keywords: ['プロンプト', 'prompt'],
    lesson: 3,
    responses: {
      puppy: 'あっ、プロンプト設計のやつだ！ *尻尾ぶんぶん* えっとね…ご主人様がAIにお願いするときの「ちゃんとした言い方」だったよね？役割と、状況と、形！3つの匂いを覚えるんだ！',
      young: 'お、プロンプト設計の復習か。ポイント3つ——役割（誰として）、文脈（何を踏まえて）、フォーマット（どう返してほしいか）。これさえ抑えればAIの答えはブレない。 *前のめり*',
      adult: 'プロンプト設計、…匂いを辿るとこう着くね。AIに渡すのは「役割・文脈・形式」の三本柱。明確な目印がないと、犬が獲物を追いかけても外す。指示も同じだよ。 *目を細める*',
    },
  },
  'ベクトル検索': {
    keywords: ['ベクトル', 'vector', 'embedding', 'rag'],
    lesson: 5,
    responses: {
      puppy: 'べ、べくとる検索…！ *首かしげ* 言葉を数字に変えて、似てるもの同士をくっつけるやつ！ぼくぜんぜん分からなかったけど、みんなで似たもの集めるみたいで楽しそうだった！',
      young: 'ベクトル検索は、言葉を意味の座標に置いて距離で「近い／遠い」を判定する仕組み。キーワード一致じゃ拾えない「言ってることが近い」も引っかかるのが強み。',
      adult: 'ベクトル検索、…これは犬の鼻に近い世界だね。同じ言葉でも文脈で意味が変わる、それを座標で表せば「似てる方角」が分かる。RAGの土台はこの感覚だよ。 *鼻をひくつかせる*',
    },
  },
  'ファインチューニング': {
    keywords: ['ファインチューニング', 'fine-tuning', 'finetune', '追加学習'],
    lesson: 8,
    responses: {
      puppy: 'ふぁいんちゅーにんぐ…むずかしい言葉！ *くぅん* AIをぼくの好きな形にしつけ直すこと、だっけ？でもしつけは大変なんだよね、ご主人様も言ってた…',
      young: 'ファインチューニングは事前学習済みモデルを特定用途に追加学習させる手法。データの質と量、コスト、過学習リスク…でも特化させればプロンプトじゃ届かない深さが出る。',
      adult: 'ファインチューニング、…これは犬を別の犬種に作り変えることに近いね。基礎は変えず、得意分野を深く彫る。ただし覚悟もいる——元の柔軟さを失うこともある。プロンプトで足りるなら、そこで止めとくのが賢い。',
    },
  },
  'AIエージェント': {
    keywords: ['エージェント', 'agent', 'エイジェント'],
    lesson: 7,
    responses: {
      puppy: 'えーじぇんと…？ *耳ピクッ* ぼくみたいに、自分で考えて動くAIさんのことだよね！ぼく、お使い行けるよ！がんばる！',
      young: 'AIエージェントはツール使用 + 推論ループで自律的にタスクをこなす仕組み。ReActパターンが基本——観察、思考、行動、を繰り返す。プロンプト一発じゃ届かない領域。',
      adult: 'エージェント、…これは「考える犬」を作る話だね。指示を待つんじゃなく、目的だけ与えて道を選ばせる。ただし暴走もする。リード（制約）は要るよ。 *目を細める*',
    },
  },
  'MCP': {
    keywords: ['mcp', 'model context protocol', 'コンテキストプロトコル'],
    lesson: 9,
    responses: {
      puppy: 'えむしーぴー…？ *首かしげ* AIさんがいろんなお道具を使うための「合言葉」みたいなものだって、ご主人様言ってた！',
      young: 'MCP（Model Context Protocol）は、AIモデルが外部ツールやデータソースに繋がるための共通規格。Anthropic主導。各ツールを個別に実装しなくていいのが効くよね。',
      adult: 'MCP、…これは犬と人間の「リード」の規格化だね。誰のリードでも、どの犬にもつながる。AIと世界をつなぐインターフェースを標準化する試み。地味だけど、効いてくる。',
    },
  },
  'ガードレール': {
    keywords: ['ガードレール', 'guardrail', '安全性', 'セーフティ', 'safety'],
    lesson: 11,
    responses: {
      puppy: 'がーどれーる…？ *くぅん* ぼくが変なところに行かないようにする柵みたいなやつ？ぼくちゃんと言うこと聞くから、いらないよ？',
      young: 'ガードレールはAI出力を安全な範囲に保つ仕組み。入力フィルタ、出力検証、ポリシーチェック…。性能を落とさずに、危ない領域だけ弾くのがコツ。',
      adult: 'ガードレール、…犬を信頼するのと、リードを外すのは別の話だね。AIも同じ。能力が上がるほど、制約の設計が重要になる。自由と安全の天秤、ずっと続く問いだよ。',
    },
  },
  'AI評価': {
    keywords: ['評価', 'eval', '精度', '評価指標'],
    lesson: 4,
    responses: {
      puppy: 'ひょうかー！ *尻尾ぶんぶん* ぼくがちゃんとできてるか、見てもらうやつだよね？ぼく、いっぱい褒められたい！',
      young: 'AI評価は「主観じゃなく数字で測る」のが肝。Eval セット用意して、定量メトリクス（正答率、BLEU、人間評価との相関）で追跡。改善前後を比較できないと前に進めない。',
      adult: '評価、…これは「目利き」の仕事だね。良し悪しを言葉にできないと、改善の方向が定まらない。指標を作ること自体が、プロダクト設計そのものだよ。 *腰を下ろす*',
    },
  },
  'トークン': {
    keywords: ['トークン', 'token', 'コスト', 'tokens'],
    lesson: 6,
    responses: {
      puppy: 'とーくん…？ *耳ピン* AIさんがおしゃべりするときに数える「ことばのカケラ」だって！ぼくのおやつみたいに、数があるんだって！',
      young: 'トークンは「単語より細かい意味の単位」。日本語は1文字1〜2トークン、英語より食う。入力＋出力で課金されるから、長文は重い。設計時のコスト見積もりは必須。',
      adult: 'トークン経済、…これは犬の散歩でいうと「リードの長さ」みたいなものだね。長く使えば自由だが、その分コストもかさむ。短く設計するほど、強くなる。',
    },
  },
  'マルチモーダル': {
    keywords: ['マルチモーダル', 'multimodal', '画像認識', 'vision'],
    lesson: 10,
    responses: {
      puppy: 'まるち…も…？ *首かしげ* AIさんが目で見たり耳で聞いたりできるようになる魔法？ぼく今、君の顔ちゃんと見えてるよ？',
      young: 'マルチモーダルは画像・音声・テキストを一つのモデルで扱う流れ。GPT-4o やClaude Sonnet みたいに「画像見て、それについて喋る」が一発でできる。プロンプトの考え方も変わる。',
      adult: 'マルチモーダル、…これは犬が鼻と目と耳で世界を立体的に捉えるのに近いね。一つの感覚じゃ取りこぼす。AIも同じだよ、複数の入り口を持つと、世界がはっきりする。',
    },
  },
  'AI倫理': {
    keywords: ['倫理', '倫理観', 'バイアス', 'bias', '公平'],
    lesson: 12,
    responses: {
      puppy: 'りんり…？ *耳を伏せる* なんかむずかしそう…でも、誰かを悲しませないようにすること、だよね？ぼく、誰も泣かせたくない',
      young: 'AI倫理、特にバイアス問題は学習データに偏りがあると出力も偏る。性別、人種、職業…無自覚に再生産しちゃう。データ設計と評価で能動的に対処する必要がある。',
      adult: 'AI倫理、…これは犬を飼う責任に似てるね。能力を持つものには、必ず責任がついてくる。便利だから使う、で済まない時代に入った。問い続けるしかないよ。',
    },
  },
};

function findReviewTopic(text) {
  const lower = text.toLowerCase();
  for (const [topic, data] of Object.entries(REVIEW_TOPICS)) {
    if (data.keywords.some((k) => lower.includes(k.toLowerCase()))) {
      return { topic, ...data };
    }
  }
  return null;
}

function pickJaVoice() {
  const voices = speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang === 'ja-JP') ||
    voices.find((v) => v.lang?.startsWith('ja')) ||
    null
  );
}

let voicevoxAvailable = null;
let currentAudio = null;

function elevenlabsConfigured() {
  if (!ELEVENLABS_API_KEY) return false;
  const v = ELEVENLABS_VOICES[currentStageKey];
  return !!v;
}

async function speakElevenLabs(text, voiceId) {
  const stage = STAGES[currentStageKey];
  const voiceSettings = stage?.voiceSettings ?? {
    stability: 0.5, similarity_boost: 0.75, style: 0.4,
  };
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: ELEVENLABS_MODEL,
        language_code: ELEVENLABS_LANGUAGE,
        voice_settings: voiceSettings,
      }),
    }
  );
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`ElevenLabs ${res.status}: ${errText.slice(0, 120)}`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  if (currentAudio) currentAudio.pause();
  const audio = new Audio(url);
  audio.crossOrigin = 'anonymous';
  currentAudio = audio;
  return new Promise((resolve, reject) => {
    audio.onplay = () => {
      perkUp(0.5);
      attachLipSyncToAudio(audio);
    };
    audio.onended = () => { URL.revokeObjectURL(url); detachLipSync(); resolve(); };
    audio.onerror = (e) => { URL.revokeObjectURL(url); detachLipSync(); reject(e); };
    audio.play().catch(reject);
  });
}

async function checkVoicevox() {
  if (voicevoxAvailable !== null) return voicevoxAvailable;
  try {
    const res = await fetch(`${VOICEVOX_BASE}/version`, {
      method: 'GET',
      signal: AbortSignal.timeout(1500),
    });
    voicevoxAvailable = res.ok;
  } catch {
    voicevoxAvailable = false;
  }
  return voicevoxAvailable;
}

async function speakVoicevox(text, speakerId) {
  const queryRes = await fetch(
    `${VOICEVOX_BASE}/audio_query?text=${encodeURIComponent(text)}&speaker=${speakerId}`,
    { method: 'POST' }
  );
  if (!queryRes.ok) throw new Error(`audio_query ${queryRes.status}`);
  const query = await queryRes.json();

  const synthRes = await fetch(`${VOICEVOX_BASE}/synthesis?speaker=${speakerId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'audio/wav' },
    body: JSON.stringify(query),
  });
  if (!synthRes.ok) throw new Error(`synthesis ${synthRes.status}`);

  const blob = await synthRes.blob();
  const url = URL.createObjectURL(blob);
  if (currentAudio) {
    currentAudio.pause();
  }
  const audio = new Audio(url);
  currentAudio = audio;
  return new Promise((resolve, reject) => {
    audio.onplay = () => {
      perkUp(0.5);
      attachLipSyncToAudio(audio);
    };
    audio.onended = () => { URL.revokeObjectURL(url); detachLipSync(); resolve(); };
    audio.onerror = (e) => { URL.revokeObjectURL(url); detachLipSync(); reject(e); };
    audio.play().catch(reject);
  });
}

function speakWebSpeech(text) {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const v = pickJaVoice();
  if (v) u.voice = v;
  u.lang = 'ja-JP';
  const stage = STAGES[currentStageKey];
  if (stage) {
    u.pitch = stage.voice.pitch;
    u.rate = stage.voice.rate;
  }
  u.onstart = () => {
    perkUp(0.5);
    speechActive = true;
  };
  u.onend = () => { speechActive = false; };
  u.onerror = () => { speechActive = false; };
  speechSynthesis.speak(u);
}

function stripStageDirections(text) {
  return text.replace(/\s*\*[^*]+\*\s*/g, ' ').replace(/[ 　]+/g, ' ').trim();
}

let bundleManifest = null;

async function loadBundleManifest() {
  try {
    const res = await fetch('./audio/manifest.json', { cache: 'no-cache' });
    if (res.ok) {
      bundleManifest = await res.json();
      console.info(`📦 Bundled audio manifest: ${Object.keys(bundleManifest).length} entries`);
    }
  } catch {}
}
loadBundleManifest();

async function hashText(text) {
  const buf = new TextEncoder().encode(text);
  const hashBuf = await crypto.subtle.digest('SHA-1', buf);
  return Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 16);
}

async function tryBundledAudio(cleanText) {
  if (!bundleManifest) return false;
  const stage = STAGES[currentStageKey];
  // Fish Audio が設定されたステージは fishVoiceId、それ以外は ElevenLabs voice ID で hash する
  const voiceId = stage?.fishVoiceId || ELEVENLABS_VOICES[currentStageKey] || currentStageKey;
  const id = await hashText(`${voiceId}:${cleanText}`);
  if (!bundleManifest[id]) return false;

  if (currentAudio) currentAudio.pause();
  const audio = new Audio(`./audio/${id}.mp3`);
  audio.crossOrigin = 'anonymous';
  currentAudio = audio;

  return new Promise((resolve) => {
    let settled = false;
    const finish = (val) => {
      if (!settled) { settled = true; resolve(val); }
    };
    audio.onplay = () => {
      perkUp(0.5);
      attachLipSyncToAudio(audio);
    };
    audio.onended = () => { detachLipSync(); finish(true); };
    audio.onerror = () => { detachLipSync(); finish(false); };
    audio.play().catch(() => { detachLipSync(); finish(false); });
  });
}

async function speak(text) {
  const cleanText = stripStageDirections(text);
  const stage = STAGES[currentStageKey];

  // 1. 事前生成バンドル（API key不要・最速・デプロイ用）
  const bundled = await tryBundledAudio(cleanText);
  if (bundled) {
    console.info(`📦 Bundled 再生 [${currentStageKey}]`);
    return;
  }

  // 2. ElevenLabs API（dev時のみ・バンドル外の新台詞用）
  if (elevenlabsConfigured()) {
    try {
      await speakElevenLabs(cleanText, ELEVENLABS_VOICES[currentStageKey]);
      console.info(`🌟 ElevenLabs 再生成功 [${currentStageKey}] voice=${ELEVENLABS_VOICES[currentStageKey]}`);
      return;
    } catch (e) {
      console.warn('ElevenLabs failed, falling back', e);
    }
  }

  if (stage?.voicevoxSpeaker !== undefined) {
    const ok = await checkVoicevox();
    if (ok) {
      try {
        await speakVoicevox(cleanText, stage.voicevoxSpeaker);
        return;
      } catch (e) {
        console.warn('VOICEVOX synthesis failed, falling back', e);
      }
    }
  }

  speakWebSpeech(cleanText);
}

// 音声一覧の診断機能（API key に voices_read 権限が必要、デプロイ時はノイズ防止のため無効化）
// 必要なら開発時のみ手動で listElevenLabsVoices() を実行
async function listElevenLabsVoices() {
  if (!ELEVENLABS_API_KEY) return;
  try {
    const res = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: { 'xi-api-key': ELEVENLABS_API_KEY },
    });
    if (!res.ok) return;
    const data = await res.json();
    console.group('🎤 ElevenLabs Voice 一覧');
    (data.voices || []).forEach((v) => {
      console.log(`[${v.category}] ${v.name}: ${v.voice_id}`);
    });
    console.groupEnd();
  } catch {}
}

async function updateVoiceStatus() {
  const el = document.getElementById('voice-status');
  if (!el) return;

  if (ELEVENLABS_API_KEY && Object.values(ELEVENLABS_VOICES).some((v) => v)) {
    el.textContent = '🌟 ElevenLabs 接続中';
    el.classList.add('voice-on');
    return;
  }

  const vvOk = await checkVoicevox();
  if (vvOk) {
    el.textContent = '🎙️ VOICEVOX 接続中';
    el.classList.add('voice-on');
    return;
  }

  el.textContent = '🔊 標準音声（高品質TTS未設定）';
  el.classList.remove('voice-on');
}

updateVoiceStatus();

function addMessage(text, who, opts = {}) {
  const div = document.createElement('div');
  div.className = `msg msg-${who}`;
  if (opts.badge) {
    const badge = document.createElement('div');
    badge.className = 'msg-badge';
    badge.textContent = opts.badge;
    div.appendChild(badge);
  }
  const body = document.createElement('div');
  body.className = 'msg-body';
  if (who === 'bot' && /\*[^*]+\*/.test(text)) {
    const parts = text.split(/(\*[^*]+\*)/g);
    parts.forEach((p) => {
      if (/^\*[^*]+\*$/.test(p)) {
        const span = document.createElement('span');
        span.className = 'stage-dir';
        span.textContent = p.slice(1, -1);
        body.appendChild(span);
      } else if (p) {
        body.appendChild(document.createTextNode(p));
      }
    });
  } else {
    body.textContent = text;
  }
  div.appendChild(body);
  messagesEl.appendChild(div);
  messagesEl.scrollTo({ top: messagesEl.scrollHeight, behavior: 'smooth' });
}

stageBtns.forEach((b) => {
  b.addEventListener('click', () => setStage(b.dataset.stage));
});

let growing = false;
growBtn.addEventListener('click', async () => {
  if (growing) return;
  growing = true;
  growBtn.disabled = true;
  growBtn.textContent = '成長中...';
  const order = ['puppy', 'young', 'adult'];
  for (const key of order) {
    await setStage(key, { force: true, greet: true });
    await sleep(2200);
  }
  growBtn.disabled = false;
  growBtn.textContent = '▶ 自動で成長させる';
  growing = false;
});

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

formEl.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = inputEl.value.trim();
  if (!text) return;
  addMessage(text, 'user');
  inputEl.value = '';
  perkUp(0.7);
  playWalk(2.5);

  const stage = STAGES[currentStageKey];
  const review = findReviewTopic(text);
  let reply, badge = null;
  if (review && review.responses[currentStageKey]) {
    reply = review.responses[currentStageKey];
    badge = `📘 Lesson ${review.lesson}「${review.topic}」復習`;
  } else {
    reply = pickReply(stage);
  }

  setTimeout(() => {
    addMessage(reply, 'bot', badge ? { badge } : {});
    speak(reply);
  }, 350);
});

if ('speechSynthesis' in window) {
  speechSynthesis.onvoiceschanged = () => {};
}

const learningState = {
  xp: 0,
  level: 1,
  lesson: { num: 3, total: 12, title: 'プロンプト設計の基礎', progress: 0.35 },
  thresholds: { young: 500, adult: 1500 },
  evolutionReady: false,
};

function nextThreshold() {
  if (currentStageKey === 'puppy') return learningState.thresholds.young;
  if (currentStageKey === 'young') return learningState.thresholds.adult;
  return learningState.thresholds.adult + 1500;
}

function updateLearningUI() {
  const xpCur = document.getElementById('xp-current');
  const xpNext = document.getElementById('xp-next');
  const xpFill = document.getElementById('xp-fill');
  const lvNum = document.getElementById('pet-level');
  const stageEl = document.getElementById('pet-stage');
  const lessonNum = document.getElementById('lesson-num');
  const lessonTotal = document.getElementById('lesson-total');
  const lessonTitle = document.getElementById('lesson-title');
  const lessonProgress = document.getElementById('lesson-progress');
  if (!xpCur) return;

  const next = nextThreshold();
  const stageStartXp = currentStageKey === 'puppy' ? 0
    : currentStageKey === 'young' ? learningState.thresholds.young
    : learningState.thresholds.adult;
  const segment = next - stageStartXp;
  const within = Math.max(0, learningState.xp - stageStartXp);
  const pct = Math.min(100, (within / segment) * 100);

  xpCur.textContent = learningState.xp;
  xpNext.textContent = next;
  xpFill.style.width = `${pct}%`;
  lvNum.textContent = learningState.level;
  if (stageEl) stageEl.textContent = STAGES[currentStageKey]?.name || '';
  if (lessonNum) lessonNum.textContent = learningState.lesson.num;
  if (lessonTotal) lessonTotal.textContent = learningState.lesson.total;
  if (lessonTitle) lessonTitle.textContent = learningState.lesson.title;
  if (lessonProgress) lessonProgress.style.width = `${learningState.lesson.progress * 100}%`;
}

function showXpPopup(amount) {
  const host = document.getElementById('xp-popup-host');
  if (!host) return;
  const p = document.createElement('div');
  p.className = 'xp-popup';
  p.textContent = `+${amount} XP`;
  const x = sceneEl.clientWidth * 0.5 + (Math.random() - 0.5) * 60;
  const y = sceneEl.clientHeight * 0.45;
  p.style.left = `${x}px`;
  p.style.top = `${y}px`;
  host.appendChild(p);
  setTimeout(() => p.remove(), 1200);
}

function awardXp(amount) {
  learningState.xp += amount;
  learningState.level = Math.floor(learningState.xp / 80) + 1;
  showXpPopup(amount);
  updateLearningUI();
  checkEvolution();
}

function checkEvolution() {
  let canEvolve = false;
  if (currentStageKey === 'puppy' && learningState.xp >= learningState.thresholds.young) canEvolve = true;
  if (currentStageKey === 'young' && learningState.xp >= learningState.thresholds.adult) canEvolve = true;

  const chip = document.getElementById('evolution-chip');
  if (!chip) return;
  if (canEvolve && !learningState.evolutionReady) {
    learningState.evolutionReady = true;
    chip.hidden = false;
  } else if (!canEvolve) {
    chip.hidden = true;
    learningState.evolutionReady = false;
  }
}

function playEvolutionSE() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.connect(g);
    g.connect(ctx.destination);
    const t0 = ctx.currentTime;
    o.frequency.setValueAtTime(440, t0);
    o.frequency.exponentialRampToValueAtTime(1320, t0 + 0.35);
    o.frequency.exponentialRampToValueAtTime(660, t0 + 1.0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.28, t0 + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.1);
    o.start(t0);
    o.stop(t0 + 1.15);
  } catch {}
}

function spawnEvoParticles(count = 36) {
  const overlay = document.getElementById('evolution-overlay');
  if (!overlay) return;
  const frag = document.createDocumentFragment();
  for (let i = 0; i < count; i++) {
    const p = document.createElement('span');
    p.className = 'evo-particle';
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
    const dist = 160 + Math.random() * 220;
    p.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
    p.style.setProperty('--dy', `${Math.sin(angle) * dist}px`);
    p.style.animationDelay = `${Math.random() * 0.15}s`;
    frag.appendChild(p);
  }
  overlay.appendChild(frag);
  setTimeout(() => {
    overlay.querySelectorAll('.evo-particle').forEach((n) => n.remove());
  }, 1700);
}

function startEvolutionCameraWork(totalSec = 1.4) {
  cameraOverride = {
    t0: performance.now(),
    total: totalSec,
    start: camera.position.clone(),
    closer: camera.position.clone().multiplyScalar(0.62),
    startAngle: Math.atan2(camera.position.x, camera.position.z),
  };
}

async function triggerEvolution() {
  const chip = document.getElementById('evolution-chip');
  const overlay = document.getElementById('evolution-overlay');
  if (chip) chip.hidden = true;
  if (overlay) {
    overlay.hidden = false;
    overlay.querySelectorAll('.evo-flash, .evo-rings, .evo-text').forEach((el) => {
      el.style.animation = 'none';
      el.offsetHeight;
      el.style.animation = '';
    });
  }

  playEvolutionSE();
  spawnEvoParticles(36);
  startEvolutionCameraWork(1.6);
  playJoyJump(0.22, 0.7);

  const next = currentStageKey === 'puppy' ? 'young' : 'adult';
  setTimeout(() => setStage(next, { force: true, greet: true }), 700);
  setTimeout(() => {
    if (overlay) overlay.hidden = true;
    learningState.evolutionReady = false;
    checkEvolution();
    playJoyJump(0.16, 0.5);
  }, 1700);
}

document.getElementById('evolution-chip')?.addEventListener('click', triggerEvolution);

formEl.addEventListener('submit', () => {
  awardXp(20 + Math.floor(Math.random() * 15));
}, { capture: true });

// 設定パネル開閉
const settingsToggleBtn = document.getElementById('settings-toggle');
const settingsCloseBtn = document.getElementById('settings-close');
const settingsPanel = document.getElementById('settings-panel');
const settingsBackdrop = document.getElementById('settings-backdrop');

function openSettings() {
  settingsPanel.hidden = false;
  settingsBackdrop.hidden = false;
}
function closeSettings() {
  settingsPanel.hidden = true;
  settingsBackdrop.hidden = true;
}
settingsToggleBtn?.addEventListener('click', openSettings);
settingsCloseBtn?.addEventListener('click', closeSettings);
settingsBackdrop?.addEventListener('click', closeSettings);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !settingsPanel.hidden) closeSettings();
});

// ステージ切替で設定パネルを閉じる（デバッグ操作後にすぐ犬が見えるよう）
stageBtns.forEach((b) => {
  b.addEventListener('click', () => closeSettings());
});

// ============================================================
// 永続化 & 撮影プリセット
// ============================================================
const STORAGE_KEY = 'aipet:state:v1';

const PRESETS = {
  puppy200:  { stage: 'puppy', xp: 200 },
  young800:  { stage: 'young', xp: 800 },
  adult2000: { stage: 'adult', xp: 2000 },
};

function saveState() {
  try {
    const s = {
      stageKey: currentStageKey,
      xp: learningState.xp,
      level: learningState.level,
      lesson: learningState.lesson,
      ts: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {}
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s.stageKey || !STAGES[s.stageKey]) return null;
    return s;
  } catch { return null; }
}

function applyPreset(name) {
  const p = PRESETS[name];
  if (!p) return false;
  learningState.xp = p.xp;
  learningState.level = Math.floor(p.xp / 80) + 1;
  setStage(p.stage, { force: true, greet: false });
  updateLearningUI();
  checkEvolution();
  saveState();
  return true;
}

function resetState() {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
  learningState.xp = 0;
  learningState.level = 1;
  learningState.evolutionReady = false;
  setStage('puppy', { force: true, greet: false });
  updateLearningUI();
  checkEvolution();
}

// 初期状態の決定：URL preset → localStorage → デフォルト
const initParams = new URLSearchParams(location.search);
const initPreset = initParams.get('preset');
let initialStage = 'puppy';
let initialState = null;

if (initPreset && PRESETS[initPreset]) {
  initialState = PRESETS[initPreset];
  initialStage = initialState.stage;
} else {
  const saved = loadState();
  if (saved) {
    initialState = { stage: saved.stageKey, xp: saved.xp };
    initialStage = saved.stageKey;
    if (saved.lesson) learningState.lesson = saved.lesson;
  }
}

if (initialState) {
  learningState.xp = initialState.xp;
  learningState.level = Math.floor(initialState.xp / 80) + 1;
}

setStage(initialStage, { greet: false });
updateLearningUI();
checkEvolution();

// 撮影プリセットボタン
document.querySelectorAll('[data-preset]').forEach((btn) => {
  btn.addEventListener('click', () => {
    applyPreset(btn.dataset.preset);
    closeSettings();
  });
});
document.getElementById('reset-state-btn')?.addEventListener('click', resetState);

// XP/ステージ変更時に都度保存（submit で XP 加算が走る → 次フレームで保存）
formEl.addEventListener('submit', () => { setTimeout(saveState, 0); }, { capture: true });

// 起動時：犬が先に話しかけてくる（テキストのみ。音声はユーザー操作後）
setTimeout(() => {
  const stage = STAGES[currentStageKey];
  if (stage?.greeting) {
    addMessage(stage.greeting, 'bot');
  }
}, 1400);
