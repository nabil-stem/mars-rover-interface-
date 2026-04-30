class RoverCamera {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.mode = 'front';
        this.horizonOffset = 0;
        this.roverSpeed = 0;
        this.roverHeading = 0;
        this.time = 0;
        this.stars = [];
        this.terrainSeed = Math.random() * 1000;

        for (let i = 0; i < 60; i++) {
            this.stars.push({
                x: Math.random(),
                y: Math.random() * 0.35,
                brightness: 0.3 + Math.random() * 0.7,
                size: 0.5 + Math.random() * 1,
            });
        }

        this.resize();
    }

    resize() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        const headerH = this.canvas.parentElement.querySelector('.panel-header')?.offsetHeight || 32;
        this.canvas.width = rect.width;
        this.canvas.height = rect.height - headerH;
    }

    setMode(mode) {
        this.mode = mode;
    }

    update(dt, roverSpeed, roverHeading) {
        this.roverSpeed = roverSpeed;
        this.roverHeading = roverHeading;
        this.time += dt;
    }

    render() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        const shake = this.roverSpeed * 1.5;
        const shakeX = Math.sin(this.time * 15) * shake;
        const shakeY = Math.cos(this.time * 12) * shake;

        ctx.save();
        ctx.translate(shakeX, shakeY);

        const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.45);
        skyGrad.addColorStop(0, '#1a0a0a');
        skyGrad.addColorStop(0.3, '#2d1810');
        skyGrad.addColorStop(0.7, '#6b3a1f');
        skyGrad.addColorStop(1, '#c07040');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, w, h * 0.45);

        this.stars.forEach(star => {
            const flicker = 0.7 + Math.sin(this.time * 3 + star.x * 100) * 0.3;
            ctx.fillStyle = `rgba(255, 255, 240, ${star.brightness * flicker})`;
            ctx.beginPath();
            ctx.arc(star.x * w, star.y * h, star.size, 0, Math.PI * 2);
            ctx.fill();
        });

        const horizonY = h * 0.45;
        const groundGrad = ctx.createLinearGradient(0, horizonY, 0, h);
        groundGrad.addColorStop(0, '#b07050');
        groundGrad.addColorStop(0.3, '#a06040');
        groundGrad.addColorStop(1, '#704030');
        ctx.fillStyle = groundGrad;
        ctx.fillRect(0, horizonY, w, h - horizonY);

        ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.lineWidth = 0.5;
        for (let i = 0; i < 30; i++) {
            const y = horizonY + (i / 30) * (h - horizonY);
            const perspScale = (y - horizonY) / (h - horizonY);

            for (let j = 0; j < 15; j++) {
                const baseX = ((j + this.time * this.roverSpeed * 0.3 + this.terrainSeed) % 15) / 15;
                const x = (baseX - 0.5) * w * (1 + perspScale * 3) + w / 2;
                const size = 2 + perspScale * 8;
                const detailOff = Math.sin(i * 3.7 + j * 2.1 + this.terrainSeed) * 5;

                ctx.fillStyle = `rgba(${80 + Math.random() * 20}, ${40 + Math.random() * 15}, ${20 + Math.random() * 10}, ${0.2 + perspScale * 0.3})`;
                ctx.beginPath();
                ctx.arc(x + detailOff, y, size, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        this.drawDistantMountains(ctx, w, h, horizonY);

        if (this.mode === 'front') {
            this.drawHUD(ctx, w, h, 'NAVCAM-F');
        } else if (this.mode === 'rear') {
            ctx.save();
            ctx.scale(-1, 1);
            ctx.translate(-w, 0);
            ctx.restore();
            this.drawHUD(ctx, w, h, 'NAVCAM-R');
        } else {
            this.drawHUD(ctx, w, h, 'NAVCAM-N');
        }

        this.drawScanlines(ctx, w, h);

        ctx.restore();
    }

    drawDistantMountains(ctx, w, h, horizonY) {
        ctx.fillStyle = 'rgba(100, 55, 35, 0.6)';
        ctx.beginPath();
        ctx.moveTo(0, horizonY);
        for (let x = 0; x <= w; x += 3) {
            const nx = x / w;
            const mh = Math.sin(nx * 5 + this.terrainSeed) * 20
                + Math.sin(nx * 12 + this.terrainSeed * 2) * 8
                + Math.sin(nx * 2 + 0.5) * 30;
            ctx.lineTo(x, horizonY - Math.max(0, mh));
        }
        ctx.lineTo(w, horizonY);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = 'rgba(120, 65, 40, 0.4)';
        ctx.beginPath();
        ctx.moveTo(0, horizonY);
        for (let x = 0; x <= w; x += 3) {
            const nx = x / w;
            const mh = Math.sin(nx * 8 + this.terrainSeed + 2) * 12
                + Math.sin(nx * 3 + 1) * 18;
            ctx.lineTo(x, horizonY - Math.max(0, mh));
        }
        ctx.lineTo(w, horizonY);
        ctx.closePath();
        ctx.fill();
    }

    drawHUD(ctx, w, h, label) {
        ctx.strokeStyle = 'rgba(255, 107, 53, 0.3)';
        ctx.lineWidth = 1;

        const cx = w / 2;
        const cy = h * 0.45;
        ctx.beginPath();
        ctx.moveTo(cx - 30, cy);
        ctx.lineTo(cx - 8, cy);
        ctx.moveTo(cx + 8, cy);
        ctx.lineTo(cx + 30, cy);
        ctx.moveTo(cx, cy - 30);
        ctx.lineTo(cx, cy - 8);
        ctx.moveTo(cx, cy + 8);
        ctx.lineTo(cx, cy + 30);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(255, 107, 53, 0.15)';
        ctx.strokeRect(8, 8, w - 16, h - 16);

        const cornerSize = 15;
        ctx.strokeStyle = 'rgba(255, 107, 53, 0.4)';
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(8, 8 + cornerSize); ctx.lineTo(8, 8); ctx.lineTo(8 + cornerSize, 8);
        ctx.moveTo(w - 8 - cornerSize, 8); ctx.lineTo(w - 8, 8); ctx.lineTo(w - 8, 8 + cornerSize);
        ctx.moveTo(w - 8, h - 8 - cornerSize); ctx.lineTo(w - 8, h - 8); ctx.lineTo(w - 8 - cornerSize, h - 8);
        ctx.moveTo(8 + cornerSize, h - 8); ctx.lineTo(8, h - 8); ctx.lineTo(8, h - 8 - cornerSize);
        ctx.stroke();

        ctx.fillStyle = 'rgba(255, 107, 53, 0.6)';
        ctx.font = '10px JetBrains Mono';
        ctx.textAlign = 'left';
        ctx.fillText(label, 16, 24);

        ctx.textAlign = 'right';
        ctx.fillText(`HDG: ${(this.roverHeading * 180 / Math.PI).toFixed(1)}°`, w - 16, 24);
        ctx.fillText(`SPD: ${this.roverSpeed.toFixed(2)} m/s`, w - 16, 38);
    }

    drawScanlines(ctx, w, h) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.03)';
        for (let y = 0; y < h; y += 2) {
            ctx.fillRect(0, y, w, 1);
        }

        const vignetteGrad = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.8);
        vignetteGrad.addColorStop(0, 'rgba(0,0,0,0)');
        vignetteGrad.addColorStop(1, 'rgba(0,0,0,0.4)');
        ctx.fillStyle = vignetteGrad;
        ctx.fillRect(0, 0, w, h);
    }
}
