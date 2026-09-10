const vertexShader = `
  attribute vec2 a_position;
  varying vec2 v_uv;

  void main() {
    v_uv = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`

const fragmentShader = `
  precision highp float;

  uniform sampler2D u_image;
  uniform vec2 u_resolution;
  uniform vec2 u_imageResolution;
  uniform vec4 u_ripples[6];
  uniform float u_time;
  varying vec2 v_uv;

  vec2 coverUv(vec2 uv) {
    float canvasAspect = u_resolution.x / u_resolution.y;
    float imageAspect = u_imageResolution.x / u_imageResolution.y;

    if (imageAspect > canvasAspect) {
      uv.x = (uv.x - 0.5) * (canvasAspect / imageAspect) + 0.5;
    } else {
      uv.y = (uv.y - 0.5) * (imageAspect / canvasAspect) + 0.5;
    }

    return uv;
  }

  void main() {
    vec2 displacement = vec2(0.0);
    float shimmer = 0.0;
    float aspect = u_resolution.x / u_resolution.y;

    for (int index = 0; index < 6; index++) {
      vec4 ripple = u_ripples[index];
      float age = u_time - ripple.z;

      if (ripple.w > 0.0 && age >= 0.0 && age < 3.4) {
        vec2 delta = v_uv - ripple.xy;
        delta.x *= aspect;
        float distanceFromOrigin = length(delta);
        float waveFront = age * 0.22;
        float ring = exp(-pow((distanceFromOrigin - waveFront) * 26.0, 2.0));
        float decay = exp(-age * 0.82) * (1.0 - smoothstep(2.5, 3.4, age));
        float wave = sin(distanceFromOrigin * 88.0 - age * 15.0);
        vec2 direction = distanceFromOrigin > 0.001 ? delta / distanceFromOrigin : vec2(0.0);
        direction.x /= aspect;
        displacement += direction * wave * ring * decay * 0.018 * ripple.w;
        shimmer += ring * decay * (0.5 + 0.5 * wave) * ripple.w;
      }
    }

    vec4 color = texture2D(u_image, coverUv(v_uv + displacement));
    color.rgb += vec3(0.02, 0.11, 0.13) * shimmer;
    gl_FragColor = color;
  }
`

function compileShader(gl, type, source) {
  const shader = gl.createShader(type)
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader
  gl.deleteShader(shader)
  return null
}

function createProgram(gl) {
  const vertex = compileShader(gl, gl.VERTEX_SHADER, vertexShader)
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShader)
  if (!vertex || !fragment) return null

  const program = gl.createProgram()
  gl.attachShader(program, vertex)
  gl.attachShader(program, fragment)
  gl.linkProgram(program)
  gl.deleteShader(vertex)
  gl.deleteShader(fragment)

  if (gl.getProgramParameter(program, gl.LINK_STATUS)) return program
  gl.deleteProgram(program)
  return null
}

export function mountHeroWaterEffect(frame, image) {
  if (!frame || !image || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {}

  const canvas = document.createElement('canvas')
  canvas.setAttribute('aria-hidden', 'true')
  Object.assign(canvas.style, {
    position: 'absolute',
    inset: '0',
    zIndex: '0',
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    transition: 'transform .6s',
    transformOrigin: 'center',
  })

  const gl = canvas.getContext('webgl', {
    alpha: true,
    antialias: false,
    depth: false,
    powerPreference: 'low-power',
  })
  if (!gl) return () => {}

  const program = createProgram(gl)
  if (!program) return () => {}

  const buffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW)

  const position = gl.getAttribLocation(program, 'a_position')
  const resolution = gl.getUniformLocation(program, 'u_resolution')
  const imageResolution = gl.getUniformLocation(program, 'u_imageResolution')
  const time = gl.getUniformLocation(program, 'u_time')
  const rippleUniform = gl.getUniformLocation(program, 'u_ripples[0]')
  const textureUniform = gl.getUniformLocation(program, 'u_image')

  gl.useProgram(program)
  gl.enableVertexAttribArray(position)
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)

  const texture = gl.createTexture()
  gl.activeTexture(gl.TEXTURE0)
  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image)
  gl.uniform1i(textureUniform, 0)
  gl.uniform2f(imageResolution, image.naturalWidth, image.naturalHeight)

  const ripples = new Float32Array(24)
  let rippleIndex = 0
  let frameId = 0
  let visible = true
  let destroyed = false
  let lastPointerX = 0
  let lastPointerY = 0
  let lastPointerRipple = 0
  let nextIdleRipple = 1.8
  const startedAt = performance.now()

  function elapsedSeconds() {
    return (performance.now() - startedAt) / 1000
  }

  function addRipple(x, y, strength = 1) {
    const offset = rippleIndex * 4
    ripples[offset] = x
    ripples[offset + 1] = y
    ripples[offset + 2] = elapsedSeconds()
    ripples[offset + 3] = strength
    rippleIndex = (rippleIndex + 1) % 6
  }

  function resize() {
    const bounds = frame.getBoundingClientRect()
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5)
    const width = Math.max(1, Math.round(bounds.width * ratio))
    const height = Math.max(1, Math.round(bounds.height * ratio))
    if (canvas.width === width && canvas.height === height) return
    canvas.width = width
    canvas.height = height
    gl.viewport(0, 0, width, height)
    gl.uniform2f(resolution, width, height)
  }

  function draw() {
    if (destroyed || !visible) return
    const elapsed = elapsedSeconds()
    if (elapsed >= nextIdleRipple) {
      addRipple(0.28 + Math.random() * 0.44, 0.28 + Math.random() * 0.44, 0.58)
      nextIdleRipple = elapsed + 4.5 + Math.random() * 3
    }
    gl.uniform1f(time, elapsed)
    gl.uniform4fv(rippleUniform, ripples)
    gl.drawArrays(gl.TRIANGLES, 0, 6)
    frameId = requestAnimationFrame(draw)
  }

  function onPointerMove(event) {
    const now = performance.now()
    const moved = Math.hypot(event.clientX - lastPointerX, event.clientY - lastPointerY)
    if (moved < 14 || now - lastPointerRipple < 85) return
    const bounds = frame.getBoundingClientRect()
    addRipple(
      (event.clientX - bounds.left) / bounds.width,
      1 - (event.clientY - bounds.top) / bounds.height,
      Math.min(1.15, 0.68 + moved / 90),
    )
    lastPointerX = event.clientX
    lastPointerY = event.clientY
    lastPointerRipple = now
  }

  function onPointerEnter() {
    canvas.style.transform = 'scale(1.04)'
  }

  function onPointerLeave() {
    canvas.style.transform = 'scale(1)'
  }

  frame.appendChild(canvas)
  resize()
  addRipple(0.5, 0.52, 0.5)

  const resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(frame)
  const visibilityObserver = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting
    cancelAnimationFrame(frameId)
    if (visible) draw()
  }, { threshold: 0.05 })
  visibilityObserver.observe(frame)

  frame.addEventListener('pointermove', onPointerMove, { passive: true })
  frame.addEventListener('pointerenter', onPointerEnter, { passive: true })
  frame.addEventListener('pointerleave', onPointerLeave, { passive: true })
  draw()

  return () => {
    destroyed = true
    cancelAnimationFrame(frameId)
    resizeObserver.disconnect()
    visibilityObserver.disconnect()
    frame.removeEventListener('pointermove', onPointerMove)
    frame.removeEventListener('pointerenter', onPointerEnter)
    frame.removeEventListener('pointerleave', onPointerLeave)
    gl.deleteTexture(texture)
    gl.deleteBuffer(buffer)
    gl.deleteProgram(program)
    canvas.remove()
  }
}
