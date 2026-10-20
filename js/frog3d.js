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

    // 材质
    var bodyMat = new THREE.MeshStandardMaterial({ color: 0xf7c93e, roughness: 0.55, metalness: 0.05 });
    var bellyMat = new THREE.MeshStandardMaterial({ color: 0xf5e5b0, roughness: 0.65, metalness: 0.02 });
    var eyeMat = new THREE.MeshStandardMaterial({ color: 0x9bd476, roughness: 0.35, metalness: 0.1 });
    var pupilMat = new THREE.MeshStandardMaterial({ color: 0x1f1c16, roughness: 0.2, metalness: 0 });
    var handMat = new THREE.MeshStandardMaterial({ color: 0x6e6146, roughness: 0.7, metalness: 0 });

    // 身体（梨形：上窄下宽，拉长）
    var bodyGeo = new THREE.SphereGeometry(1, 48, 48);
    bodyGeo.scale(0.92, 1.42, 0.82);
    var body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.15;
    body.castShadow = true;
    group.add(body);

    // 肚皮（大圆，稍微凸出）
    var bellyGeo = new THREE.SphereGeometry(1, 48, 48);
    bellyGeo.scale(0.72, 0.92, 0.58);
    var belly = new THREE.Mesh(bellyGeo, bellyMat);
    belly.position.set(0, -0.12, 0.42);
    belly.castShadow = true;
    group.add(belly);

    // 头部（身体上半部自然形成，无需单独部件）

    // 眼睛
    var eyeGeo = new THREE.SphereGeometry(0.16, 32, 32);
    var eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.28, 0.95, 0.78);
    eyeL.scale.set(1, 1.15, 0.9);
    group.add(eyeL);
    var eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeR.position.set(0.28, 0.95, 0.78);
    eyeR.scale.set(1, 1.15, 0.9);
    group.add(eyeR);

    // 瞳孔
    var pupilGeo = new THREE.SphereGeometry(0.075, 24, 24);
    var pupilL = new THREE.Mesh(pupilGeo, pupilMat);
    pupilL.position.set(-0.28, 0.95, 0.88);
    pupilL.scale.set(1, 1.1, 0.7);
    group.add(pupilL);
    var pupilR = new THREE.Mesh(pupilGeo, pupilMat);
    pupilR.position.set(0.28, 0.95, 0.88);
    pupilR.scale.set(1, 1.1, 0.7);
    group.add(pupilR);

    // 高光
    var hlGeo = new THREE.SphereGeometry(0.03, 12, 12);
    var hlMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    var hlL = new THREE.Mesh(hlGeo, hlMat);
    hlL.position.set(-0.24, 1.0, 0.92);
    group.add(hlL);
    var hlR = new THREE.Mesh(hlGeo, hlMat);
    hlR.position.set(0.32, 1.0, 0.92);
    group.add(hlR);

    // 嘴巴（简单弧线用 Torus 截段）
    var mouthGeo = new THREE.TorusGeometry(0.11, 0.018, 8, 24, Math.PI);
    var mouthMat = new THREE.MeshBasicMaterial({ color: 0x6b5030 });
    var mouth = new THREE.Mesh(mouthGeo, mouthMat);
    mouth.position.set(0, 0.72, 0.82);
    mouth.rotation.x = Math.PI / 2;
    mouth.rotation.z = Math.PI;
    group.add(mouth);

    // 左臂（下垂）
    var armGeo = new THREE.SphereGeometry(1, 32, 32);
    armGeo.scale(0.14, 0.72, 0.14);
    var armL = new THREE.Mesh(armGeo, bodyMat);
    armL.position.set(-0.78, 0.15, 0.15);
    armL.rotation.z = 0.12;
    group.add(armL);
    // 右臂
    var armR = new THREE.Mesh(armGeo, bodyMat);
    armR.position.set(0.78, 0.15, 0.15);
    armR.rotation.z = -0.12;
    group.add(armR);

    // 左手掌
    var handGeo = new THREE.SphereGeometry(0.14, 24, 24);
    handGeo.scale(1, 0.75, 0.9);
    var handL = new THREE.Mesh(handGeo, handMat);
    handL.position.set(-0.88, -0.52, 0.2);
    handL.rotation.z = 0.15;
    group.add(handL);
    // 右手掌
    var handR = new THREE.Mesh(handGeo, handMat);
    handR.position.set(0.88, -0.52, 0.2);
    handR.rotation.z = -0.15;
    group.add(handR);

    // 左腿
    var legGeo = new THREE.SphereGeometry(1, 32, 32);
    legGeo.scale(0.22, 0.65, 0.18);
    var legL = new THREE.Mesh(legGeo, bodyMat);
    legL.position.set(-0.32, -1.12, 0);
    legL.rotation.z = -0.08;
    group.add(legL);
    // 右腿
    var legR = new THREE.Mesh(legGeo, bodyMat);
    legR.position.set(0.32, -1.12, 0);
    legR.rotation.z = 0.08;
    group.add(legR);

    // 左脚掌
    var footGeo = new THREE.SphereGeometry(0.28, 32, 32);
    footGeo.scale(1.15, 0.4, 0.75);
    var footL = new THREE.Mesh(footGeo, handMat);
    footL.position.set(-0.38, -1.78, 0.12);
    footL.rotation.z = -0.1;
    group.add(footL);
    // 右脚掌
    var footR = new THREE.Mesh(footGeo, handMat);
    footR.position.set(0.38, -1.78, 0.12);
    footR.rotation.z = 0.1;
    group.add(footR);

    // 收藏关键部件供动画使用
    group.userData = {
      body: body, belly: belly,
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
    camera.position.set(0, 0.3, opts.cameraZ || 4.2);
    camera.lookAt(0, 0.1, 0);

    // 灯光
    var ambient = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(ambient);
    var keyLight = new THREE.DirectionalLight(0xfff5e0, 1.1);
    keyLight.position.set(3, 5, 4);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    scene.add(keyLight);
    var fillLight = new THREE.DirectionalLight(0xd4ecff, 0.45);
    fillLight.position.set(-3, 2, 2);
    scene.add(fillLight);
    var rimLight = new THREE.DirectionalLight(0xffe9a0, 0.35);
    rimLight.position.set(0, 3, -4);
    scene.add(rimLight);

    // 地面阴影接收
    var groundGeo = new THREE.PlaneGeometry(10, 10);
    var groundMat = new THREE.ShadowMaterial({ opacity: 0.18 });
    var ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1.95;
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

      // 待机呼吸（肚皮轻微缩放）
      var belly = frog.userData.belly;
      var breath = 1 + Math.sin(inst.time * 2.2) * 0.025;
      belly.scale.set(0.72 * breath, 0.92 * breath, 0.58 * breath);

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
