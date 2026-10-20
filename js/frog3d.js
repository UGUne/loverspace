// ===== 奶蛙 3D 渲染器（Three.js） =====
// 按用户提供的三视图参考图建模：梨形黄身 + 大圆奶油肚皮 + 绿眼黑瞳 + 深色手脚
// 支持多实例（树场景小奶蛙 + 独立房间大奶蛙）

var Frog3D = (function () {
  var instances = {};

  function loadThree(cb) {
    if (window.THREE) { cb(true); return; }
    var done = false;
    var timer = setTimeout(function () { if (!done) { done = true; cb(false); } }, 8000);
    var s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js";
    s.onload = function () { if (!done) { done = true; clearTimeout(timer); cb(true); } };
    s.onerror = function () { if (!done) { done = true; clearTimeout(timer); cb(false); } };
    document.head.appendChild(s);
  }

  function createFrog(THREE) {
    var group = new THREE.Group();

    // 材质（v1043a: 加轻微自发光，夜晚场景不发黑）
    var bodyMat = new THREE.MeshStandardMaterial({ color: 0xfbcf45, roughness: 0.6, metalness: 0.03, emissive: 0x2f2508 });
    var bellyMat = new THREE.MeshStandardMaterial({ color: 0xf3e8c8, roughness: 0.7, metalness: 0.02, emissive: 0x211d11 });
    var eyeMat = new THREE.MeshStandardMaterial({ color: 0x9fce6e, roughness: 0.35, metalness: 0.05 });
    var pupilMat = new THREE.MeshStandardMaterial({ color: 0x241f16, roughness: 0.25, metalness: 0 });
    var darkMat = new THREE.MeshStandardMaterial({ color: 0x8a8168, roughness: 0.75, metalness: 0 });

    // ===== 身体（v1043a: 旋转曲面，控制点测自三视图——圆头/窄脖/宽肚/圆底）=====
    var ctrl = [
      [-0.82, 0.56], [-0.60, 0.84], [-0.35, 1.00], [-0.12, 1.05],
      [0.10, 0.99], [0.32, 0.79], [0.52, 0.63], [0.78, 0.68],
      [1.06, 0.71], [1.30, 0.58], [1.45, 0.37], [1.54, 0.001]
    ];
    var pts3 = [];
    for (var ci = 0; ci < ctrl.length; ci++) pts3.push(new THREE.Vector3(ctrl[ci][1], ctrl[ci][0], 0));
    var curve = new THREE.CatmullRomCurve3(pts3);
    var lathePts = curve.getPoints(48).map(function (p) {
      return new THREE.Vector2(Math.max(p.x, 0.001), p.y);
    });
    var bodyGeo = new THREE.LatheGeometry(lathePts, 64);
    var body = new THREE.Mesh(bodyGeo, bodyMat);
    body.scale.z = 0.88; // 前后略扁
    body.castShadow = true;
    group.add(body);

    // 肚皮（大椭圆奶油色，微凸于身前）
    var bellyGeo = new THREE.SphereGeometry(1, 48, 48);
    var belly = new THREE.Mesh(bellyGeo, bellyMat);
    belly.scale.set(0.86, 0.58, 0.5);
    belly.position.set(0, -0.12, 0.55);
    belly.castShadow = true;
    group.add(belly);

    // 眼睛（嵌在头两侧表面，绿虹膜大黑瞳）
    var eyeGeo = new THREE.SphereGeometry(0.15, 32, 32);
    var eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.38, 1.16, 0.52);
    eyeL.scale.set(1, 1.07, 0.85);
    group.add(eyeL);
    var eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeR.position.set(0.38, 1.16, 0.52);
    eyeR.scale.set(1, 1.07, 0.85);
    group.add(eyeR);

    // 瞳孔
    var pupilGeo = new THREE.SphereGeometry(0.088, 24, 24);
    var pupilL = new THREE.Mesh(pupilGeo, pupilMat);
    pupilL.position.set(-0.38, 1.17, 0.62);
    pupilL.scale.set(1, 1.08, 0.6);
    group.add(pupilL);
    var pupilR = new THREE.Mesh(pupilGeo, pupilMat);
    pupilR.position.set(0.38, 1.17, 0.62);
    pupilR.scale.set(1, 1.08, 0.6);
    group.add(pupilR);

    // 高光
    var hlGeo = new THREE.SphereGeometry(0.03, 12, 12);
    var hlMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    var hlL = new THREE.Mesh(hlGeo, hlMat);
    hlL.position.set(-0.31, 1.22, 0.68);
    group.add(hlL);
    var hlR = new THREE.Mesh(hlGeo, hlMat);
    hlR.position.set(0.45, 1.22, 0.68);
    group.add(hlR);

    // 嘴巴（v1043a: 不再绕 X 旋转 90°——那会正面变成一条线；改在 XY 平面取下半弧=微笑）
    var mouthGeo = new THREE.TorusGeometry(0.26, 0.018, 8, 32, Math.PI);
    var mouthMat = new THREE.MeshBasicMaterial({ color: 0x5c4a2e });
    var mouth = new THREE.Mesh(mouthGeo, mouthMat);
    mouth.position.set(0, 0.98, 0.63);
    mouth.rotation.z = Math.PI;
    mouth.rotation.x = -0.12;
    group.add(mouth);

    // 手臂（贴身垂在体侧，上端连肩）
    var armGeo = new THREE.SphereGeometry(1, 32, 32);
    armGeo.scale(0.145, 0.46, 0.145);
    var armL = new THREE.Mesh(armGeo, bodyMat);
    armL.position.set(-0.94, -0.08, 0.30);
    armL.rotation.z = 0.16;
    group.add(armL);
    var armR = new THREE.Mesh(armGeo, bodyMat);
    armR.position.set(0.94, -0.08, 0.30);
    armR.rotation.z = -0.16;
    group.add(armR);

    // 手（深灰"手套"垂在肚皮两侧）
    var handGeo = new THREE.SphereGeometry(0.17, 24, 24);
    handGeo.scale(1, 1.3, 0.8);
    var handL = new THREE.Mesh(handGeo, darkMat);
    handL.position.set(-1.0, -0.5, 0.34);
    handL.rotation.z = 0.12;
    group.add(handL);
    var handR = new THREE.Mesh(handGeo, darkMat);
    handR.position.set(1.0, -0.5, 0.34);
    handR.rotation.z = -0.12;
    group.add(handR);

    // 腿（短粗外八）
    var legGeo = new THREE.SphereGeometry(1, 32, 32);
    legGeo.scale(0.28, 0.58, 0.24);
    var legL = new THREE.Mesh(legGeo, bodyMat);
    legL.position.set(-0.38, -1.20, 0);
    legL.rotation.z = -0.30;
    group.add(legL);
    var legR = new THREE.Mesh(legGeo, bodyMat);
    legR.position.set(0.38, -1.20, 0);
    legR.rotation.z = 0.30;
    group.add(legR);

    // 脚（大蹼）
    var footGeo = new THREE.SphereGeometry(0.30, 32, 32);
    footGeo.scale(1.45, 0.4, 0.95);
    var footL = new THREE.Mesh(footGeo, darkMat);
    footL.position.set(-0.52, -1.76, 0.16);
    footL.rotation.z = -0.21;
    group.add(footL);
    var footR = new THREE.Mesh(footGeo, darkMat);
    footR.position.set(0.52, -1.76, 0.16);
    footR.rotation.z = 0.21;
    group.add(footR);

    // 收藏关键部件供动画使用（bellyBase: 肚皮基准 scale，呼吸动画按它缩放）
    group.userData = {
      body: body, belly: belly,
      bellyBase: belly.scale.clone(),
      eyeL: eyeL, eyeR: eyeR,
      pupilL: pupilL, pupilR: pupilR,
      mouth: mouth,
      armL: armL, armR: armR,
      legL: legL, legR: legR
    };
    return group;
  }

  // v1042a: 外层包装。WebGL 不可用时 THREE 内部会抛异常，若不拦住会冒泡到 openTreePage()，
  // 导致树页面连 open 都加不上（用户看到"什么都没有"）。失败则静默返回 null，保留原图降级。
  function create(id, containerId, opts) {
    try {
      return createInner(id, containerId, opts);
    } catch (e) {
      console.warn("[Frog3D] 3D 初始化失败，保留原图显示:", (e && e.message) || e);
      try { dispose(id); } catch (e2) {}
      try {
        var c = document.getElementById(containerId);
        if (c) c.innerHTML = "";
      } catch (e3) {}
      return null;
    }
  }

  function createInner(id, containerId, opts) {
    opts = opts || {};
    if (!window.THREE) return null;
    var container = document.getElementById(containerId);
    if (!container) return null;

    // 清理旧实例
    dispose(id);

    var w = container.clientWidth || 200;
    var h = container.clientHeight || 200;
    var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.display = "block";
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(38, w / h, 0.1, 100);
    // v1043a: 相机自动适配——按容器宽高比计算距离，保证模型（高约3.4/宽约2.3）尽量占满可视区
    var FOVT = Math.tan(19 * Math.PI / 180);
    var needH = 1.80, needW = 1.30; // 模型半高/半宽 + 留白
    var autoZ = Math.max(needH / FOVT, needW / (FOVT * Math.max(w / h, 0.3)));
    camera.position.set(0, 0.15, opts.cameraZ || autoZ);
    camera.lookAt(0, -0.12, 0);

    // 灯光（v1043a: 半球光模拟均匀柔光，整体提亮，避免夜晚场景发黑）
    var hemi = new THREE.HemisphereLight(0xffffff, 0x9a8c5a, 0.55);
    scene.add(hemi);
    var ambient = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambient);
    var keyLight = new THREE.DirectionalLight(0xfff5e0, 1.0);
    keyLight.position.set(3, 5, 4);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    scene.add(keyLight);
    var fillLight = new THREE.DirectionalLight(0xd4ecff, 0.4);
    fillLight.position.set(-3, 2, 2);
    scene.add(fillLight);
    var rimLight = new THREE.DirectionalLight(0xffe9a0, 0.3);
    rimLight.position.set(0, 3, -4);
    scene.add(rimLight);

    // 地面阴影接收
    var groundGeo = new THREE.PlaneGeometry(10, 10);
    var groundMat = new THREE.ShadowMaterial({ opacity: 0.18 });
    var ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1.92;
    ground.receiveShadow = true;
    scene.add(ground);

    // 奶蛙
    var frog = createFrog(THREE);
    var scale = opts.scale || 1;
    frog.scale.set(scale, scale, scale);
    scene.add(frog);

    var inst = {
      id: id, container: container, renderer: renderer, scene: scene, camera: camera,
      frog: frog, animId: null, baseY: 0, time: 0,
      squishT: 0, squishDur: 0.7,
      wiggleT: 0, wiggleDur: 0.6,
      feedItems: []
    };
    instances[id] = inst;

    // 点击检测
    var raycaster = new THREE.Raycaster();
    var mouse = new THREE.Vector2();
    renderer.domElement.addEventListener("click", function (e) {
      var rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      var hits = raycaster.intersectObject(frog, true);
      if (hits.length > 0 && inst.onClick) inst.onClick();
    });

    // 动画循环
    var clock = new THREE.Clock();
    function animate() {
      inst.animId = requestAnimationFrame(animate);
      var dt = clock.getDelta();
      inst.time += dt;

      // 待机呼吸（肚皮按基准 scale 轻微缩放）
      var belly = frog.userData.belly;
      var bb = frog.userData.bellyBase;
      var breath = 1 + Math.sin(inst.time * 2.2) * 0.025;
      belly.scale.set(bb.x * breath, bb.y * breath, bb.z * breath);

      // Q弹动画
      if (inst.squishT > 0) {
        inst.squishT -= dt;
        var t = 1 - (inst.squishT / inst.squishDur);
        var s = 1;
        if (t < 0.3) s = 1 + Math.sin(t / 0.3 * Math.PI) * 0.14;
        else if (t < 0.65) s = 1 - Math.sin((t - 0.3) / 0.35 * Math.PI) * 0.08;
        else s = 1 + Math.sin((t - 0.65) / 0.35 * Math.PI) * 0.04;
        frog.scale.set(scale * (1 + (s - 1) * 0.7), scale * s, scale * (1 + (s - 1) * 0.7));
        belly.scale.multiplyScalar(1 + (s - 1) * 1.4);
      } else {
        frog.scale.set(scale, scale, scale);
      }

      // 摇摆动画
      if (inst.wiggleT > 0) {
        inst.wiggleT -= dt;
        var wt = 1 - (inst.wiggleT / inst.wiggleDur);
        frog.rotation.z = Math.sin(wt * Math.PI * 4) * 0.08 * (1 - wt);
        frog.rotation.y = Math.sin(wt * Math.PI * 2) * 0.06 * (1 - wt);
      } else {
        frog.rotation.z = 0;
        frog.rotation.y = 0;
      }

      // 喂食粒子
      for (var i = inst.feedItems.length - 1; i >= 0; i--) {
        var item = inst.feedItems[i];
        item.t += dt;
        var p = item.t / item.dur;
        if (p >= 1) {
          scene.remove(item.mesh);
          inst.feedItems.splice(i, 1);
          inst.squishT = inst.squishDur;
          inst.heartsT = 0.5;
          continue;
        }
        // 抛物线飞向肚皮
        item.mesh.position.x = item.startX + (item.endX - item.startX) * p;
        item.mesh.position.y = item.startY + (item.endY - item.startY) * p + Math.sin(p * Math.PI) * 0.9;
        item.mesh.position.z = item.startZ + (item.endZ - item.startZ) * p;
        item.mesh.scale.setScalar(0.6 + Math.sin(p * Math.PI) * 0.5);
      }

      // 缓慢旋转展示（小奶蛙场景开启）
      if (opts.autoRotate) {
        frog.rotation.y = Math.sin(inst.time * 0.35) * 0.35;
      }

      renderer.render(scene, camera);
    }
    animate();
    return inst;
  }

  function dispose(id) {
    var inst = instances[id];
    if (!inst) return;
    if (inst.animId) cancelAnimationFrame(inst.animId);
    if (inst.renderer) {
      inst.renderer.dispose();
      if (inst.renderer.domElement && inst.renderer.domElement.parentNode) {
        inst.renderer.domElement.parentNode.removeChild(inst.renderer.domElement);
      }
    }
    delete instances[id];
  }

  function squish(id) {
    var inst = instances[id];
    if (inst) inst.squishT = inst.squishDur;
  }

  function play(id) {
    var inst = instances[id];
    if (inst) inst.wiggleT = inst.wiggleDur;
  }

  function feed(id) {
    var inst = instances[id];
    if (!inst) return;
    var foods = ["🍓", "🍰", "🍼", "🐛", "🍇"];
    var food = foods[Math.floor(Math.random() * foods.length)];
    // 用 canvas 生成食物纹理
    var canvas = document.createElement("canvas");
    canvas.width = 64; canvas.height = 64;
    var ctx = canvas.getContext("2d");
    ctx.font = "48px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(food, 32, 32);
    var tex = new THREE.CanvasTexture(canvas);
    var mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide });
    var geo = new THREE.PlaneGeometry(0.35, 0.35);
    var mesh = new THREE.Mesh(geo, mat);
    var side = Math.random() > 0.5 ? 1 : -1;
    mesh.position.set(side * 2.2, 1.2, 1.2);
    inst.scene.add(mesh);
    inst.feedItems.push({
      mesh: mesh, t: 0, dur: 0.9,
      startX: side * 2.2, startY: 1.2, startZ: 1.2,
      endX: 0, endY: -0.1, endZ: 0.55
    });
  }

  function setMouth(id, type) {
    var inst = instances[id];
    if (!inst || !inst.frog.userData.mouth) return;
    // 饿的时候撇嘴（暂时用简单旋转实现）
    var mouth = inst.frog.userData.mouth;
    if (type === "sad") {
      mouth.rotation.x = Math.PI / 2;
      mouth.rotation.z = 0;
      mouth.position.y = 0.68;
    } else {
      mouth.rotation.x = Math.PI / 2;
      mouth.rotation.z = Math.PI;
      mouth.position.y = 0.72;
    }
  }

  return {
    loadThree: loadThree,
    create: create,
    dispose: dispose,
    squish: squish,
    play: play,
    feed: feed,
    setMouth: setMouth,
    get: function (id) { return instances[id]; }
  };
})();
