const glsl = (x) => x[0]
const width = 800;
const height = 600;
const vertices = new Float32Array([
  -1.0, -1.0,
  1.0, -1.0,
  -1.0, 1.0,
  1.0, 1.0
]);

//默认顶点着色器
const vs_default_str = glsl`
precision mediump float;
attribute vec2 position;
void main()
{
    gl_Position = vec4(position, 0.0, 1.0);
}
`;

//用于显示的像素着色器
const fs_display_str = glsl`
precision mediump float;

uniform sampler2D tex;

void main()
{
    vec2 uv = vec2(gl_FragCoord.x/800.0,gl_FragCoord.y/600.0);
    gl_FragColor = texture2D(tex, uv);
}
`;

//用于计算光追的像素着色器
//参考了:
const fs_ray_tracing_str = glsl`
precision mediump float;

uniform sampler2D tex;

struct ray
{
  vec3 orig;
  vec3 dir;
};

vec3 lerp(vec3 a, vec3 b, float k)
{
  return (1.0-k) * a + k* b;
}

vec3 ray_at(ray r,float t)
{
  return r.orig+r.dir*t;
}

float hit_sphere(in vec3 center,in float radius,inout ray r) {
  vec3 oc = r.orig - center;
  float a = dot(r.dir,r.dir);
  float half_b = dot(oc, r.dir);
  float c = dot(oc, oc) - radius*radius;
  float discriminant = half_b*half_b - a*c;
  if (discriminant < 0.0) {
      return -1.0;
  } else {
      return (-half_b - sqrt(discriminant) ) / a;
  }
}

vec3 ray_color(ray r) {
  float t = hit_sphere(vec3(0.0,0.0,-1.0), 0.5, r);
  if (t > 0.0) {
      vec3 N = normalize(ray_at(r,t) - vec3(0.0,0.0,-1.0));
      return 0.5*vec3(N.x+1.0, N.y+1.0, N.z+1.0);
  }
  vec3 dir = normalize(r.dir);
  t = 0.5*(dir.y + 1.0);
  return lerp(vec3(1.0, 1.0, 1.0),vec3(0.5, 0.7, 1.0),t);
}

void main()
{
    vec2 uv = gl_FragCoord.xy/vec2(800.0,600.0);
    vec3 lower_left_corner = vec3(-2.0, -1.5, -1.0);
    vec3 horizontal = vec3(4.0, 0.0, 0.0);
    vec3 vertical= vec3(0.0, 3.0, 0.0);
    vec3 origin = vec3(0.0, 0.0, 0.0);
    ray r = ray(origin, lower_left_corner + uv.x*horizontal + uv.y*vertical);
    vec3 color = ray_color(r);
    gl_FragColor = vec4(color,1.0);//vec4(gl_FragCoord.xy/600.0, 1.0, 1.0) + texture2D(tex,uv);
}
`;

//创建着色器
function create_program(gl, vs_src, fs_src) {
  const vs = gl.createShader(gl.VERTEX_SHADER);
  const fs = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(vs, vs_src);
  gl.shaderSource(fs, fs_src);
  gl.compileShader(vs);
  gl.compileShader(fs);
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  return program;
}

//创建纹理
function create_texture(gl){
  const tex =  gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    width,
    height,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    null
  );
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return tex;
}

//主函数
function main() {
  const canvas = document.createElement("canvas");
  const gl = canvas.getContext("webgl2");
  canvas.width = width;
  canvas.height = height;
  gl.viewport(0, 0, width, height);

  //创建资源
  const program_ray_tracing = create_program(gl, vs_default_str, fs_ray_tracing_str);
  const program_display = create_program(gl,vs_default_str,fs_display_str);
  const loc_pos_rt = gl.getAttribLocation(program_ray_tracing, "position");
  const loc_pos_display = gl.getAttribLocation(program_display, "position");
  const loc_tex_rt = gl.getUniformLocation(program_ray_tracing, "tex");
  const loc_tex_display = gl.getUniformLocation(program_display, "tex");

  //...
  const vbo = gl.createBuffer();
  const fbo = gl.createFramebuffer();
  const tex0 = create_texture(gl); //将要绑定到TEXTURE0
  const tex1 = create_texture(gl); //将要绑定到fbo

  gl.bindTexture(gl.TEXTURE_2D,tex0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    tex1,
    0
  );
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
  gl.vertexAttribPointer(loc_pos_rt, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(loc_pos_rt);
  gl.vertexAttribPointer(loc_pos_display, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(loc_pos_display);
  gl.useProgram(program_ray_tracing);
  gl.uniform1i(loc_tex_rt,0);
  gl.useProgram(program_display);
  gl.uniform1i(loc_tex_display,0);
  //
  document.body.appendChild(canvas);

  const update = () => {
    gl.clearColor(0,0,0,1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.useProgram(program_ray_tracing);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    //将tex1 copy 到 tex0
    gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 0, 0, width, height);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.useProgram(program_display);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };
  setInterval(update, 0);
}
