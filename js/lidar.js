class LidarSTL19P {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.points = [];
        this.scanAngle = 0;
        this.maxRange = 12;
        this.scale = 12;
        this.rpm = 600;
        this.frequency = 10;
        this.pointsPerScan = 2300;
        this.obstacles = [];
        this.roverX = 0;
        this.roverZ = 0;
        this.roverHeading = 0;
        this.trailPoints = [];
        this.maxTrailPoints = 500;

        this.resize();
    }

    resize() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        const headerH = this.canvas.parentElement.querySelector('.panel-header')?.offsetHeight || 32;
        const controlsH = this.canvas.parentElement.querySelector('.lidar-controls')?.offsetHeight || 50;
        this.canvas.width = Math.max(100, rect.width);
        this.canvas.height = Math.max(100, rect.height - headerH - controlsH);
        this.cx = this.canvas.width / 2;
        this.cy = this.canvas.height / 2;
        this.pixelScale = Math.min(this.canvas.width, this.canvas.height) / (this.scale * 2.2);
    }

    setObstacles(obstacles) {
        this.obstacles = obstacles;
    }

    updateRoverState(x, z, heading) {
        this.roverX = x;
        this.roverZ = z;
        this.roverHeading = heading;
    }

    simulateScan() {
        this.points = [];
        const numRays = this.pointsPerScan;

        for (let i = 0; i < numRays; i++) {
            const angle = (i / numRays) * Math.PI * 2;
            const worldAngle = angle + this.roverHeading;

            let hitDist = this.maxRange + Math.random() * 0.5;
            let hitIntensity = 0.1;

            for (const obs of this.obstacles) {
                const dx = obs.position.x - this.roverX;
                const dz = obs.position.z - this.roverZ;
                const dist = Math.sqrt(dx * dx + dz * dz);
                const obsAngle = Math.atan2(dx, dz);

                let angleDiff = worldAngle - obsAngle;
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

                const angularSize = Math.atan2(obs.userData.radius || 0.5, dist);
                if (Math.abs(angleDiff) < angularSize && dist < hitDist) {
                    hitDist = dist - (obs.userData.radius || 0.5) * 0.5;
                    hitIntensity = Math.min(1.0, 2.0 / dist);
                }
            }

            const wallDist = 80;
            const wx = this.roverX + Math.sin(worldAngle) * wallDist;
            const wz = this.roverZ + Math.cos(worldAngle) * wallDist;

            hitDist = Math.max(0.2, hitDist + (Math.random() - 0.5) * 0.1);

            if (hitDist <= this.maxRange) {
                this.points.push({
                    angle: angle,
                    distance: hitDist,
                    intensity: hitIntensity,
                    x: Math.sin(angle) * hitDist,
                    y: Math.cos(angle) * hitDist,
                });
            }
        }

        this.scanAngle += (Math.PI * 2) / 60;
        if (this.scanAngle > Math.PI * 2) this.scanAngle -= Math.PI * 2;

        if (Math.random() < 0.3) {
            this.trailPoints.push({
                x: this.roverX,
                z: this.roverZ,
                age: 0
            });
            if (this.trailPoints.length > this.maxTrailPoints) {
                this.trailPoints.shift();
            }
        }

        return this.points;
    }

    render() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        ctx.fillStyle = '#0a0e14';
        ctx.fillRect(0, 0, w, h);

        ctx.strokeStyle = 'rgba(255, 107, 53, 0.08)';
        ctx.lineWidth = 0.5;
        const ringCount = 6;
        for (let i = 1; i <= ringCount; i++) {
            const r = (i / ringCount) * this.scale * this.pixelScale;
            ctx.beginPath();
            ctx.arc(this.cx, this.cy, r, 0, Math.PI * 2);
            ctx.stroke();

            ctx.fillStyle = 'rgba(255, 107, 53, 0.25)';
            ctx.font = '8px JetBrains Mono';
            ctx.textAlign = 'left';
            const labelVal = ((i / ringCount) * this.scale).toFixed(0);
            ctx.fillText(labelVal + 'm', this.cx + r + 3, this.cy - 2);
        }

        ctx.strokeStyle = 'rgba(255, 107, 53, 0.06)';
        for (let a = 0; a < 12; a++) {
            const angle = (a / 12) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(this.cx, this.cy);
            ctx.lineTo(
                this.cx + Math.sin(angle) * this.scale * this.pixelScale,
                this.cy - Math.cos(angle) * this.scale * this.pixelScale
            );
            ctx.stroke();
        }

        const sweepGrad = ctx.createConicalGradient
            ? null
            : null;
        ctx.save();
        ctx.translate(this.cx, this.cy);
        ctx.rotate(this.scanAngle);
        const grad = ctx.createLinearGradient(0, 0, 0, -this.scale * this.pixelScale);
        grad.addColorStop(0, 'rgba(0, 255, 136, 0.15)');
        grad.addColorStop(1, 'rgba(0, 255, 136, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, this.scale * this.pixelScale, -0.15, 0.15);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        this.points.forEach(point => {
            const px = this.cx + point.x * this.pixelScale;
            const py = this.cy - point.y * this.pixelScale;
            const distRatio = point.distance / this.maxRange;

            let r, g, b;
            if (distRatio < 0.3) {
                r = 255; g = 60; b = 60;
            } else if (distRatio < 0.6) {
                r = 255; g = 180; b = 50;
            } else {
                r = 50; g = 255; b = 100;
            }

            const alpha = 0.4 + point.intensity * 0.6;
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
            ctx.beginPath();
            ctx.arc(px, py, 1.5, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 0.3})`;
            ctx.beginPath();
            ctx.arc(px, py, 3, 0, Math.PI * 2);
            ctx.fill();
        });

        const roverSize = 6;
        ctx.save();
        ctx.translate(this.cx, this.cy);
        ctx.fillStyle = '#ff6b35';
        ctx.strokeStyle = '#ff6b35';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, -roverSize);
        ctx.lineTo(-roverSize * 0.6, roverSize * 0.5);
        ctx.lineTo(roverSize * 0.6, roverSize * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        ctx.fillStyle = 'rgba(255, 107, 53, 0.4)';
        ctx.font = '9px JetBrains Mono';
        ctx.textAlign = 'center';
        ctx.fillText('STL-19P', this.cx, h - 4);

        ctx.fillText('0°', this.cx, 12);
        ctx.fillText('180°', this.cx, h - 14);
        ctx.textAlign = 'left';
        ctx.fillText('270°', 4, this.cy + 4);
        ctx.textAlign = 'right';
        ctx.fillText('90°', w - 4, this.cy + 4);
    }

    setScale(newScale) {
        this.scale = newScale;
        this.maxRange = newScale;
        this.pixelScale = Math.min(this.canvas.width, this.canvas.height) / (this.scale * 2.2);
    }

    getPointCount() {
        return this.points.length;
    }
}
