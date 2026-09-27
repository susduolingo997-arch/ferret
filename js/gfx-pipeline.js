/* =====================================================================
   gfx-pipeline.js - the rendering back end used by the graphics
   settings (gfx.js):
   - a cascaded-shadow patch for three.js's light chunk,
   - an HDR post-processing pipeline written for this game: SSAO and
     contact shadows, god rays and shadowed volumetric light, screen-
     space reflections on wet ground, depth of field, motion blur,
     bloom, eye adaptation, colour grading, vignette, grain and FXAA,
   - planar water reflections and an enhanced water material,
   - shell fur for the ferrets.
   Everything is plain WebGL through Three.js r128.
   ===================================================================== */
'use strict';
(function () {
  const P = (G.GFXP = {});

  /* ---------------------------------------------------------------- cascaded shadows
     All shadow-casting directional lights are cascades of the one sun. The
     finest cascade that covers a fragment supplies its shadow; only light 0
     (the real sun) carries colour, the others are black and only render maps. */
  (function patchCSM() {
    const C = THREE.ShaderChunk;
    const oldLoop = C.lights_fragment_begin;
    const a = oldLoop.indexOf('#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )');
    const b = oldLoop.indexOf('#if ( NUM_RECT_AREA_LIGHTS > 0 )');
    if (a < 0 || b < 0) { console.warn('CSM patch: chunk layout changed'); return; }
    const dir = `#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 1
	float csmShadow = 1.0; float csmDone = 0.0; vec3 csmC;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		csmC = vDirectionalShadowCoord[ i ].xyz / vDirectionalShadowCoord[ i ].w;
		if ( csmDone < 0.5 && csmC.x > 0.02 && csmC.x < 0.98 && csmC.y > 0.02 && csmC.y < 0.98 && csmC.z < 1.0 ) {
			directionalLightShadow = directionalLightShadows[ i ];
			csmShadow = getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] );
			csmDone = 1.0;
		}
	}
	#pragma unroll_loop_end
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalDirectLightIrradiance( directionalLight, geometry, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		#if NUM_DIR_LIGHT_SHADOWS > 1
		directLight.color *= all( bvec2( directLight.visible, receiveShadow ) ) ? csmShadow : 1.0;
		#else
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= all( bvec2( directLight.visible, receiveShadow ) ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		#endif
		RE_Direct( directLight, geometry, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
`;
    C.lights_fragment_begin = oldLoop.slice(0, a) + dir + oldLoop.slice(b);
  })();

  /* ---------------------------------------------------------------- shared GLSL */
  const VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
  const DEPTH = `
    #include <packing>
    uniform sampler2D tDepth; uniform float cameraNear; uniform float cameraFar; uniform mat4 invProj; uniform mat4 projMatrix; uniform vec2 resolution;
    float rawDepth(vec2 uv){ return texture2D(tDepth, uv).x; }
    float viewZ(float d){ return perspectiveDepthToViewZ(d, cameraNear, cameraFar); }
    vec3 viewPos(vec2 uv, float d){ vec4 c = vec4(uv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0); vec4 v = invProj * c; return v.xyz / v.w; }
    float ign(vec2 p){ return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
    vec3 viewNormal(vec2 uv, vec3 p){
      vec2 px = 1.0 / resolution;
      vec3 pr = viewPos(uv + vec2(px.x, 0.0), rawDepth(uv + vec2(px.x, 0.0))), pl = viewPos(uv - vec2(px.x, 0.0), rawDepth(uv - vec2(px.x, 0.0)));
      vec3 pu = viewPos(uv + vec2(0.0, px.y), rawDepth(uv + vec2(0.0, px.y))), pd = viewPos(uv - vec2(0.0, px.y), rawDepth(uv - vec2(0.0, px.y)));
      vec3 dx = abs(pr.z - p.z) < abs(pl.z - p.z) ? pr - p : p - pl; vec3 dy = abs(pu.z - p.z) < abs(pd.z - p.z) ? pu - p : p - pd;
      return normalize(cross(dx, dy));
    }
    vec2 toScreen(vec3 v){ vec4 o = projMatrix * vec4(v, 1.0); return o.xy / o.w * 0.5 + 0.5; }
    bool offScreen(vec2 s){ return s.x < 0.0 || s.x > 1.0 || s.y < 0.0 || s.y > 1.0; }`;

  const FRAG = {
    ssao: `varying vec2 vUv; ${DEPTH}
      uniform vec3 kernel[KERNEL]; uniform float radius; uniform float intensity; uniform vec3 sunView; uniform float contactOn;
      void main(){
        float d = rawDepth(vUv); if (d >= 0.99995) { gl_FragColor = vec4(1.0); return; }
        vec3 p = viewPos(vUv, d); vec3 n = viewNormal(vUv, p);
        float a = ign(gl_FragCoord.xy) * 6.2831853; vec3 rv = vec3(cos(a), sin(a), 0.0);
        vec3 t = normalize(rv - n * dot(rv, n)); vec3 bt = cross(n, t); mat3 tbn = mat3(t, bt, n);
        float occ = 0.0; float rad = radius * (1.0 + clamp(-p.z * 0.03, 0.0, 3.0));
        for (int i = 0; i < KERNEL; i++) {
          vec3 s = p + tbn * kernel[i] * rad; vec2 suv = toScreen(s);
          if (offScreen(suv)) continue;
          float sz = viewZ(rawDepth(suv));
          float range = smoothstep(0.0, 1.0, rad / max(abs(p.z - sz), 1e-4));
          occ += (sz >= s.z + 0.015 * rad ? 1.0 : 0.0) * range;
        }
        float ao = clamp(1.0 - occ / float(KERNEL) * intensity, 0.0, 1.0);
        float contact = 1.0;
        #ifdef CONTACT
        if (contactOn > 0.5) {
          vec3 rp = p + n * 0.006; float st = CONTACT_LEN / float(CONTACT_STEPS); float jit = ign(gl_FragCoord.xy + 23.0);
          for (int i = 0; i < CONTACT_STEPS; i++) {
            rp += sunView * st * (i == 0 ? jit + 0.3 : 1.0); vec2 suv = toScreen(rp); if (offScreen(suv)) break;
            float dz = viewZ(rawDepth(suv)) - rp.z; if (dz > 0.004 && dz < 0.22) { contact = 0.0; break; }
          }
          contact = mix(1.0, contact, smoothstep(30.0, 4.0, -p.z));
        }
        #endif
        gl_FragColor = vec4(ao, contact, 1.0, 1.0);
      }`,
    aoBlur: `varying vec2 vUv; ${DEPTH} uniform sampler2D tAO; uniform vec2 dir;
      void main(){ float z0 = viewZ(rawDepth(vUv)); vec2 s = vec2(0.0); float w = 0.0;
        for (int i = -4; i <= 4; i++) { vec2 uv = vUv + dir * float(i); vec2 v = texture2D(tAO, uv).rg; float dz = abs(viewZ(rawDepth(uv)) - z0);
          float ww = exp(-float(i * i) / 10.0) / (0.03 + dz * 6.0); s += v * ww; w += ww; }
        gl_FragColor = vec4(s / w, 1.0, 1.0); }`,
    rayMask: `varying vec2 vUv; ${DEPTH} uniform sampler2D tScene; uniform vec2 sunUV; uniform float aspect; uniform float sunVis;
      void main(){ float d = rawDepth(vUv); float sky = step(0.99995, d); vec3 c = texture2D(tScene, vUv).rgb;
        vec2 dv = vUv - sunUV; dv.x *= aspect; float fall = exp(-dot(dv, dv) * 5.0);
        gl_FragColor = vec4(sky * max(c - 0.35, 0.0) * (0.25 + fall * 1.4) * sunVis, 1.0); }`,
    rayBlur: `varying vec2 vUv; uniform sampler2D tIn; uniform vec2 sunUV; uniform float density; uniform float weight; uniform float decay;
      float ign(vec2 p){ return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
      void main(){ vec2 uv = vUv; vec2 dl = (uv - sunUV) * density / float(SAMPLES); float il = 1.0; vec3 acc = vec3(0.0); uv -= dl * ign(gl_FragCoord.xy);
        for (int i = 0; i < SAMPLES; i++) { uv -= dl; acc += texture2D(tIn, clamp(uv, 0.0, 1.0)).rgb * il * weight; il *= decay; }
        gl_FragColor = vec4(acc, 1.0); }`,
    volume: `varying vec2 vUv; ${DEPTH} uniform sampler2D tShadow; uniform mat4 shadowMat; uniform mat4 invView; uniform vec3 camPos; uniform vec3 sunDir; uniform vec3 sunCol;
      uniform float density; uniform float heightFall; uniform float baseY; uniform float maxDist; uniform float anis; uniform float shadowOn;
      float hg(float c, float g){ float g2 = g * g; return (1.0 - g2) / (12.566 * pow(max(1.0 + g2 - 2.0 * g * c, 1e-4), 1.5)); }
      void main(){
        float d = min(rawDepth(vUv), 0.99999); vec3 vp = viewPos(vUv, d); vec3 wp = (invView * vec4(vp, 1.0)).xyz; vec3 rd = wp - camPos; float L = length(rd); rd /= L; L = min(L, maxDist);
        float st = L / float(STEPS); float t = st * ign(gl_FragCoord.xy); vec3 acc = vec3(0.0); float ph = hg(dot(rd, sunDir), anis) + 0.02;
        for (int i = 0; i < STEPS; i++) {
          vec3 p = camPos + rd * t; float den = density * exp(-max(p.y - baseY, 0.0) * heightFall);
          float lit = 1.0;
          if (shadowOn > 0.5) { vec4 sc = shadowMat * vec4(p, 1.0); sc.xyz /= sc.w; if (sc.x > 0.0 && sc.x < 1.0 && sc.y > 0.0 && sc.y < 1.0 && sc.z < 1.0) lit = step(sc.z - 0.0015, unpackRGBAToDepth(texture2D(tShadow, sc.xy))); }
          acc += den * lit * st * exp(-density * t * 0.6); t += st;
        }
        gl_FragColor = vec4(acc * sunCol * ph, 1.0);
      }`,
    dof: `varying vec2 vUv; ${DEPTH} uniform sampler2D tScene; uniform float focus; uniform float aperture; uniform float maxBlur;
      float coc(float z){ return clamp(abs(z - focus) / max(z, 0.05) * aperture, 0.0, 1.0); }
      void main(){ float z = -viewZ(rawDepth(vUv)); float c = coc(z); vec3 acc = vec3(0.0); float w = 0.0; vec2 texel = 1.0 / resolution;
        for (int i = 0; i < TAPS; i++) { float r = sqrt(float(i) + 0.5) / sqrt(float(TAPS)); float a = float(i) * 2.39996323;
          vec2 uv = vUv + vec2(cos(a), sin(a)) * r * maxBlur * texel * c; float sz = -viewZ(rawDepth(uv)); float ww = sz >= z - 0.4 ? 1.0 : coc(sz);
          acc += texture2D(tScene, uv).rgb * ww; w += ww; }
        gl_FragColor = vec4(acc / max(w, 1e-4), c); }`,
    combine: `varying vec2 vUv; ${DEPTH} uniform sampler2D tScene; uniform sampler2D tAO; uniform sampler2D tVol; uniform sampler2D tRays; uniform sampler2D tDof;
      uniform float aoStr; uniform float contactStr; uniform float volStr; uniform float rayStr; uniform float wet; uniform vec3 upView; uniform float ssrStr; uniform float focus; uniform float aperture;
      void main(){
        vec3 col = texture2D(tScene, vUv).rgb; float d = rawDepth(vUv); bool sky = d >= 0.99995;
        #ifdef AO
        if (!sky) { vec2 ao = texture2D(tAO, vUv).rg; col *= mix(1.0, ao.r, aoStr) * mix(1.0, ao.g, contactStr); }
        #endif
        #ifdef SSR
        if (!sky && wet > 0.01) {
          vec3 p = viewPos(vUv, d); vec3 n = viewNormal(vUv, p); float up = dot(n, upView);
          if (up > 0.82) {
            vec3 v = normalize(p); vec3 r = reflect(v, n); vec3 rp = p + n * 0.02; float stl = SSR_LEN / float(SSR_STEPS); vec2 hit = vec2(-1.0);
            rp += r * stl * ign(gl_FragCoord.xy);
            for (int i = 0; i < SSR_STEPS; i++) { rp += r * stl * (1.0 + float(i) * 0.12); vec2 s = toScreen(rp); if (offScreen(s)) break; float sz = viewZ(rawDepth(s)); if (sz > rp.z && sz - rp.z < 0.35 + float(i) * 0.05) { hit = s; break; } }
            if (hit.x >= 0.0) { vec3 rc = texture2D(tScene, hit).rgb; vec2 e = smoothstep(0.0, 0.12, hit) * smoothstep(1.0, 0.88, hit); float fr = 0.25 + 0.75 * pow(1.0 - max(dot(-v, n), 0.0), 4.0);
              col = mix(col, rc, clamp(wet * smoothstep(0.82, 0.97, up) * fr * e.x * e.y * ssrStr, 0.0, 0.85)); }
          }
        }
        #endif
        #ifdef DOF
        { float z = -viewZ(d); float c = clamp(abs(z - focus) / max(z, 0.05) * aperture, 0.0, 1.0); vec4 b = texture2D(tDof, vUv); col = mix(col, b.rgb, smoothstep(0.03, 0.3, max(c, b.a * 0.5)) * 0.9); }
        #endif
        #ifdef VOL
        col += texture2D(tVol, vUv).rgb * volStr;
        #endif
        #ifdef RAYS
        col += texture2D(tRays, vUv).rgb * rayStr;
        #endif
        gl_FragColor = vec4(col, 1.0);
      }`,
    mblur: `varying vec2 vUv; ${DEPTH} uniform sampler2D tColor; uniform mat4 prevViewProj; uniform mat4 invViewProj; uniform float strength;
      void main(){ float d = min(rawDepth(vUv), 0.99999); vec4 wp = invViewProj * vec4(vUv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0); wp /= wp.w;
        vec4 pc = prevViewProj * wp; vec2 puv = pc.xy / pc.w * 0.5 + 0.5; vec2 vel = (vUv - puv) * strength; float l = length(vel); if (l > 0.035) vel *= 0.035 / l;
        vec3 acc = texture2D(tColor, vUv).rgb; if (l < 0.0008) { gl_FragColor = vec4(acc, 1.0); return; } float jit = ign(gl_FragCoord.xy);
        for (int i = 1; i < SAMPLES; i++) { float t = (float(i) + jit) / float(SAMPLES) - 0.5; acc += texture2D(tColor, clamp(vUv + vel * t, 0.001, 0.999)).rgb; }
        gl_FragColor = vec4(acc / float(SAMPLES), 1.0); }`,
    down: `varying vec2 vUv; uniform sampler2D tIn; uniform vec2 texel; uniform float first; uniform float threshold; uniform float knee;
      vec3 pre(vec3 c){ float br = max(c.r, max(c.g, c.b)); float soft = clamp(br - threshold + knee, 0.0, 2.0 * knee); soft = soft * soft / (4.0 * knee + 1e-5); return c * max(soft, br - threshold) / max(br, 1e-5); }
      vec3 tap(vec2 o){ vec3 c = texture2D(tIn, vUv + o * texel).rgb; if (first > 0.5) { c = pre(c); c /= 1.0 + dot(c, vec3(0.2126, 0.7152, 0.0722)) * 0.5; } return c; }
      void main(){ vec3 s = tap(vec2(0.0)) * 4.0 + tap(vec2(-1.0, -1.0)) + tap(vec2(1.0, -1.0)) + tap(vec2(-1.0, 1.0)) + tap(vec2(1.0, 1.0)); gl_FragColor = vec4(s / 8.0, 1.0); }`,
    up: `varying vec2 vUv; uniform sampler2D tLow; uniform sampler2D tHigh; uniform vec2 texel; uniform float scatter;
      vec3 t(vec2 o){ return texture2D(tLow, vUv + o * texel).rgb; }
      void main(){ vec3 s = t(vec2(-2.0, 0.0)) + t(vec2(2.0, 0.0)) + t(vec2(0.0, -2.0)) + t(vec2(0.0, 2.0)) + (t(vec2(-1.0, -1.0)) + t(vec2(1.0, -1.0)) + t(vec2(-1.0, 1.0)) + t(vec2(1.0, 1.0))) * 2.0;
        gl_FragColor = vec4(texture2D(tHigh, vUv).rgb + s / 12.0 * scatter, 1.0); }`,
    lum: `varying vec2 vUv; uniform sampler2D tIn; void main(){ vec3 c = texture2D(tIn, vUv).rgb; gl_FragColor = vec4(log(dot(c, vec3(0.2126, 0.7152, 0.0722)) + 1e-4), 0.0, 0.0, 1.0); }`,
    avg: `varying vec2 vUv; uniform sampler2D tIn; void main(){ float s = 0.0; float w = 0.0; for (int y = 0; y < 16; y++) for (int x = 0; x < 16; x++) { vec2 uv = (vec2(float(x), float(y)) + 0.5) / 16.0; float ww = 1.0 - 0.7 * length(uv - 0.5); s += texture2D(tIn, uv).r * ww; w += ww; } gl_FragColor = vec4(exp(s / w), 0.0, 0.0, 1.0); }`,
    adapt: `varying vec2 vUv; uniform sampler2D tAvg; uniform sampler2D tPrev; uniform float rate; void main(){ float a = texture2D(tAvg, vec2(0.5)).r; float p = texture2D(tPrev, vec2(0.5)).r; if (p <= 0.0 || p != p) p = a; gl_FragColor = vec4(p + (a - p) * rate, 0.0, 0.0, 1.0); }`,
    composite: `varying vec2 vUv; uniform sampler2D tColor; uniform sampler2D tBloom; uniform sampler2D tLum; uniform float exposure; uniform float bloomStr; uniform float vignette; uniform float grain; uniform float ca; uniform float time;
      uniform float sat; uniform float contrast; uniform vec3 lift; uniform vec3 gain; uniform vec3 gammaV; uniform vec3 tint; uniform float adaptKey; uniform float fade;
      vec3 RRTFit(vec3 v){ vec3 a = v * (v + 0.0245786) - 0.000090537; vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081; return a / b; }
      vec3 aces(vec3 c){ const mat3 I = mat3(vec3(0.59719, 0.07600, 0.02840), vec3(0.35458, 0.90834, 0.13383), vec3(0.04823, 0.01566, 0.83777)); const mat3 O = mat3(vec3(1.60475, -0.10208, -0.00327), vec3(-0.53108, 1.10813, -0.07276), vec3(-0.07367, -0.00605, 1.07602)); c = I * c; c = RRTFit(c); c = O * c; return clamp(c, 0.0, 1.0); }
      vec3 toSRGB(vec3 c){ return mix(pow(c, vec3(0.41666)) * 1.055 - 0.055, c * 12.92, vec3(lessThanEqual(c, vec3(0.0031308)))); }
      float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      void main(){ vec2 uv = vUv; vec3 c;
        #ifdef CA
        vec2 dd = (uv - 0.5) * ca; c = vec3(texture2D(tColor, uv - dd).r, texture2D(tColor, uv).g, texture2D(tColor, uv + dd).b);
        #else
        c = texture2D(tColor, uv).rgb;
        #endif
        #ifdef BLOOM
        c += texture2D(tBloom, uv).rgb * bloomStr;
        #endif
        float ex = exposure;
        #ifdef ADAPT
        float al = texture2D(tLum, vec2(0.5)).r; ex *= clamp(pow(adaptKey / max(al, 1e-3), 0.32), 0.78, 1.45);
        #endif
        c = aces(c * ex / 0.6);
        #ifdef GRADE
        c = c * gain + lift * (1.0 - c); c = pow(max(c, 0.0), 1.0 / gammaV); float l = dot(c, vec3(0.2126, 0.7152, 0.0722)); c = mix(vec3(l), c, sat); c = clamp((c - 0.5) * contrast + 0.5, 0.0, 1.0) * tint;
        #endif
        #ifdef VIGNETTE
        float v = smoothstep(0.95, 0.3, length((uv - 0.5) * vec2(1.0, 0.82))); c *= mix(1.0, v, vignette);
        #endif
        c = toSRGB(clamp(c, 0.0, 1.0));
        #ifdef GRAIN
        c += (hash(uv * 731.0 + fract(time) * 97.0) - 0.5) * grain;
        #endif
        gl_FragColor = vec4(c * fade, 1.0); }`,
    fxaa: `varying vec2 vUv; uniform sampler2D tIn; uniform vec2 resolution;
      void main(){ vec2 inv = 1.0 / resolution; vec3 nw = texture2D(tIn, vUv + vec2(-1.0, -1.0) * inv).rgb, ne = texture2D(tIn, vUv + vec2(1.0, -1.0) * inv).rgb, sw = texture2D(tIn, vUv + vec2(-1.0, 1.0) * inv).rgb, se = texture2D(tIn, vUv + vec2(1.0, 1.0) * inv).rgb, m = texture2D(tIn, vUv).rgb;
        vec3 L = vec3(0.299, 0.587, 0.114); float lnw = dot(nw, L), lne = dot(ne, L), lsw = dot(sw, L), lse = dot(se, L), lm = dot(m, L);
        float lmin = min(lm, min(min(lnw, lne), min(lsw, lse))), lmax = max(lm, max(max(lnw, lne), max(lsw, lse)));
        vec2 dir = vec2(-((lnw + lne) - (lsw + lse)), (lnw + lsw) - (lne + lse)); float red = max((lnw + lne + lsw + lse) * 0.03125, 1.0 / 128.0);
        float rcp = 1.0 / (min(abs(dir.x), abs(dir.y)) + red); dir = clamp(dir * rcp, vec2(-8.0), vec2(8.0)) * inv;
        vec3 a = 0.5 * (texture2D(tIn, vUv + dir * (1.0 / 3.0 - 0.5)).rgb + texture2D(tIn, vUv + dir * (2.0 / 3.0 - 0.5)).rgb);
        vec3 b = a * 0.5 + 0.25 * (texture2D(tIn, vUv - dir * 0.5).rgb + texture2D(tIn, vUv + dir * 0.5).rgb); float lb = dot(b, L);
        gl_FragColor = vec4((lb < lmin || lb > lmax) ? a : b, 1.0); }`,
    copy: 'varying vec2 vUv; uniform sampler2D tIn; void main(){ gl_FragColor = vec4(texture2D(tIn, vUv).rgb, 1.0); }',
  };

  /* ---------------------------------------------------------------- the pipeline */
  const RTO = (type, extra) => Object.assign({ minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat, type, depthBuffer: false, stencilBuffer: false, generateMipmaps: false }, extra || {});
  class Pipeline {
    constructor(renderer) {
      this.r = renderer; this.gl = renderer.getContext(); this.w = 0; this.h = 0; this.flags = null; this.mats = {}; this.t = 0;
      const caps = renderer.capabilities; this.webgl2 = !!caps.isWebGL2;
      this.hdrType = this.webgl2 && renderer.extensions.has('EXT_color_buffer_float') ? THREE.HalfFloatType : THREE.UnsignedByteType;
      this.hdr = this.hdrType !== THREE.UnsignedByteType; this.maxSamples = caps.maxSamples || 0;
      this.qscene = new THREE.Scene(); this.qcam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)); this.quad.frustumCulled = false; this.qscene.add(this.quad);
      this.prevVP = new THREE.Matrix4(); this.hasPrev = false; this.invVP = new THREE.Matrix4(); this.vp = new THREE.Matrix4(); this.tmpV = new THREE.Vector3(); this.tmpV2 = new THREE.Vector3();
      this.lumFlip = 0;
      // SSAO kernel
      const k = []; const rng = G.U.rng(99);
      for (let i = 0; i < 32; i++) { const v = new THREE.Vector3(rng() * 2 - 1, rng() * 2 - 1, rng() * 0.9 + 0.1).normalize(); let s = i / 32; s = 0.1 + s * s * 0.9; k.push(v.multiplyScalar(s * (0.5 + rng() * 0.5))); }
      this.kernel = k;
    }
    mat(name, frag, uniforms, defines) {
      const m = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: frag, uniforms: uniforms || {}, defines: defines || {}, depthTest: false, depthWrite: false, toneMapped: false });
      this.mats[name] = m; return m;
    }
    rt(w, h, type, extra) { const t = new THREE.WebGLRenderTarget(Math.max(1, w | 0), Math.max(1, h | 0), RTO(type || this.hdrType, extra)); t.texture.generateMipmaps = false; return t; }
    dispose() { for (const k in this.T || {}) { const v = this.T[k]; (Array.isArray(v) ? v : [v]).forEach((t) => t && t.dispose()); } this.T = {}; for (const k in this.mats) this.mats[k].dispose(); this.mats = {}; }
    /* flags: { msaa, fxaa, ao:{kernel,half,contact,steps,len}, rays:{samples}, vol:{steps,half}, ssr:{steps,len}, dof:{taps}, mblur:{samples}, bloom:{levels}, adapt, grade, vignette, grain, ca } */
    configure(flags) { this.flags = flags; this.w = 0; }
    ensure(w, h) {
      if (w === this.w && h === this.h && this.T) return;
      this.dispose(); this.w = w; this.h = h; const F = this.flags, T = (this.T = {});
      // scene target (+ depth texture), multisampled if requested
      const depth = new THREE.DepthTexture(w, h, this.webgl2 ? THREE.UnsignedIntType : THREE.UnsignedShortType); depth.format = THREE.DepthFormat;
      let samples = F.msaa && this.webgl2 ? Math.min(F.msaa, this.maxSamples) : 0;
      if (samples && w * h * samples * 12 > 420e6) samples = Math.max(2, Math.floor(420e6 / (w * h * 12)));
      if (samples) { T.scene = new THREE.WebGLMultisampleRenderTarget(w, h, RTO(this.hdrType, { depthBuffer: true })); T.scene.samples = samples; }
      else T.scene = new THREE.WebGLRenderTarget(w, h, RTO(this.hdrType, { depthBuffer: true }));
      T.scene.depthTexture = depth; this.samples = samples;
      T.a = this.rt(w, h); T.b = this.rt(w, h);
      const hw = Math.max(1, w >> 1), hh = Math.max(1, h >> 1);
      const U = (o) => Object.assign({ tDepth: { value: depth }, cameraNear: { value: 0.1 }, cameraFar: { value: 100 }, invProj: { value: new THREE.Matrix4() }, projMatrix: { value: new THREE.Matrix4() }, resolution: { value: new THREE.Vector2(w, h) } }, o);
      if (F.ao) {
        const aw = F.ao.half ? hw : w, ah = F.ao.half ? hh : h; T.ao = this.rt(aw, ah, THREE.UnsignedByteType); T.ao2 = this.rt(aw, ah, THREE.UnsignedByteType);
        const def = { KERNEL: F.ao.kernel }; if (F.ao.contact) Object.assign(def, { CONTACT: 1, CONTACT_STEPS: F.ao.steps || 10, CONTACT_LEN: (F.ao.len || 0.22).toFixed(3) });
        this.mat('ssao', FRAG.ssao, U({ kernel: { value: this.kernel.slice(0, F.ao.kernel) }, radius: { value: 0.32 }, intensity: { value: 1.35 }, sunView: { value: new THREE.Vector3() }, contactOn: { value: 1 } }), def);
        this.mat('aoBlur', FRAG.aoBlur, U({ tAO: { value: null }, dir: { value: new THREE.Vector2() } }));
      }
      if (F.rays) {
        T.ray1 = this.rt(hw, hh); T.ray2 = this.rt(hw, hh);
        this.mat('rayMask', FRAG.rayMask, U({ tScene: { value: null }, sunUV: { value: new THREE.Vector2() }, aspect: { value: 1 }, sunVis: { value: 0 } }));
        this.mat('rayBlur', FRAG.rayBlur, { tIn: { value: null }, sunUV: { value: new THREE.Vector2() }, density: { value: 0.9 }, weight: { value: 0.05 }, decay: { value: 0.965 } }, { SAMPLES: F.rays.samples });
      }
      if (F.vol) {
        const vw = F.vol.half ? hw : w, vh = F.vol.half ? hh : h; T.vol = this.rt(vw, vh);
        this.mat('volume', FRAG.volume, U({ tShadow: { value: null }, shadowMat: { value: new THREE.Matrix4() }, invView: { value: new THREE.Matrix4() }, camPos: { value: new THREE.Vector3() }, sunDir: { value: new THREE.Vector3() }, sunCol: { value: new THREE.Color() }, density: { value: 0.02 }, heightFall: { value: 0.08 }, baseY: { value: 0 }, maxDist: { value: 60 }, anis: { value: 0.55 }, shadowOn: { value: 0 } }), { STEPS: F.vol.steps });
      }
      if (F.dof) { T.dof = this.rt(hw, hh); this.mat('dof', FRAG.dof, U({ tScene: { value: null }, focus: { value: 2 }, aperture: { value: 0.3 }, maxBlur: { value: 7 } }), { TAPS: F.dof.taps }); }
      const cdef = {}; if (F.ao) cdef.AO = 1; if (F.ssr) Object.assign(cdef, { SSR: 1, SSR_STEPS: F.ssr.steps, SSR_LEN: F.ssr.len.toFixed(2) }); if (F.dof) cdef.DOF = 1; if (F.vol) cdef.VOL = 1; if (F.rays) cdef.RAYS = 1;
      this.mat('combine', FRAG.combine, U({ tScene: { value: null }, tAO: { value: null }, tVol: { value: null }, tRays: { value: null }, tDof: { value: null }, aoStr: { value: 1 }, contactStr: { value: 0 }, volStr: { value: 1 }, rayStr: { value: 1 }, wet: { value: 0 }, upView: { value: new THREE.Vector3() }, ssrStr: { value: 1 }, focus: { value: 2 }, aperture: { value: 0.3 } }), cdef);
      if (F.mblur) this.mat('mblur', FRAG.mblur, U({ tColor: { value: null }, prevViewProj: { value: new THREE.Matrix4() }, invViewProj: { value: new THREE.Matrix4() }, strength: { value: 0.6 } }), { SAMPLES: F.mblur.samples });
      if (F.bloom) {
        T.down = []; T.up = []; let bw = hw, bh = hh;
        for (let i = 0; i < F.bloom.levels; i++) { T.down.push(this.rt(bw, bh)); T.up.push(this.rt(bw, bh)); bw = Math.max(1, bw >> 1); bh = Math.max(1, bh >> 1); }
        this.mat('down', FRAG.down, { tIn: { value: null }, texel: { value: new THREE.Vector2() }, first: { value: 0 }, threshold: { value: 1.0 }, knee: { value: 0.5 } });
        this.mat('up', FRAG.up, { tLow: { value: null }, tHigh: { value: null }, texel: { value: new THREE.Vector2() }, scatter: { value: 0.9 } });
      }
      if (F.adapt) {
        T.lum = this.rt(64, 64); T.avg = this.rt(1, 1, this.hdrType, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter }); T.ad = [this.rt(1, 1, this.hdrType, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter }), this.rt(1, 1, this.hdrType, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter })];
        this.mat('lum', FRAG.lum, { tIn: { value: null } }); this.mat('avg', FRAG.avg, { tIn: { value: null } }); this.mat('adapt', FRAG.adapt, { tAvg: { value: null }, tPrev: { value: null }, rate: { value: 0.05 } });
      }
      const pdef = {}; if (F.bloom) pdef.BLOOM = 1; if (F.adapt) pdef.ADAPT = 1; if (F.grade) pdef.GRADE = 1; if (F.vignette) pdef.VIGNETTE = 1; if (F.grain) pdef.GRAIN = 1; if (F.ca) pdef.CA = 1;
      this.mat('composite', FRAG.composite, { tColor: { value: null }, tBloom: { value: null }, tLum: { value: null }, exposure: { value: 1 }, bloomStr: { value: 0.06 }, vignette: { value: 0.3 }, grain: { value: 0.02 }, ca: { value: 0.003 }, time: { value: 0 }, sat: { value: 1 }, contrast: { value: 1 }, lift: { value: new THREE.Vector3() }, gain: { value: new THREE.Vector3(1, 1, 1) }, gammaV: { value: new THREE.Vector3(1, 1, 1) }, tint: { value: new THREE.Vector3(1, 1, 1) }, adaptKey: { value: 0.2 }, fade: { value: 1 } }, pdef);
      if (F.fxaa) { T.ldr = this.rt(w, h, THREE.UnsignedByteType); this.mat('fxaa', FRAG.fxaa, { tIn: { value: null }, resolution: { value: new THREE.Vector2(w, h) } }); }
      this.mat('copy', FRAG.copy, { tIn: { value: null } });
      this.hasPrev = false;
    }
    pass(m, target) { this.quad.material = m; this.r.setRenderTarget(target || null); this.r.render(this.qscene, this.qcam); }
    setCam(m, cam) { const u = m.uniforms; if (!u.cameraNear) return; u.cameraNear.value = cam.near; u.cameraFar.value = cam.far; u.invProj.value.copy(cam.projectionMatrixInverse); u.projMatrix.value.copy(cam.projectionMatrix); }
    /* env: { sunDir(world, towards sun), sunCol, sunInt, sunUp, shadowLight, wet, focus, aperture, grade{...}, exposure, volDensity, baseY, indoor, dt, cut } */
    render(scene, cam, env, out) {
      const r = this.r, F = this.flags;
      const size = r.getDrawingBufferSize(this.tmpSize || (this.tmpSize = new THREE.Vector2()));
      const w = out ? out.width : size.x, h = out ? out.height : size.y; this.ensure(w, h); this.t += env.dt || 0; const T = this.T;
      cam.updateMatrixWorld(); cam.matrixWorldInverse.copy(cam.matrixWorld).invert();
      this.vp.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse); this.invVP.copy(this.vp).invert();
      if (env.cut) this.hasPrev = false;
      // 1. the scene
      r.setRenderTarget(T.scene); r.render(scene, cam);
      let color = T.scene.texture; const hw = Math.max(1, w >> 1), hh = Math.max(1, h >> 1);
      const sunView = this.tmpV.copy(env.sunDir).transformDirection(cam.matrixWorldInverse);
      // 2. ambient occlusion + contact shadows
      if (F.ao) {
        const m = this.mats.ssao; this.setCam(m, cam); m.uniforms.resolution.value.set(w, h); m.uniforms.sunView.value.copy(sunView); m.uniforms.contactOn.value = env.sunInt > 0.05 && !env.indoor && !env.ug ? 1 : 0; this.pass(m, T.ao);
        const b = this.mats.aoBlur; this.setCam(b, cam); b.uniforms.resolution.value.set(w, h);
        b.uniforms.tAO.value = T.ao.texture; b.uniforms.dir.value.set(1 / T.ao.width, 0); this.pass(b, T.ao2);
        b.uniforms.tAO.value = T.ao2.texture; b.uniforms.dir.value.set(0, 1 / T.ao.height); this.pass(b, T.ao);
      }
      // 3. sun shafts: screen-space god rays and ray-marched shadowed light
      const sunW = this.tmpV2.copy(cam.position).addScaledVector(env.sunDir, 400); sunW.project(cam);
      const sunUV = [sunW.x * 0.5 + 0.5, sunW.y * 0.5 + 0.5], facing = sunW.z < 1 && env.sunDir.dot(cam.getWorldDirection(this.tmpV3 || (this.tmpV3 = new THREE.Vector3()))) > 0;
      const onScreenK = facing ? Math.max(0, 1 - Math.max(Math.abs(sunUV[0] - 0.5), Math.abs(sunUV[1] - 0.5)) * 1.1) : 0;
      if (F.rays) {
        const vis = env.sunInt * onScreenK * (env.indoor || env.ug ? 0 : 1) * (env.rayK ?? 1);
        if (vis > 0.01) {
          const m = this.mats.rayMask; this.setCam(m, cam); m.uniforms.tScene.value = color; m.uniforms.sunUV.value.set(sunUV[0], sunUV[1]); m.uniforms.aspect.value = w / h; m.uniforms.sunVis.value = vis; this.pass(m, T.ray1);
          const bl = this.mats.rayBlur; bl.uniforms.sunUV.value.set(sunUV[0], sunUV[1]); bl.uniforms.tIn.value = T.ray1.texture; bl.uniforms.density.value = 0.95; this.pass(bl, T.ray2);
          this.rayOn = true;
        } else this.rayOn = false;
      }
      if (F.vol) {
        const L = env.shadowLight, sm = L && L.shadow && L.shadow.map; const volOn = env.sunInt > 0.05 && !env.ug && env.volDensity > 0;
        this.volOn = volOn;
        if (volOn) {
          const m = this.mats.volume, u = m.uniforms; this.setCam(m, cam); u.resolution.value.set(w, h);
          u.tShadow.value = sm ? sm.texture : null; u.shadowOn.value = sm ? 1 : 0; if (sm) u.shadowMat.value.copy(L.shadow.matrix);
          u.invView.value.copy(cam.matrixWorld); u.camPos.value.copy(cam.position); u.sunDir.value.copy(env.sunDir); u.sunCol.value.copy(env.sunCol).multiplyScalar(env.sunInt * (env.indoor ? 0.6 : 1));
          u.density.value = env.volDensity; u.baseY.value = env.baseY || 0; u.maxDist.value = env.volDist || 60; u.heightFall.value = env.indoor ? 0.0 : 0.06;
          this.pass(m, T.vol);
        }
      }
      if (F.dof) { const m = this.mats.dof; this.setCam(m, cam); m.uniforms.resolution.value.set(hw, hh); m.uniforms.tScene.value = color; m.uniforms.focus.value = env.focus; m.uniforms.aperture.value = env.aperture; m.uniforms.maxBlur.value = F.dof.maxBlur || 6; this.pass(m, T.dof); }
      // 4. combine
      { const m = this.mats.combine, u = m.uniforms; this.setCam(m, cam); u.resolution.value.set(w, h); u.tScene.value = color;
        if (F.ao) { u.tAO.value = T.ao.texture; u.aoStr.value = env.aoStr ?? 1; u.contactStr.value = F.ao.contact ? 0.55 * Math.min(1, env.sunInt) : 0; }
        if (F.vol) { u.tVol.value = T.vol.texture; u.volStr.value = this.volOn ? 1 : 0; }
        if (F.rays) { u.tRays.value = T.ray2.texture; u.rayStr.value = this.rayOn ? (env.rayStr ?? 0.5) : 0; }
        if (F.ssr) { u.wet.value = env.wet || 0; u.upView.value.set(0, 1, 0).transformDirection(cam.matrixWorldInverse); u.ssrStr.value = F.ssr.str || 1; }
        if (F.dof) { u.tDof.value = T.dof.texture; u.focus.value = env.focus; u.aperture.value = env.aperture; }
        this.pass(m, T.a); color = T.a.texture; }
      // 5. motion blur
      if (F.mblur) {
        if (this.hasPrev && !env.cut) { const m = this.mats.mblur; this.setCam(m, cam); m.uniforms.tColor.value = color; m.uniforms.prevViewProj.value.copy(this.prevVP); m.uniforms.invViewProj.value.copy(this.invVP); m.uniforms.strength.value = (F.mblur.str || 0.5) * Math.min(1, (1 / 60) / Math.max(env.dt || 0.016, 1 / 240)); this.pass(m, T.b); color = T.b.texture; }
        this.prevVP.copy(this.vp); this.hasPrev = true;
      }
      // 6. bloom
      if (F.bloom) {
        const d = this.mats.down; let src = color;
        for (let i = 0; i < T.down.length; i++) { d.uniforms.tIn.value = src; d.uniforms.texel.value.set(1 / (i ? T.down[i - 1].width : w), 1 / (i ? T.down[i - 1].height : h)); d.uniforms.first.value = i ? 0 : 1; d.uniforms.threshold.value = env.bloomThreshold ?? 1.0; this.pass(d, T.down[i]); src = T.down[i].texture; }
        const u = this.mats.up; const n = T.down.length; let low = T.down[n - 1].texture;
        for (let i = n - 2; i >= 0; i--) { u.uniforms.tLow.value = low; u.uniforms.tHigh.value = T.down[i].texture; u.uniforms.texel.value.set(1 / T.down[i + 1].width, 1 / T.down[i + 1].height); this.pass(u, T.up[i]); low = T.up[i].texture; }
        this.bloomTex = n > 1 ? T.up[0].texture : T.down[0].texture;
      }
      // 7. eye adaptation
      if (F.adapt) {
        this.mats.lum.uniforms.tIn.value = color; this.pass(this.mats.lum, T.lum);
        this.mats.avg.uniforms.tIn.value = T.lum.texture; this.pass(this.mats.avg, T.avg);
        const a = this.mats.adapt; a.uniforms.tAvg.value = T.avg.texture; a.uniforms.tPrev.value = T.ad[this.lumFlip].texture; a.uniforms.rate.value = env.cut ? 1 : 1 - Math.exp(-(env.dt || 0.016) * 1.6);
        this.lumFlip ^= 1; this.pass(a, T.ad[this.lumFlip]);
      }
      // 8. tone map + grade
      { const m = this.mats.composite, u = m.uniforms, gr = env.grade || {};
        u.tColor.value = color; if (F.bloom) { u.tBloom.value = this.bloomTex; u.bloomStr.value = (F.bloom.str || 0.06) * (env.bloomK ?? 1); } if (F.adapt) { u.tLum.value = T.ad[this.lumFlip].texture; u.adaptKey.value = env.adaptKey || 0.2; }
        u.exposure.value = env.exposure; u.time.value = this.t; u.vignette.value = (F.vignette ? 0.28 : 0) + (env.cine ? 0.18 : 0); u.grain.value = F.grain || 0; u.ca.value = F.ca || 0;
        u.sat.value = gr.sat ?? 1; u.contrast.value = gr.contrast ?? 1; u.lift.value.set(...(gr.lift || [0, 0, 0])); u.gain.value.set(...(gr.gain || [1, 1, 1])); u.gammaV.value.set(...(gr.gamma || [1, 1, 1])); u.tint.value.set(...(gr.tint || [1, 1, 1])); u.fade.value = env.fade ?? 1;
        this.pass(m, F.fxaa ? T.ldr : out || null); }
      if (F.fxaa) { const m = this.mats.fxaa; m.uniforms.tIn.value = T.ldr.texture; m.uniforms.resolution.value.set(w, h); this.pass(m, out || null); }
      r.setRenderTarget(null);
    }
  }
  P.Pipeline = Pipeline;

  /* ---------------------------------------------------------------- planar reflections for water */
  class Mirror {
    constructor(renderer) {
      this.r = renderer; this.cam = new THREE.PerspectiveCamera(); this.tex = null; this.rt = null; this.matrix = new THREE.Matrix4(); this.planeY = 0.07; this.on = false;
      this.plane = new THREE.Plane(); this.clip = new THREE.Vector4(); this.q = new THREE.Vector4(); this.v = new THREE.Vector3(); this.t = new THREE.Vector3(); this.la = new THREE.Vector3(); this.rot = new THREE.Matrix4(); this.n = new THREE.Vector3(0, 1, 0);
      this.empty = new THREE.DataTexture(new Uint8Array([90, 110, 130, 255]), 1, 1); this.empty.needsUpdate = true;
    }
    size(w, h, type) { w = Math.max(2, w | 0); h = Math.max(2, h | 0); if (this.rt && this.rt.width === w && this.rt.height === h) return; if (this.rt) this.rt.dispose(); this.rt = new THREE.WebGLRenderTarget(w, h, RTO(type, { depthBuffer: true })); }
    /* render the scene mirrored in the plane y = planeY into the target (used by water next frame) */
    render(scene, cam, hide) {
      const c = this.cam, pos = this.t.setFromMatrixPosition(cam.matrixWorld), pY = this.planeY;
      if (pos.y < pY + 0.02) { this.on = false; return; }
      const refl = this.v.set(pos.x, 2 * pY - pos.y, pos.z);
      this.rot.extractRotation(cam.matrixWorld); this.la.set(0, 0, -1).applyMatrix4(this.rot).add(pos);
      const target = new THREE.Vector3(this.la.x, 2 * pY - this.la.y, this.la.z);
      c.position.copy(refl); c.up.set(0, 1, 0).applyMatrix4(this.rot); c.up.y *= -1; c.lookAt(target);
      c.near = cam.near; c.far = cam.far; c.updateMatrixWorld(); c.projectionMatrix.copy(cam.projectionMatrix);
      this.matrix.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1); this.matrix.multiply(c.projectionMatrix); this.matrix.multiply(c.matrixWorldInverse);
      // oblique near plane so nothing below the water is drawn
      this.plane.setFromNormalAndCoplanarPoint(this.n, this.t.set(0, pY, 0)); this.plane.applyMatrix4(c.matrixWorldInverse);
      const cp = this.clip.set(this.plane.normal.x, this.plane.normal.y, this.plane.normal.z, this.plane.constant), pm = c.projectionMatrix.elements, q = this.q;
      q.x = (Math.sign(cp.x) + pm[8]) / pm[0]; q.y = (Math.sign(cp.y) + pm[9]) / pm[5]; q.z = -1; q.w = (1 + pm[10]) / pm[14];
      cp.multiplyScalar(2 / cp.dot(q)); pm[2] = cp.x; pm[6] = cp.y; pm[10] = cp.z + 1 - 0.003; pm[14] = cp.w;
      const vis = hide.map((m) => m.visible); hide.forEach((m) => (m.visible = false));
      const au = this.r.shadowMap.autoUpdate; this.r.shadowMap.autoUpdate = false;
      this.r.setRenderTarget(this.rt); this.r.clear(); this.r.render(scene, c); this.r.setRenderTarget(null);
      this.r.shadowMap.autoUpdate = au; hide.forEach((m, i) => (m.visible = vis[i]));
      this.on = true;
    }
  }
  P.Mirror = Mirror;

  /* ---------------------------------------------------------------- water material upgrade (patched onto MeshStandardMaterial) */
  P.waterU = { uWaterQ: { value: 1 }, uReflTex: { value: null }, uReflMat: { value: new THREE.Matrix4() }, uReflOn: { value: 0 }, uWTime: { value: 0 }, uWavy: { value: 1 } };
  P.patchWater = function (m, opts = {}) {
    if (m.userData.waterPatched) return; m.userData.waterPatched = true;
    const prev = m.onBeforeCompile;
    m.onBeforeCompile = (sh, r) => {
      if (prev) prev(sh, r);
      Object.assign(sh.uniforms, P.waterU); sh.uniforms.uFlow = { value: new THREE.Vector2(...(opts.flow || [0, 0.4])) }; sh.uniforms.uScale = { value: opts.scale || 1 };
      sh.vertexShader = 'varying vec3 vWPos; varying vec4 vReflC; uniform mat4 uReflMat;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n vec4 wpW = modelMatrix * vec4(transformed, 1.0); vWPos = wpW.xyz; vReflC = uReflMat * wpW;');
      sh.fragmentShader = `varying vec3 vWPos; varying vec4 vReflC; uniform sampler2D uReflTex; uniform float uReflOn; uniform float uWaterQ; uniform float uWTime; uniform vec2 uFlow; uniform float uScale; uniform float uWavy;
        vec2 whash(vec2 p){ p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3))); return -1.0 + 2.0 * fract(sin(p) * 43758.5453); }
        float wnoise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f); return mix(mix(dot(whash(i), f), dot(whash(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0)), u.x), mix(dot(whash(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0)), dot(whash(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0)), u.x), u.y); }
        float wh(vec2 p){ float t = uWTime; vec2 q = p * uScale - uFlow * t;
          return wnoise(q * 1.7) * 0.5 + wnoise(q * 3.9 + vec2(t * 0.31, -t * 0.23)) * 0.28 + wnoise(q * 8.3 - vec2(t * 0.7, t * 0.4)) * 0.14 + sin(dot(q, vec2(0.8, 0.6)) * 6.0 + t * 2.1) * 0.05; }
        ` + sh.fragmentShader
        .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
          vec3 wN = vec3(0.0, 1.0, 0.0);
          if (uWaterQ > 0.5) { float e = 0.05; float h0 = wh(vWPos.xz); vec2 g = vec2(wh(vWPos.xz + vec2(e, 0.0)) - h0, wh(vWPos.xz + vec2(0.0, e)) - h0) / e;
            float amt = (uWaterQ > 1.5 ? 0.16 : 0.08) * uWavy; wN = normalize(vec3(-g.x * amt, 1.0, -g.y * amt)); normal = normalize((viewMatrix * vec4(wN, 0.0)).xyz); }`)
        .replace('#include <tonemapping_fragment>', `
          if (uWaterQ > 1.5) { vec3 vd = normalize(vViewPosition); float fr = 0.03 + 0.97 * pow(1.0 - clamp(dot(vd, normal), 0.0, 1.0), 5.0);
            vec3 rc = vec3(0.0); float rk = 0.0;
            if (uReflOn > 0.5) { vec4 c = vReflC; c.xy += wN.xz * 0.35 * c.w; rc = texture2DProj(uReflTex, c).rgb; rk = 1.0; }
            gl_FragColor.rgb = mix(gl_FragColor.rgb, rc, fr * rk * 0.85);
            gl_FragColor.a = mix(gl_FragColor.a * 0.82, 0.97, fr); }
          #include <tonemapping_fragment>`);
    };
    m.needsUpdate = true;
  };

  /* ---------------------------------------------------------------- shell fur */
  P.furNoise = null;
  function furTex() {
    if (P.furNoise) return P.furNoise;
    const cv = document.createElement('canvas'); cv.width = cv.height = 256; const g = cv.getContext('2d'); const r = G.U.rng(4242);
    g.fillStyle = '#000'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 9000; i++) { const v = Math.floor(90 + r() * 165); g.fillStyle = `rgb(${v},${v},${v})`; const x = r() * 256, y = r() * 256, s = 1 + r() * 1.6; g.fillRect(x, y, s, s); }
    const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.minFilter = THREE.LinearFilter; t.generateMipmaps = false; return (P.furNoise = t);
  }
  function shellMat(base, k, len) {
    const m = new THREE.MeshStandardMaterial({ color: base.color, roughness: 1, map: base.map, vertexColors: base.vertexColors });
    m.userData.shell = true; m.alphaTest = 0; const rimU = G.Mat.rimU;
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uShellK = { value: k }; sh.uniforms.uShellLen = { value: len }; sh.uniforms.uFurNoise = { value: furTex() }; sh.uniforms.rimStrength = rimU;
      sh.vertexShader = 'uniform float uShellK; uniform float uShellLen;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n transformed += normalize(objectNormal) * uShellLen * uShellK; transformed.y -= uShellLen * uShellK * uShellK * 0.35;');
      sh.fragmentShader = 'uniform float uShellK; uniform sampler2D uFurNoise; uniform float rimStrength;\n' + sh.fragmentShader
        .replace('#include <map_fragment>', '#include <map_fragment>\n float fz = texture2D(uFurNoise, vUv * vec2(9.0, 22.0)).r; if (fz < 0.36 + uShellK * 0.62) discard; diffuseColor.rgb *= mix(0.78, 1.08, uShellK);')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n float fr = pow(1.0 - abs(dot(normal, normalize(vViewPosition))), 2.4); totalEmissiveRadiance += diffuseColor.rgb * fr * rimStrength * (0.5 + uShellK);');
    };
    return m;
  }
  /* give a G.Ferret n fur shells (0 removes them) */
  P.setFurShells = function (f, n) {
    if ((f._shellN || 0) === n) return;
    if (f._shells) { for (const s of f._shells) { s.parent && s.parent.remove(s); } f._shells = null; }
    f._shellN = n; if (!n) return;
    f._shells = [];
    const targets = [f.body, f.tailTube].filter(Boolean);
    f.head.children.forEach((c) => { if (c.isMesh && c.material && c.material.map && !c.userData.noShell && c.scale.x > 0.03) targets.push(c); });
    for (const t of targets) {
      for (let i = 1; i <= n; i++) {
        const k = i / n, m = new THREE.Mesh(t.geometry, shellMat(t.material, k, t === f.body || t === f.tailTube ? 0.0075 : 0.13));
        m.castShadow = false; m.receiveShadow = true; m.frustumCulled = false; m.renderOrder = 1;
        if (t === f.body || t === f.tailTube) { t.parent.add(m); m.position.copy(t.position); m.quaternion.copy(t.quaternion); m.scale.copy(t.scale); m.userData.follow = t; }
        else { t.add(m); }
        f._shells.push(m);
      }
    }
  };
})();
