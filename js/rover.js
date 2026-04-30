class MecanumRover {
    constructor(scene) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.wheels = [];
        this.wheelRPMs = [0, 0, 0, 0];
        this.position = new THREE.Vector3(0, 0, 0);
        this.heading = 0;
        this.pitch = 0;
        this.roll = 0;
        this.speed = 0;
        this.odometer = 0;
        this.headlightsOn = false;
        this.headlights = [];

        this.vx = 0;
        this.vy = 0;
        this.vr = 0;

        this.maxSpeed = 2.5;
        this.maxRotSpeed = 1.8;

        this.build();
        scene.add(this.group);
    }

    build() {
        this.buildChassis();
        this.buildWheels();
        this.buildSuspension();
        this.buildBody();
        this.buildLidarMount();
        this.buildCamera();
        this.buildHeadlights();
        this.buildAntenna();
        this.buildSolarPanels();
    }

    buildChassis() {
        const chassisGeo = new THREE.BoxGeometry(2.4, 0.3, 3.2);
        const chassisMat = new THREE.MeshStandardMaterial({
            color: 0x2a2a2a,
            roughness: 0.7,
            metalness: 0.6,
        });
        this.chassis = new THREE.Mesh(chassisGeo, chassisMat);
        this.chassis.castShadow = true;
        this.group.add(this.chassis);
    }

    buildWheels() {
        const wheelPositions = [
            { x: -1.3, y: -0.25, z: -1.2, label: 'FL' },
            { x: 1.3, y: -0.25, z: -1.2, label: 'FR' },
            { x: -1.3, y: -0.25, z: 1.2, label: 'RL' },
            { x: 1.3, y: -0.25, z: 1.2, label: 'RR' },
        ];

        wheelPositions.forEach((pos, i) => {
            const wheelGroup = new THREE.Group();

            const hubGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.3, 16);
            hubGeo.rotateZ(Math.PI / 2);
            const hubMat = new THREE.MeshStandardMaterial({
                color: 0x444444,
                roughness: 0.4,
                metalness: 0.8,
            });
            const hub = new THREE.Mesh(hubGeo, hubMat);
            hub.castShadow = true;
            wheelGroup.add(hub);

            const rollerCount = 8;
            for (let j = 0; j < rollerCount; j++) {
                const angle = (j / rollerCount) * Math.PI * 2;
                const rollerGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.32, 6);
                const rollerMat = new THREE.MeshStandardMaterial({
                    color: 0x666666,
                    roughness: 0.5,
                    metalness: 0.7,
                });
                const roller = new THREE.Mesh(rollerGeo, rollerMat);

                const mecanumAngle = (i === 0 || i === 3) ? Math.PI / 4 : -Math.PI / 4;
                roller.rotation.z = mecanumAngle;
                roller.position.set(
                    0,
                    Math.sin(angle) * 0.35,
                    Math.cos(angle) * 0.35
                );
                roller.castShadow = true;
                wheelGroup.add(roller);
            }

            const rimGeo = new THREE.TorusGeometry(0.35, 0.04, 6, 16);
            rimGeo.rotateY(Math.PI / 2);
            const rimMat = new THREE.MeshStandardMaterial({
                color: 0xff6b35,
                roughness: 0.3,
                metalness: 0.8,
                emissive: 0xff6b35,
                emissiveIntensity: 0.1,
            });
            const rim = new THREE.Mesh(rimGeo, rimMat);
            wheelGroup.add(rim);

            wheelGroup.position.set(pos.x, pos.y, pos.z);
            this.wheels.push(wheelGroup);
            this.group.add(wheelGroup);
        });
    }

    buildSuspension() {
        const suspMat = new THREE.MeshStandardMaterial({
            color: 0x333333,
            roughness: 0.6,
            metalness: 0.7,
        });

        this.wheels.forEach(wheel => {
            const armGeo = new THREE.BoxGeometry(0.5, 0.08, 0.08);
            const arm = new THREE.Mesh(armGeo, suspMat);
            arm.position.set(
                wheel.position.x * 0.6,
                wheel.position.y + 0.1,
                wheel.position.z
            );
            arm.castShadow = true;
            this.group.add(arm);
        });
    }

    buildBody() {
        const bodyGeo = new THREE.BoxGeometry(1.8, 0.6, 2.2);
        const bodyMat = new THREE.MeshStandardMaterial({
            color: 0xcccccc,
            roughness: 0.5,
            metalness: 0.4,
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.45;
        body.castShadow = true;
        this.group.add(body);

        const topGeo = new THREE.BoxGeometry(1.4, 0.15, 1.8);
        const topMat = new THREE.MeshStandardMaterial({
            color: 0x1a1a2e,
            roughness: 0.3,
            metalness: 0.5,
        });
        const top = new THREE.Mesh(topGeo, topMat);
        top.position.y = 0.82;
        top.castShadow = true;
        this.group.add(top);

        const panelMat = new THREE.MeshStandardMaterial({
            color: 0xff6b35,
            roughness: 0.4,
            metalness: 0.3,
            emissive: 0xff6b35,
            emissiveIntensity: 0.05,
        });

        [-0.91, 0.91].forEach(x => {
            const stripe = new THREE.Mesh(
                new THREE.BoxGeometry(0.02, 0.55, 2.15),
                panelMat
            );
            stripe.position.set(x, 0.45, 0);
            this.group.add(stripe);
        });
    }

    buildLidarMount() {
        const mastGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.5, 8);
        const mastMat = new THREE.MeshStandardMaterial({
            color: 0x555555,
            metalness: 0.7,
            roughness: 0.3,
        });
        const mast = new THREE.Mesh(mastGeo, mastMat);
        mast.position.set(0, 1.15, -0.5);
        mast.castShadow = true;
        this.group.add(mast);

        const lidarGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.12, 16);
        const lidarMat = new THREE.MeshStandardMaterial({
            color: 0x222222,
            metalness: 0.8,
            roughness: 0.2,
        });
        this.lidarHead = new THREE.Mesh(lidarGeo, lidarMat);
        this.lidarHead.position.set(0, 1.45, -0.5);
        this.lidarHead.castShadow = true;
        this.group.add(this.lidarHead);

        const lensGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.04, 16);
        const lensMat = new THREE.MeshStandardMaterial({
            color: 0x00ff88,
            emissive: 0x00ff88,
            emissiveIntensity: 0.3,
            transparent: true,
            opacity: 0.6,
        });
        const lens = new THREE.Mesh(lensGeo, lensMat);
        lens.position.set(0, 1.52, -0.5);
        this.group.add(lens);
    }

    buildCamera() {
        const camGeo = new THREE.BoxGeometry(0.25, 0.18, 0.15);
        const camMat = new THREE.MeshStandardMaterial({
            color: 0x111111,
            metalness: 0.8,
            roughness: 0.2,
        });
        const cam = new THREE.Mesh(camGeo, camMat);
        cam.position.set(0, 0.85, -1.15);
        cam.castShadow = true;
        this.group.add(cam);

        const lensGeo = new THREE.CylinderGeometry(0.05, 0.07, 0.06, 8);
        lensGeo.rotateX(Math.PI / 2);
        const lensMat = new THREE.MeshStandardMaterial({
            color: 0x2244aa,
            emissive: 0x2244aa,
            emissiveIntensity: 0.3,
        });
        const lens = new THREE.Mesh(lensGeo, lensMat);
        lens.position.set(0, 0.85, -1.23);
        this.group.add(lens);
    }

    buildHeadlights() {
        const lightPositions = [
            { x: -0.7, z: -1.15 },
            { x: 0.7, z: -1.15 },
        ];

        lightPositions.forEach(pos => {
            const housingGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.1, 8);
            housingGeo.rotateX(Math.PI / 2);
            const housingMat = new THREE.MeshStandardMaterial({
                color: 0x333333,
                metalness: 0.8,
            });
            const housing = new THREE.Mesh(housingGeo, housingMat);
            housing.position.set(pos.x, 0.5, pos.z);
            this.group.add(housing);

            const light = new THREE.SpotLight(0xffeedd, 0, 20, Math.PI / 6, 0.5);
            light.position.set(pos.x, 0.5, pos.z - 0.1);
            light.target.position.set(pos.x, 0, pos.z - 10);
            light.castShadow = true;
            this.group.add(light);
            this.group.add(light.target);
            this.headlights.push(light);

            const glowGeo = new THREE.CircleGeometry(0.07, 8);
            const glowMat = new THREE.MeshBasicMaterial({
                color: 0xffeedd,
                transparent: true,
                opacity: 0,
            });
            const glow = new THREE.Mesh(glowGeo, glowMat);
            glow.position.set(pos.x, 0.5, pos.z - 0.06);
            glow.userData.isHeadlightGlow = true;
            this.group.add(glow);
        });
    }

    buildAntenna() {
        const points = [];
        for (let i = 0; i <= 10; i++) {
            const t = i / 10;
            points.push(new THREE.Vector3(0, t * 0.8, 0));
        }
        const curve = new THREE.CatmullRomCurve3(points);
        const antGeo = new THREE.TubeGeometry(curve, 10, 0.02, 6, false);
        const antMat = new THREE.MeshStandardMaterial({
            color: 0x888888,
            metalness: 0.8,
        });
        const antenna = new THREE.Mesh(antGeo, antMat);
        antenna.position.set(0.6, 0.85, 0.5);
        this.group.add(antenna);

        const tipGeo = new THREE.SphereGeometry(0.04, 8, 8);
        const tipMat = new THREE.MeshStandardMaterial({
            color: 0xff0000,
            emissive: 0xff0000,
            emissiveIntensity: 0.5,
        });
        const tip = new THREE.Mesh(tipGeo, tipMat);
        tip.position.set(0.6, 1.65, 0.5);
        this.group.add(tip);
    }

    buildSolarPanels() {
        const panelGeo = new THREE.BoxGeometry(1.2, 0.03, 0.8);
        const panelMat = new THREE.MeshStandardMaterial({
            color: 0x1a1a3e,
            metalness: 0.3,
            roughness: 0.4,
        });

        [-0.7, 0.7].forEach(side => {
            const panel = new THREE.Mesh(panelGeo, panelMat);
            panel.position.set(side * 1.4, 0.9, 0.3);
            panel.rotation.z = side * -0.15;
            panel.castShadow = true;
            this.group.add(panel);

            const gridMat = new THREE.MeshStandardMaterial({
                color: 0x222255,
                metalness: 0.2,
                wireframe: true,
            });
            const grid = new THREE.Mesh(panelGeo.clone(), gridMat);
            grid.position.copy(panel.position);
            grid.position.y += 0.02;
            grid.rotation.copy(panel.rotation);
            this.group.add(grid);
        });
    }

    toggleHeadlights() {
        this.headlightsOn = !this.headlightsOn;
        this.headlights.forEach(l => {
            l.intensity = this.headlightsOn ? 2 : 0;
        });
        this.group.children.forEach(child => {
            if (child.userData.isHeadlightGlow) {
                child.material.opacity = this.headlightsOn ? 0.8 : 0;
            }
        });
        return this.headlightsOn;
    }

    computeWheelRPMs(vx, vy, vr) {
        const fl = vy + vx + vr;
        const fr = vy - vx - vr;
        const rl = vy - vx + vr;
        const rr = vy + vx - vr;

        const maxRPM = 800;
        const scale = maxRPM / this.maxSpeed;
        return [fl * scale, fr * scale, rl * scale, rr * scale];
    }

    update(dt, controls, terrain) {
        const { translateX, translateY, rotate } = controls;

        const accel = 4.0;
        const decel = 6.0;

        if (Math.abs(translateX) > 0.01) {
            this.vx += translateX * accel * dt;
        } else {
            this.vx *= (1 - decel * dt);
        }
        if (Math.abs(translateY) > 0.01) {
            this.vy += translateY * accel * dt;
        } else {
            this.vy *= (1 - decel * dt);
        }
        if (Math.abs(rotate) > 0.01) {
            this.vr += rotate * accel * 0.8 * dt;
        } else {
            this.vr *= (1 - decel * dt);
        }

        this.vx = Math.max(-this.maxSpeed, Math.min(this.maxSpeed, this.vx));
        this.vy = Math.max(-this.maxSpeed, Math.min(this.maxSpeed, this.vy));
        this.vr = Math.max(-this.maxRotSpeed, Math.min(this.maxRotSpeed, this.vr));

        this.heading += this.vr * dt;

        const cosH = Math.cos(this.heading);
        const sinH = Math.sin(this.heading);
        const worldVx = this.vx * cosH - this.vy * sinH;
        const worldVz = this.vx * sinH + this.vy * cosH;

        this.position.x += worldVx * dt;
        this.position.z += worldVz * dt;

        this.speed = Math.sqrt(this.vx ** 2 + this.vy ** 2);
        this.odometer += this.speed * dt;

        if (terrain) {
            const h = terrain.getHeightAt(this.position.x, this.position.z);
            this.position.y = h + 0.6;

            const sampleDist = 1.5;
            const hFront = terrain.getHeightAt(
                this.position.x - Math.sin(this.heading) * sampleDist,
                this.position.z - Math.cos(this.heading) * sampleDist
            );
            const hBack = terrain.getHeightAt(
                this.position.x + Math.sin(this.heading) * sampleDist,
                this.position.z + Math.cos(this.heading) * sampleDist
            );
            const hLeft = terrain.getHeightAt(
                this.position.x - Math.cos(this.heading) * sampleDist,
                this.position.z + Math.sin(this.heading) * sampleDist
            );
            const hRight = terrain.getHeightAt(
                this.position.x + Math.cos(this.heading) * sampleDist,
                this.position.z - Math.sin(this.heading) * sampleDist
            );

            this.pitch = Math.atan2(hFront - hBack, sampleDist * 2) * 0.5;
            this.roll = Math.atan2(hLeft - hRight, sampleDist * 2) * 0.5;
        }

        this.group.position.copy(this.position);
        this.group.rotation.y = this.heading;
        this.group.rotation.x = this.pitch;
        this.group.rotation.z = this.roll;

        this.wheelRPMs = this.computeWheelRPMs(this.vx, this.vy, this.vr);

        const wheelRotSpeed = this.speed * 3;
        this.wheels.forEach((wheel, i) => {
            wheel.children[0].rotation.x += this.wheelRPMs[i] * dt * 0.01;
        });

        if (this.lidarHead) {
            this.lidarHead.rotation.y += dt * 10;
        }
    }

    getWorldPosition() {
        return this.group.position.clone();
    }

    getHeading() {
        return this.heading;
    }
}
