class MarsTerrain {
    constructor(scene) {
        this.scene = scene;
        this.chunks = [];
        this.build();
    }

    build() {
        const size = 200;
        const segments = 128;
        const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
        geometry.rotateX(-Math.PI / 2);

        const vertices = geometry.attributes.position.array;
        for (let i = 0; i < vertices.length; i += 3) {
            const x = vertices[i];
            const z = vertices[i + 2];
            vertices[i + 1] = this.getHeight(x, z);
        }
        geometry.computeVertexNormals();

        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        this.generateTerrainTexture(ctx, 512, 512);
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(4, 4);

        const material = new THREE.MeshStandardMaterial({
            map: texture,
            roughness: 0.95,
            metalness: 0.05,
            flatShading: false,
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.receiveShadow = true;
        this.scene.add(this.mesh);

        this.addRocks();
        this.addCraters();
    }

    getHeight(x, z) {
        let h = 0;
        h += Math.sin(x * 0.02) * Math.cos(z * 0.02) * 3;
        h += Math.sin(x * 0.05 + 1.3) * Math.cos(z * 0.04 + 0.7) * 1.5;
        h += Math.sin(x * 0.1 + 2.1) * Math.cos(z * 0.08 + 1.2) * 0.5;
        h += (Math.sin(x * 0.3) * Math.sin(z * 0.3)) * 0.3;

        const cx = 30, cz = -20, cr = 15;
        const dist = Math.sqrt((x - cx) ** 2 + (z - cz) ** 2);
        if (dist < cr) {
            h -= (1 - dist / cr) * 4;
            if (dist > cr * 0.7) {
                h += (dist / cr - 0.7) * 2;
            }
        }
        return h;
    }

    getHeightAt(x, z) {
        return this.getHeight(x, z);
    }

    generateTerrainTexture(ctx, w, h) {
        const baseR = 180, baseG = 120, baseB = 80;
        const imageData = ctx.createImageData(w, h);
        for (let i = 0; i < imageData.data.length; i += 4) {
            const variation = (Math.random() - 0.5) * 40;
            imageData.data[i] = Math.min(255, Math.max(0, baseR + variation));
            imageData.data[i + 1] = Math.min(255, Math.max(0, baseG + variation * 0.6));
            imageData.data[i + 2] = Math.min(255, Math.max(0, baseB + variation * 0.4));
            imageData.data[i + 3] = 255;
        }
        ctx.putImageData(imageData, 0, 0);
    }

    addRocks() {
        const rockGeo = new THREE.DodecahedronGeometry(1, 0);
        const rockMat = new THREE.MeshStandardMaterial({
            color: 0x8b6914,
            roughness: 0.9,
            metalness: 0.1,
            flatShading: true,
        });

        for (let i = 0; i < 80; i++) {
            const rock = new THREE.Mesh(rockGeo, rockMat.clone());
            const x = (Math.random() - 0.5) * 160;
            const z = (Math.random() - 0.5) * 160;
            const scale = 0.2 + Math.random() * 1.2;
            rock.position.set(x, this.getHeight(x, z) + scale * 0.3, z);
            rock.scale.set(scale, scale * (0.5 + Math.random() * 0.5), scale);
            rock.rotation.set(Math.random() * 0.5, Math.random() * Math.PI * 2, Math.random() * 0.3);
            rock.castShadow = true;
            rock.receiveShadow = true;
            rock.userData.isObstacle = true;
            rock.userData.radius = scale;
            this.scene.add(rock);
            this.chunks.push(rock);
        }
    }

    addCraters() {
        const craterPositions = [
            { x: -40, z: 30, r: 8 },
            { x: 50, z: 50, r: 6 },
            { x: -60, z: -40, r: 10 },
        ];

        craterPositions.forEach(c => {
            const ringGeo = new THREE.TorusGeometry(c.r, 0.8, 6, 24);
            ringGeo.rotateX(Math.PI / 2);
            const ringMat = new THREE.MeshStandardMaterial({
                color: 0x9b7653,
                roughness: 0.95,
                flatShading: true,
            });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.position.set(c.x, this.getHeight(c.x, c.z) + 0.3, c.z);
            ring.receiveShadow = true;
            this.scene.add(ring);
        });
    }

    getObstacles() {
        return this.chunks.filter(c => c.userData.isObstacle);
    }
}
