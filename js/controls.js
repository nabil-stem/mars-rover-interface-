class RoverControls {
    constructor() {
        this.translateX = 0;
        this.translateY = 0;
        this.rotate = 0;
        this.sprint = false;
        this.eStop = false;

        this.keys = {};
        this.joystickLeftActive = false;
        this.joystickRightActive = false;

        this.initKeyboard();
        this.initJoysticks();
    }

    initKeyboard() {
        window.addEventListener('keydown', e => {
            this.keys[e.key.toLowerCase()] = true;
            this.updateKeyVisuals();

            if (e.key === ' ') {
                e.preventDefault();
                this.eStop = !this.eStop;
                document.getElementById('btn-estop').classList.toggle('active', this.eStop);
            }
        });

        window.addEventListener('keyup', e => {
            this.keys[e.key.toLowerCase()] = false;
            this.updateKeyVisuals();
        });
    }

    initJoysticks() {
        this.setupJoystick('joystick-left', 'stick-left', (x, y) => {
            this.translateX = x;
            this.translateY = -y;
        });

        this.setupJoystick('joystick-right', 'stick-right', (x, y) => {
            this.rotate = x;
        });
    }

    setupJoystick(baseId, stickId, callback) {
        const base = document.getElementById(baseId);
        const stick = document.getElementById(stickId);
        if (!base || !stick) return;

        const baseEl = base.querySelector('.joystick-base');
        let active = false;
        let centerX, centerY, maxDist;

        const start = (e) => {
            e.preventDefault();
            active = true;
            const rect = baseEl.getBoundingClientRect();
            centerX = rect.left + rect.width / 2;
            centerY = rect.top + rect.height / 2;
            maxDist = rect.width / 2 - 16;
            if (baseId === 'joystick-left') this.joystickLeftActive = true;
            else this.joystickRightActive = true;
        };

        const move = (e) => {
            if (!active) return;
            e.preventDefault();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;

            let dx = clientX - centerX;
            let dy = clientY - centerY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > maxDist) {
                dx = (dx / dist) * maxDist;
                dy = (dy / dist) * maxDist;
            }

            stick.style.transform = `translate(${dx}px, ${dy}px)`;
            callback(dx / maxDist, dy / maxDist);
        };

        const end = () => {
            active = false;
            stick.style.transform = 'translate(0px, 0px)';
            callback(0, 0);
            if (baseId === 'joystick-left') this.joystickLeftActive = false;
            else this.joystickRightActive = false;
        };

        baseEl.addEventListener('mousedown', start);
        baseEl.addEventListener('touchstart', start, { passive: false });
        window.addEventListener('mousemove', move);
        window.addEventListener('touchmove', move, { passive: false });
        window.addEventListener('mouseup', end);
        window.addEventListener('touchend', end);
    }

    updateKeyVisuals() {
        const keyMap = {
            'w': 0, 'a': 1, 's': 2, 'd': 3, 'q': 4, 'e': 5, 'shift': 6
        };
        const keyElements = document.querySelectorAll('.key');
        Object.entries(keyMap).forEach(([key, idx]) => {
            if (keyElements[idx]) {
                keyElements[idx].classList.toggle('active', !!this.keys[key]);
            }
        });
    }

    update() {
        if (this.eStop) {
            this.translateX = 0;
            this.translateY = 0;
            this.rotate = 0;
            return;
        }

        if (!this.joystickLeftActive) {
            let kx = 0, ky = 0;
            if (this.keys['w']) ky = 1;
            if (this.keys['s']) ky = -1;
            if (this.keys['a']) kx = -1;
            if (this.keys['d']) kx = 1;

            const sprintMul = this.keys['shift'] ? 1.0 : 0.6;
            this.translateX = kx * sprintMul;
            this.translateY = ky * sprintMul;
            this.sprint = !!this.keys['shift'];
        }

        if (!this.joystickRightActive) {
            let kr = 0;
            if (this.keys['q']) kr = -1;
            if (this.keys['e']) kr = 1;
            const sprintMul = this.keys['shift'] ? 1.0 : 0.6;
            this.rotate = kr * sprintMul;
        }
    }

    getState() {
        return {
            translateX: this.translateX,
            translateY: this.translateY,
            rotate: this.rotate,
            sprint: this.sprint,
            eStop: this.eStop,
        };
    }
}
