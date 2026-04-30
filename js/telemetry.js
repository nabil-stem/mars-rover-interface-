class TelemetrySystem {
    constructor() {
        this.battery = 87;
        this.batteryVoltage = 24.2;
        this.externalTemp = -23;
        this.internalTemp = 42;
        this.motorCurrents = [0, 0, 0, 0];
        this.startTime = Date.now();
        this.consoleMessages = [];

        this.speedometerCanvas = document.getElementById('speedometer-canvas');
        this.speedometerCtx = this.speedometerCanvas?.getContext('2d');
        this.headingCanvas = document.getElementById('heading-canvas');
        this.headingCtx = this.headingCanvas?.getContext('2d');
        this.attitudeCanvas = document.getElementById('attitude-canvas');
        this.attitudeCtx = this.attitudeCanvas?.getContext('2d');

        this.initConsole();
    }

    initConsole() {
        this.log('System initialized', 'success');
        this.log('STL-19P LIDAR online — 2300 pts/scan', 'info');
        this.log('Mecanum drive: 4x BLDC ready', 'info');
        this.log('Camera feed active', 'info');
        this.log('Awaiting operator input...', 'info');
    }

    log(message, type = '') {
        const now = new Date();
        const time = now.toTimeString().split(' ')[0];
        this.consoleMessages.push({ time, message, type });

        const consoleEl = document.getElementById('console-output');
        if (consoleEl) {
            const entry = document.createElement('div');
            entry.className = 'log-entry';
            entry.innerHTML = `<span class="log-time">[${time}]</span> <span class="log-msg ${type}">${message}</span>`;
            consoleEl.appendChild(entry);
            consoleEl.scrollTop = consoleEl.scrollHeight;

            if (consoleEl.children.length > 100) {
                consoleEl.removeChild(consoleEl.firstChild);
            }
        }
    }

    update(rover, controls, dt) {
        this.battery -= dt * 0.002 * (1 + rover.speed * 0.5);
        this.battery = Math.max(0, this.battery);
        this.batteryVoltage = 18 + (this.battery / 100) * 8;

        this.internalTemp = 42 + rover.speed * 3 + Math.sin(Date.now() * 0.001) * 0.5;
        this.externalTemp = -23 + Math.sin(Date.now() * 0.0001) * 2;

        for (let i = 0; i < 4; i++) {
            const targetCurrent = Math.abs(rover.wheelRPMs[i]) / 800 * 8;
            this.motorCurrents[i] += (targetCurrent - this.motorCurrents[i]) * 5 * dt;
        }

        this.updateDOM(rover, controls);
        this.drawSpeedometer(rover.speed);
        this.drawHeading(rover.heading);
        this.drawAttitude(rover.pitch, rover.roll);
    }

    updateDOM(rover, controls) {
        const rpms = rover.wheelRPMs;
        ['fl', 'fr', 'rl', 'rr'].forEach((id, i) => {
            const absRpm = Math.abs(rpms[i]);
            const pct = Math.min(100, (absRpm / 800) * 100);
            const fill = document.getElementById(`rpm-${id}`);
            const val = document.getElementById(`rpm-${id}-val`);
            if (fill) fill.style.width = pct + '%';
            if (val) val.textContent = Math.round(absRpm);
        });

        const speedEl = document.getElementById('speed-val');
        if (speedEl) speedEl.textContent = rover.speed.toFixed(1);

        const throttlePct = Math.abs(controls.translateY) * 100;
        const brakePct = controls.eStop ? 100 : 0;
        const thrFill = document.getElementById('throttle-fill');
        const brkFill = document.getElementById('brake-fill');
        const thrPct = document.getElementById('throttle-pct');
        const brkPctEl = document.getElementById('brake-pct');
        if (thrFill) thrFill.style.width = throttlePct + '%';
        if (brkFill) brkFill.style.width = brakePct + '%';
        if (thrPct) thrPct.textContent = Math.round(throttlePct) + '%';
        if (brkPctEl) brkPctEl.textContent = Math.round(brakePct) + '%';

        const jlx = document.getElementById('joy-l-x');
        const jly = document.getElementById('joy-l-y');
        const jrx = document.getElementById('joy-r-x');
        const jry = document.getElementById('joy-r-y');
        if (jlx) jlx.textContent = controls.translateX.toFixed(2);
        if (jly) jly.textContent = controls.translateY.toFixed(2);
        if (jrx) jrx.textContent = controls.rotate.toFixed(2);
        if (jry) jry.textContent = '0.00';

        const posX = document.getElementById('pos-x');
        const posY = document.getElementById('pos-y');
        const posZ = document.getElementById('pos-z');
        if (posX) posX.textContent = 'X: ' + rover.position.x.toFixed(2);
        if (posY) posY.textContent = 'Y: ' + rover.position.y.toFixed(2);
        if (posZ) posZ.textContent = 'Z: ' + rover.position.z.toFixed(2);

        const battFill = document.getElementById('battery-fill');
        const battPct = document.getElementById('battery-pct');
        const battV = document.getElementById('battery-voltage');
        if (battFill) {
            battFill.style.width = this.battery + '%';
            battFill.style.background = this.battery > 50 ? '#22c55e' :
                this.battery > 20 ? '#eab308' : '#ef4444';
        }
        if (battPct) battPct.textContent = Math.round(this.battery) + '%';
        if (battV) battV.textContent = this.batteryVoltage.toFixed(1) + 'V';

        const tempVal = document.getElementById('temp-val');
        const intTemp = document.getElementById('internal-temp');
        if (tempVal) tempVal.textContent = this.externalTemp.toFixed(0) + '°C';
        if (intTemp) intTemp.textContent = this.internalTemp.toFixed(0) + '°C';

        const headingVal = document.getElementById('heading-val');
        if (headingVal) {
            const deg = ((rover.heading * 180 / Math.PI) % 360 + 360) % 360;
            headingVal.textContent = deg.toFixed(0) + '°';
        }

        const attVal = document.getElementById('attitude-val');
        if (attVal) {
            attVal.textContent =
                (rover.pitch * 180 / Math.PI).toFixed(1) + '° / ' +
                (rover.roll * 180 / Math.PI).toFixed(1) + '°';
        }

        for (let i = 1; i <= 4; i++) {
            const fill = document.getElementById(`mc-${i}`);
            const val = document.getElementById(`mc-${i}-val`);
            if (fill) fill.style.width = (this.motorCurrents[i - 1] / 8 * 100) + '%';
            if (val) val.textContent = this.motorCurrents[i - 1].toFixed(1);
        }

        const odo = document.getElementById('odometer');
        if (odo) odo.textContent = rover.odometer.toFixed(2) + ' m';

        const needle = document.getElementById('compass-needle');
        if (needle) {
            needle.style.transform = `translate(-50%, -100%) rotate(${rover.heading}rad)`;
        }

        const elapsed = Date.now() - this.startTime;
        const hours = Math.floor(elapsed / 3600000);
        const mins = Math.floor((elapsed % 3600000) / 60000);
        const secs = Math.floor((elapsed % 60000) / 1000);
        const metEl = document.getElementById('met-display');
        if (metEl) {
            metEl.textContent = `000:${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        }

        const camTs = document.getElementById('cam-timestamp');
        if (camTs) {
            camTs.textContent = new Date().toTimeString().split(' ')[0];
        }
    }

    drawSpeedometer(speed) {
        const ctx = this.speedometerCtx;
        if (!ctx) return;
        const w = 140, h = 80;
        ctx.clearRect(0, 0, w, h);

        const cx = w / 2, cy = h - 5;
        const radius = 55;
        const startAngle = Math.PI;
        const endAngle = 0;

        ctx.strokeStyle = 'rgba(255, 107, 53, 0.15)';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, startAngle, endAngle);
        ctx.stroke();

        const speedPct = Math.min(1, speed / 2.5);
        const speedAngle = startAngle + speedPct * (endAngle - startAngle);
        ctx.strokeStyle = '#ff6b35';
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(cx, cy, radius, startAngle, speedAngle);
        ctx.stroke();

        for (let i = 0; i <= 10; i++) {
            const angle = startAngle + (i / 10) * (endAngle - startAngle);
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            const inner = i % 5 === 0 ? radius - 12 : radius - 8;

            ctx.strokeStyle = i % 5 === 0 ? 'rgba(255, 107, 53, 0.5)' : 'rgba(255, 107, 53, 0.2)';
            ctx.lineWidth = i % 5 === 0 ? 1.5 : 0.5;
            ctx.beginPath();
            ctx.moveTo(cx + cos * inner, cy + sin * inner);
            ctx.lineTo(cx + cos * (radius - 4), cy + sin * (radius - 4));
            ctx.stroke();
        }

        ctx.strokeStyle = '#ff6b35';
        ctx.lineWidth = 2;
        ctx.beginPath();
        const needleAngle = startAngle + speedPct * Math.PI;
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(needleAngle) * (radius - 15), cy + Math.sin(needleAngle) * (radius - 15));
        ctx.stroke();

        ctx.fillStyle = '#ff6b35';
        ctx.beginPath();
        ctx.arc(cx, cy, 3, 0, Math.PI * 2);
        ctx.fill();
    }

    drawHeading(heading) {
        const ctx = this.headingCtx;
        if (!ctx) return;
        const size = 80;
        ctx.clearRect(0, 0, size, size);

        const cx = size / 2, cy = size / 2;
        const r = 32;

        ctx.strokeStyle = 'rgba(255, 107, 53, 0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();

        const dirs = [
            { label: 'N', angle: 0 },
            { label: 'E', angle: Math.PI / 2 },
            { label: 'S', angle: Math.PI },
            { label: 'W', angle: -Math.PI / 2 },
        ];

        ctx.font = '8px JetBrains Mono';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        dirs.forEach(d => {
            const a = d.angle - heading;
            const x = cx + Math.sin(a) * (r + 8);
            const y = cy - Math.cos(a) * (r + 8);
            ctx.fillStyle = d.label === 'N' ? '#ff6b35' : 'rgba(148, 163, 184, 0.5)';
            ctx.fillText(d.label, x, y);
        });

        ctx.strokeStyle = '#ff6b35';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy - r + 5);
        ctx.lineTo(cx - 4, cy - r + 12);
        ctx.lineTo(cx + 4, cy - r + 12);
        ctx.closePath();
        ctx.fillStyle = '#ff6b35';
        ctx.fill();
    }

    drawAttitude(pitch, roll) {
        const ctx = this.attitudeCtx;
        if (!ctx) return;
        const size = 80;
        ctx.clearRect(0, 0, size, size);

        const cx = size / 2, cy = size / 2;
        const r = 32;

        ctx.strokeStyle = 'rgba(255, 107, 53, 0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(255, 107, 53, 0.1)';
        ctx.beginPath();
        ctx.moveTo(cx - r, cy);
        ctx.lineTo(cx + r, cy);
        ctx.moveTo(cx, cy - r);
        ctx.lineTo(cx, cy + r);
        ctx.stroke();

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(roll);

        const pitchOffset = pitch * r * 2;
        const skyGrad = ctx.createLinearGradient(0, -r, 0, r);
        skyGrad.addColorStop(0, 'rgba(59, 130, 246, 0.2)');
        skyGrad.addColorStop(0.5, 'rgba(59, 130, 246, 0.05)');
        skyGrad.addColorStop(0.5, 'rgba(139, 92, 60, 0.15)');
        skyGrad.addColorStop(1, 'rgba(139, 92, 60, 0.3)');

        ctx.beginPath();
        ctx.arc(0, 0, r - 1, 0, Math.PI * 2);
        ctx.clip();
        ctx.fillStyle = skyGrad;
        ctx.fillRect(-r, -r + pitchOffset, r * 2, r * 2);

        ctx.strokeStyle = '#ff6b35';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-15, pitchOffset);
        ctx.lineTo(15, pitchOffset);
        ctx.stroke();

        ctx.restore();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx - 10, cy);
        ctx.lineTo(cx - 4, cy);
        ctx.moveTo(cx + 4, cy);
        ctx.lineTo(cx + 10, cy);
        ctx.moveTo(cx, cy + 2);
        ctx.lineTo(cx, cy - 2);
        ctx.stroke();
    }
}
