class MarsRoverApp {
    constructor() {
        this.clock = new THREE.Clock();
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.currentView = 'perspective';

        this.init();
        setTimeout(() => this.onResize(), 100);
        this.animate();
    }

    init() {
        this.initThreeJS();
        this.initLighting();
        this.terrain = new MarsTerrain(this.scene);
        this.rover = new MecanumRover(this.scene);
        this.controls = new RoverControls();
        this.telemetry = new TelemetrySystem();

        this.lidarCanvas = document.getElementById('lidar-canvas');
        this.lidar = new LidarSTL19P(this.lidarCanvas);
        this.lidar.setObstacles(this.terrain.getObstacles());

        this.cameraFeedCanvas = document.getElementById('camera-feed');
        this.roverCam = new RoverCamera(this.cameraFeedCanvas);

        this.initSkybox();
        this.initUI();

        window.addEventListener('resize', () => this.onResize());
        this.onResize();
    }

    initThreeJS() {
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x6b3a1f, 0.008);

        const container = document.getElementById('three-viewport');
        const w = container.clientWidth;
        const h = container.clientHeight;

        this.camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 500);
        this.camera.position.set(8, 6, 8);
        this.camera.lookAt(0, 0, 0);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        this.renderer.setSize(w, h);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 0.8;
        container.appendChild(this.renderer.domElement);

        this.cameraOrbit = {
            theta: Math.PI / 4,
            phi: Math.PI / 4,
            distance: 12,
            target: new THREE.Vector3(),
        };

        this.initOrbitControls(container);
    }

    initOrbitControls(container) {
        let isDragging = false;
        let lastX, lastY;

        container.addEventListener('mousedown', (e) => {
            isDragging = true;
            lastX = e.clientX;
            lastY = e.clientY;
        });

        window.addEventListener('mousemove', (e) => {
            if (!isDragging || this.currentView !== 'perspective') return;
            const dx = e.clientX - lastX;
            const dy = e.clientY - lastY;
            this.cameraOrbit.theta -= dx * 0.005;
            this.cameraOrbit.phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.1,
                this.cameraOrbit.phi - dy * 0.005));
            lastX = e.clientX;
            lastY = e.clientY;
        });

        window.addEventListener('mouseup', () => isDragging = false);

        container.addEventListener('wheel', (e) => {
            e.preventDefault();
            this.cameraOrbit.distance = Math.max(4, Math.min(30,
                this.cameraOrbit.distance + e.deltaY * 0.01));
        }, { passive: false });
    }

    initLighting() {
        const ambient = new THREE.AmbientLight(0xffa070, 0.4);
        this.scene.add(ambient);

        const sun = new THREE.DirectionalLight(0xffccaa, 1.2);
        sun.position.set(50, 80, -30);
        sun.castShadow = true;
        sun.shadow.mapSize.width = 2048;
        sun.shadow.mapSize.height = 2048;
        sun.shadow.camera.near = 1;
        sun.shadow.camera.far = 200;
        sun.shadow.camera.left = -50;
        sun.shadow.camera.right = 50;
        sun.shadow.camera.top = 50;
        sun.shadow.camera.bottom = -50;
        this.scene.add(sun);

        const hemi = new THREE.HemisphereLight(0xffa060, 0x704030, 0.3);
        this.scene.add(hemi);

        const fillLight = new THREE.DirectionalLight(0x8888cc, 0.15);
        fillLight.position.set(-30, 20, 40);
        this.scene.add(fillLight);
    }

    initSkybox() {
        const skyGeo = new THREE.SphereGeometry(200, 32, 32);
        const skyCanvas = document.createElement('canvas');
        skyCanvas.width = 1024;
        skyCanvas.height = 512;
        const skyCtx = skyCanvas.getContext('2d');

        const grad = skyCtx.createLinearGradient(0, 0, 0, 512);
        grad.addColorStop(0, '#0a0505');
        grad.addColorStop(0.3, '#1a0a0a');
        grad.addColorStop(0.6, '#3d1e10');
        grad.addColorStop(0.85, '#6b3a1f');
        grad.addColorStop(1, '#8b5a30');
        skyCtx.fillStyle = grad;
        skyCtx.fillRect(0, 0, 1024, 512);

        for (let i = 0; i < 200; i++) {
            const x = Math.random() * 1024;
            const y = Math.random() * 256;
            const brightness = 150 + Math.random() * 105;
            skyCtx.fillStyle = `rgba(${brightness}, ${brightness}, ${brightness - 20}, ${0.5 + Math.random() * 0.5})`;
            skyCtx.beginPath();
            skyCtx.arc(x, y, 0.5 + Math.random() * 1, 0, Math.PI * 2);
            skyCtx.fill();
        }

        const skyTexture = new THREE.CanvasTexture(skyCanvas);
        const skyMat = new THREE.MeshBasicMaterial({
            map: skyTexture,
            side: THREE.BackSide,
        });
        const sky = new THREE.Mesh(skyGeo, skyMat);
        this.scene.add(sky);
    }

    initUI() {
        document.querySelectorAll('[data-view]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('[data-view]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentView = btn.dataset.view;
            });
        });

        document.querySelectorAll('[data-cam]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('[data-cam]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.roverCam.setMode(btn.dataset.cam);
            });
        });

        document.getElementById('btn-headlights')?.addEventListener('click', () => {
            const on = this.rover.toggleHeadlights();
            document.getElementById('btn-headlights').classList.toggle('active', on);
            this.telemetry.log(`Headlights ${on ? 'ON' : 'OFF'}`, on ? 'success' : 'warn');
        });

        document.getElementById('btn-lidar')?.addEventListener('click', () => {
            const btn = document.getElementById('btn-lidar');
            btn.classList.toggle('active');
            this.telemetry.log(
                `LIDAR ${btn.classList.contains('active') ? 'enabled' : 'disabled'}`,
                btn.classList.contains('active') ? 'success' : 'warn'
            );
        });

        document.getElementById('btn-estop')?.addEventListener('click', () => {
            this.controls.eStop = !this.controls.eStop;
            document.getElementById('btn-estop').classList.toggle('active', this.controls.eStop);
            this.telemetry.log(
                this.controls.eStop ? 'E-STOP ENGAGED' : 'E-STOP released',
                this.controls.eStop ? 'error' : 'success'
            );
        });

        document.getElementById('btn-horn')?.addEventListener('click', () => {
            this.telemetry.log('Horn activated', 'info');
        });

        document.getElementById('btn-arm')?.addEventListener('click', () => {
            const btn = document.getElementById('btn-arm');
            btn.classList.toggle('active');
            this.telemetry.log(
                `Arm ${btn.classList.contains('active') ? 'deployed' : 'stowed'}`,
                'info'
            );
        });

        document.getElementById('btn-auto')?.addEventListener('click', () => {
            const btn = document.getElementById('btn-auto');
            btn.classList.toggle('active');
            const autoMode = btn.classList.contains('active');
            const label = document.getElementById('drive-mode-label');
            if (label) label.textContent = autoMode ? 'AUTO' : 'MANUAL';
            this.telemetry.log(
                `Drive mode: ${autoMode ? 'AUTONOMOUS' : 'MANUAL'}`,
                autoMode ? 'warn' : 'info'
            );
        });

        document.getElementById('clear-console')?.addEventListener('click', () => {
            const consoleEl = document.getElementById('console-output');
            if (consoleEl) consoleEl.innerHTML = '';
        });

        const lidarScale = document.getElementById('lidar-scale');
        lidarScale?.addEventListener('input', () => {
            const val = parseInt(lidarScale.value);
            this.lidar.setScale(val);
            document.getElementById('lidar-range').textContent = val + 'm';
        });
    }

    updateCamera() {
        const roverPos = this.rover.getWorldPosition();
        const heading = this.rover.getHeading();

        switch (this.currentView) {
            case 'perspective': {
                const target = roverPos.clone();
                this.cameraOrbit.target.lerp(target, 0.05);

                const x = Math.sin(this.cameraOrbit.theta) * Math.cos(this.cameraOrbit.phi) * this.cameraOrbit.distance;
                const y = Math.sin(this.cameraOrbit.phi) * this.cameraOrbit.distance;
                const z = Math.cos(this.cameraOrbit.theta) * Math.cos(this.cameraOrbit.phi) * this.cameraOrbit.distance;

                this.camera.position.set(
                    this.cameraOrbit.target.x + x,
                    this.cameraOrbit.target.y + y,
                    this.cameraOrbit.target.z + z
                );
                this.camera.lookAt(this.cameraOrbit.target);
                break;
            }
            case 'top': {
                this.camera.position.set(roverPos.x, roverPos.y + 20, roverPos.z);
                this.camera.lookAt(roverPos);
                this.camera.up.set(-Math.sin(heading), 0, -Math.cos(heading));
                break;
            }
            case 'front': {
                const frontDist = 3;
                this.camera.position.set(
                    roverPos.x - Math.sin(heading) * frontDist,
                    roverPos.y + 1.5,
                    roverPos.z - Math.cos(heading) * frontDist
                );
                this.camera.lookAt(roverPos.x, roverPos.y + 0.5, roverPos.z);
                break;
            }
            case 'chase': {
                const chaseDist = 6;
                const chaseHeight = 3;
                this.camera.position.set(
                    roverPos.x + Math.sin(heading) * chaseDist,
                    roverPos.y + chaseHeight,
                    roverPos.z + Math.cos(heading) * chaseDist
                );
                this.camera.lookAt(
                    roverPos.x - Math.sin(heading) * 2,
                    roverPos.y,
                    roverPos.z - Math.cos(heading) * 2
                );
                break;
            }
        }
    }

    onResize() {
        const container = document.getElementById('three-viewport');
        if (container) {
            const w = container.clientWidth;
            const h = container.clientHeight;
            this.camera.aspect = w / h;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(w, h);
        }

        this.lidar.resize();
        this.roverCam.resize();
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        const dt = Math.min(this.clock.getDelta(), 0.05);

        this.controls.update();
        const controlState = this.controls.getState();

        this.rover.update(dt, controlState, this.terrain);

        this.updateCamera();

        this.lidar.updateRoverState(
            this.rover.position.x,
            this.rover.position.z,
            this.rover.heading
        );
        this.lidar.simulateScan();
        this.lidar.render();

        const lidarPts = document.getElementById('lidar-points');
        if (lidarPts) lidarPts.textContent = this.lidar.getPointCount();

        this.roverCam.update(dt, this.rover.speed, this.rover.heading);
        this.roverCam.render();

        this.telemetry.update(this.rover, controlState, dt);

        this.renderer.render(this.scene, this.camera);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.app = new MarsRoverApp();
});
