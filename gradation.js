/**
 * "그라데이션" (Gradation) Ribbon Field Gradient
 * Recreated from 21st.dev (https://21st.dev/community/gradients)
 * 
 * Features:
 * - Ribbon Field canvas shader
 * - Cross-axis sine wave distortion: (wave / 100) * 0.35 * sin(cross * 2.4 * 2π + clock)
 * - Feathered band softness & stop positions
 * - Film grain overlay (feTurbulence / GLSL noise)
 * - Smooth requestAnimationFrame loop (zero snap on start, unquantised smooth floats)
 */

class GradationRibbon {
    /**
     * Mounts an animated Ribbon Gradient onto a <canvas> element.
     * @param {HTMLCanvasElement} canvas
     * @param {Object} options
     */
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.gl = canvas.getContext('webgl', { alpha: false, antialias: true, powerPreference: 'high-performance' }) 
               || canvas.getContext('experimental-webgl');
        
        if (!this.gl) {
            console.warn('WebGL not supported, falling back to 2D approximation');
            this.initFallback2D();
            return;
        }

        // Configuration matching 21st.dev "그라데이션" exact preset
        this.config = Object.assign({
            mode: "stripes",
            angle: 32,
            scale: 68,
            softness: 24,
            wave: 14,
            distortion: 28,
            grain: 42,
            speed: 100,
            amt: 0.12,          // Motion sway amount (0 = stationary angle, 0.12 = subtle organic breathing)
            dir: 1,             // Motion direction
            baseWaveClock: 20.75,
            grainOpacity: 0.21,
            colors: [
                { hex: '#FFFFFF', pos: 0.18, start: 0.0432, end: 0.3318 },
                { hex: '#78B8F9', pos: 0.57, start: 0.3786, end: 0.5814 },
                { hex: '#5667FF', pos: 0.60, start: 0.5886, end: 0.7964 },
                { hex: '#4D2FF9', pos: 1.00, start: 0.8000, end: 1.0000 }
            ]
        }, options);

        this.startTime = performance.now();
        this.rafId = null;
        this.initWebGL();
    }

    static init(canvas, options) {
        return new GradationRibbon(canvas, options);
    }

    hexToRgb(hex) {
        const bigint = parseInt(hex.replace('#', ''), 16);
        return [
            ((bigint >> 16) & 255) / 255,
            ((bigint >> 8) & 255) / 255,
            (bigint & 255) / 255
        ];
    }

    initWebGL() {
        const gl = this.gl;

        const vsSource = `
            attribute vec2 a_position;
            varying vec2 v_uv;
            void main() {
                v_uv = (a_position + 1.0) * 0.5;
                gl_Position = vec4(a_position, 0.0, 1.0);
            }
        `;

        const fsSource = `
            precision highp float;
            varying vec2 v_uv;
            uniform vec2 u_resolution;
            uniform float u_angle;
            uniform float u_wave;
            uniform float u_waveClock;
            uniform float u_scale;
            uniform float u_grain;
            uniform float u_grainOpacity;
            uniform float u_seed;

            // Colors
            const vec3 c_white   = vec3(1.0, 1.0, 1.0);
            const vec3 c_skyblue = vec3(0.4706, 0.7216, 0.9765);  // #78B8F9
            const vec3 c_ultra   = vec3(0.3373, 0.4039, 1.0);     // #5667FF
            const vec3 c_iris    = vec3(0.3020, 0.1843, 0.9765);  // #4D2FF9

            // High-frequency pseudo noise for tactile film grain
            float hash(vec2 p) {
                p = fract(p * vec2(123.34, 456.21) + u_seed);
                p += dot(p, p + 45.32);
                return fract(p.x * p.y);
            }

            // Overlay blend mode
            float blendOverlay(float base, float blend) {
                return (base < 0.5) ? (2.0 * base * blend) : (1.0 - 2.0 * (1.0 - base) * (1.0 - blend));
            }

            vec3 blendOverlay3(vec3 base, vec3 blend) {
                return vec3(
                    blendOverlay(base.r, blend.r),
                    blendOverlay(base.g, blend.g),
                    blendOverlay(base.b, blend.b)
                );
            }

            void main() {
                // Aspect ratio correction relative to center
                vec2 st = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.x, u_resolution.y);

                float rad = radians(u_angle);
                vec2 dir = vec2(cos(rad), sin(rad));
                vec2 crossDir = vec2(-sin(rad), cos(rad));

                float along = dot(st, dir);
                float crossAxis = dot(st, crossDir);

                // Wave offset bends the bands with a cross-axis sine offset
                // (wave / 100) * 0.35 * sin(cross * 2.4 * 2π + clock)
                float waveOffset = (u_wave / 100.0) * 0.35 * sin(crossAxis * 2.4 * 6.2831853 + u_waveClock);

                // Scaled coordinate mapped across [0.0, 1.0]
                float coord = (along + waveOffset) / (u_scale / 100.0) + 0.5;

                // Stop transitions based on the exact 21st.dev ribbon formula:
                // #FFFFFF 4.32% -> 33.18%
                // #78B8F9 37.86% -> 58.14%
                // #5667FF 58.86% -> 79.64%
                // #4D2FF9 80.00% -> 100%
                vec3 col;
                if (coord < 0.3318) {
                    col = c_white;
                } else if (coord < 0.3786) {
                    float f = smoothstep(0.3318, 0.3786, coord);
                    col = mix(c_white, c_skyblue, f);
                } else if (coord < 0.5814) {
                    col = c_skyblue;
                } else if (coord < 0.5886) {
                    float f = smoothstep(0.5814, 0.5886, coord);
                    col = mix(c_skyblue, c_ultra, f);
                } else if (coord < 0.7964) {
                    col = c_ultra;
                } else if (coord < 0.8000) {
                    float f = smoothstep(0.7964, 0.8000, coord);
                    col = mix(c_ultra, c_iris, f);
                } else {
                    col = c_iris;
                }

                // Grain texture
                if (u_grain > 0.0) {
                    float n = hash(gl_FragCoord.xy * 0.75);
                    vec3 grainVal = vec3(n);
                    vec3 overlaid = blendOverlay3(col, grainVal);
                    col = mix(col, overlaid, u_grainOpacity * (u_grain / 50.0));
                }

                gl_FragColor = vec4(col, 1.0);
            }
        `;

        const compileShader = (type, src) => {
            const shader = gl.createShader(type);
            gl.shaderSource(shader, src);
            gl.compileShader(shader);
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                console.error(gl.getShaderInfoLog(shader));
                gl.deleteShader(shader);
                return null;
            }
            return shader;
        };

        const vs = compileShader(gl.VERTEX_SHADER, vsSource);
        const fs = compileShader(gl.FRAGMENT_SHADER, fsSource);
        this.program = gl.createProgram();
        gl.attachShader(this.program, vs);
        gl.attachShader(this.program, fs);
        gl.linkProgram(this.program);

        // Quad geometry
        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            -1, -1,
             1, -1,
            -1,  1,
            -1,  1,
             1, -1,
             1,  1,
        ]), gl.STATIC_DRAW);

        const aPosition = gl.getAttribLocation(this.program, 'a_position');
        gl.enableVertexAttribArray(aPosition);
        gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

        // Uniform locations
        this.uResolution = gl.getUniformLocation(this.program, 'u_resolution');
        this.uAngle = gl.getUniformLocation(this.program, 'u_angle');
        this.uWave = gl.getUniformLocation(this.program, 'u_wave');
        this.uWaveClock = gl.getUniformLocation(this.program, 'u_waveClock');
        this.uScale = gl.getUniformLocation(this.program, 'u_scale');
        this.uGrain = gl.getUniformLocation(this.program, 'u_grain');
        this.uGrainOpacity = gl.getUniformLocation(this.program, 'u_grainOpacity');
        this.uSeed = gl.getUniformLocation(this.program, 'u_seed');

        this.handleResize = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            const w = this.canvas.clientWidth || window.innerWidth;
            const h = this.canvas.clientHeight || window.innerHeight;
            if (this.canvas.width !== Math.floor(w * dpr) || this.canvas.height !== Math.floor(h * dpr)) {
                this.canvas.width = Math.floor(w * dpr);
                this.canvas.height = Math.floor(h * dpr);
            }
            gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        };

        window.addEventListener('resize', this.handleResize);
        this.handleResize();
        this.render = this.render.bind(this);
        this.rafId = requestAnimationFrame(this.render);
    }

    render(now) {
        const gl = this.gl;
        if (!gl) return;

        const t = (now - this.startTime) * 0.001;
        const ph = t * (this.config.speed / 100);
        const spin = ph * this.config.dir;

        // Angle sway: angle + sin(spin * 0.6) * 28 * amt (smoothly 0 at t=0)
        const currentAngle = this.config.angle + Math.sin(spin * 0.6) * 28.0 * this.config.amt;

        // Wave clock: advances from 20.75 to 20.75 + ph * 1.2
        const currentWaveClock = this.config.baseWaveClock + ph * 1.2;

        gl.useProgram(this.program);
        gl.uniform2f(this.uResolution, this.canvas.width, this.canvas.height);
        gl.uniform1f(this.uAngle, currentAngle);
        gl.uniform1f(this.uWave, this.config.wave);
        gl.uniform1f(this.uWaveClock, currentWaveClock);
        gl.uniform1f(this.uScale, this.config.scale);
        gl.uniform1f(this.uGrain, this.config.grain);
        gl.uniform1f(this.uGrainOpacity, this.config.grainOpacity);
        gl.uniform1f(this.uSeed, (this.config.seed % 1000) * 0.001);

        gl.drawArrays(gl.TRIANGLES, 0, 6);

        this.rafId = requestAnimationFrame(this.render);
    }

    destroy() {
        if (this.rafId) cancelAnimationFrame(this.rafId);
        window.removeEventListener('resize', this.handleResize);
    }

    initFallback2D() {
        // Fallback for non-WebGL environments
        const ctx = this.canvas.getContext('2d');
        const draw = () => {
            const w = this.canvas.width = this.canvas.clientWidth;
            const h = this.canvas.height = this.canvas.clientHeight;
            const grad = ctx.createLinearGradient(0, 0, w, h);
            grad.addColorStop(0.04, '#FFFFFF');
            grad.addColorStop(0.33, '#FFFFFF');
            grad.addColorStop(0.38, '#78B8F9');
            grad.addColorStop(0.58, '#78B8F9');
            grad.addColorStop(0.59, '#5667FF');
            grad.addColorStop(0.79, '#5667FF');
            grad.addColorStop(0.80, '#4D2FF9');
            grad.addColorStop(1.00, '#4D2FF9');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, w, h);
        };
        draw();
        window.addEventListener('resize', draw);
    }
}

// Global exposure for non-module HTML & ES/CommonJS
if (typeof window !== 'undefined') {
    window.GradationRibbon = GradationRibbon;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GradationRibbon };
}
