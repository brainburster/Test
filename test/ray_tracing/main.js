"use strict";
const glsl = (x) => x[0]
const width = 800;
const height = 600;
var nsamples = 32;
const vertices = new Float32Array([
  -1.0, -1.0,
  1.0, -1.0,
  -1.0, 1.0,
  1.0, 1.0
]);

//vec3 cross
const cross = (a, b)=>{
  return [
    a[1] * b[2] - b[1] * a[2],
    b[0] * a[2] - a[0] * b[2],
    a[0] * b[1] - b[0] * a[1],
  ];
}

const normalize = (v)=>{
  const l = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  return [v[0] / l, v[1] / l, v[2] / l];
}

//默认顶点着色器
const vs_default_str = glsl`#version 300 es
#pragma vscode_glsllint_stage : vert
precision mediump float;
in vec2 position;
void main()
{
    gl_Position = vec4(position, 0.0, 1.0);
}
`;

//用于显示的像素着色器
const fs_display_str = glsl`#version 300 es
#pragma vscode_glsllint_stage : frag
precision mediump float;

uniform sampler2D tex;
out vec4 frag_color;
void main()
{
    vec2 uv = vec2(gl_FragCoord.x/800.0, gl_FragCoord.y/600.0);
    //滤波
    vec4 color = texelFetch(tex, ivec2(gl_FragCoord),0)*16.;
    color += texelFetch(tex, ivec2(gl_FragCoord)+ivec2(0,1),0) *4.;
    color += texelFetch(tex, ivec2(gl_FragCoord)+ivec2(0,-1),0) *4.;
    color += texelFetch(tex, ivec2(gl_FragCoord)+ivec2(1,0),0) *4.;
    color += texelFetch(tex, ivec2(gl_FragCoord)+ivec2(-1,0),0) *4.;
    color += texelFetch(tex, ivec2(gl_FragCoord)+ivec2(2,0),0) *2.;
    color += texelFetch(tex, ivec2(gl_FragCoord)+ivec2(-2,0),0) *2.;
    color += texelFetch(tex, ivec2(gl_FragCoord)+ivec2(0,-2),0) *2.;
    color += texelFetch(tex, ivec2(gl_FragCoord)+ivec2(0,2),0) *2.;
    color += texelFetch(tex, ivec2(gl_FragCoord)+ivec2(4,4),0) *1.;
    color += texelFetch(tex, ivec2(gl_FragCoord)+ivec2(-4,-4),0) *1.;
    color += texelFetch(tex, ivec2(gl_FragCoord)+ivec2(4,-4),0) *1.;
    color += texelFetch(tex, ivec2(gl_FragCoord)+ivec2(-4,4),0) *1.;
    color = pow(color/44.,vec4(1./2.2));

    frag_color = color;
}
`;

//用于计算光追的像素着色器
//主要参考了: https://raytracing.github.io/books/RayTracingInOneWeekend.html
//以及(还没做): https://raytracing.github.io/books/RayTracingTheNextWeek.html
const fs_ray_tracing_str = glsl`#version 300 es
#pragma vscode_glsllint_stage : frag
precision mediump float;

uniform uint iFrame;
uniform uint maxFrame;
uniform float d;
uniform sampler2D tex;
uniform mat3 ca;
out vec4 frag_color;

vec3 lerp(vec3 a, vec3 b, float k)
{
  return (1.0-k) * a + k* b;
}

//#region rand
//gpu随机数
//参见: http://www.jcgt.org/published/0009/03/02/
//以及: https://www.shadertoy.com/view/XlGcRh
uvec3 pcg3d(uvec3 v) {
  v = v * 1664525u + 1013904223u;

  v.x += v.y*v.z;
  v.y += v.z*v.x;
  v.z += v.x*v.y;

  v ^= v >> 16u;

  v.x += v.y*v.z;
  v.y += v.z*v.x;
  v.z += v.x*v.y;

  return v;
}

vec3 rand(vec3 seed){
  return vec3(pcg3d(uvec3(floatBitsToUint(seed.x),floatBitsToUint(seed.y),floatBitsToUint(seed.z))))*(1.0/float(0xffffffffu));
}

vec3 rand(uint seed){
  return vec3(pcg3d(uvec3(seed+1024u+iFrame*3u%100u,seed+1025u+iFrame*7u%100u,seed+1023u+iFrame*13u%100u)))*(1.0/float(0xffffffffu));
}

vec3 random_unit_vector(vec3 p){
  vec3 ran = rand(p+vec3(iFrame*20u));
  float a = ran.x*2.0*3.14159;
  float z = ran.y*2.0-1.0;
  float r = sqrt(1.0 - z*z);
  return vec3(r*cos(a), r*sin(a), z);
}

vec3 random_in_unit_disk(vec3 p) {
  while (true) {
    vec3 ran = vec3(rand(p+vec3(iFrame*20u)).xy,0.0);
      if (length(ran) >= 1.0) continue;
      return ran;
  }
}

//#endregion rand

//下面的代码基本是从RayTracingInOneWeekend中的c++代码平移过来的

//#region ray
struct ray
{
  vec3 orig;
  vec3 dir;
};

vec3 ray_at(ray r,float t)
{
  return r.orig+r.dir*t;
}
//#endregion ray

//#region hit_record
struct hit_record
{
  vec3 p;
  vec3 normal;
  float t;
  bool front_face;
};

void set_face_normal(inout hit_record hr,in ray r,in vec3 outward_normal)
{
  hr.front_face = dot(r.dir,outward_normal)<0.0;
  hr.normal = hr.front_face ? outward_normal : - outward_normal;
}
//#endregion hit_record

//#region sphere
struct sphere
{
  vec3 center;
  float radius;
};

bool hit(in sphere s, in ray r,in float t_min,in float t_max,inout hit_record rec)
{
  vec3 oc = r.orig - s.center;
  float a = dot(r.dir,r.dir);
  float half_b = dot(oc, r.dir);
  float c = dot(oc, oc) - s.radius*s.radius;
  float discriminant = half_b*half_b - a*c;

  if (discriminant > 0.0) {
        float root = sqrt(discriminant);
        float temp = (-half_b - root)/a;
        if (temp < t_max && temp > t_min) {
            rec.t = temp;
            rec.p = ray_at(r,rec.t);
            vec3 outward_normal = (rec.p-s.center) /s.radius;
            set_face_normal(rec, r, outward_normal);
            return true;
        }
        temp = (-half_b + root) / a;
        if (temp < t_max && temp > t_min) {
            rec.t = temp;
            rec.p = ray_at(r,rec.t);
            vec3 outward_normal = (rec.p-s.center) /s.radius;
            set_face_normal(rec, r, outward_normal);
            return true;
        }
    }
    return false;
}
//#endregion

//#region camera
struct camera
{
  vec3 orig;
  vec3 lower_left_corner;
  vec3 horizontal;
  vec3 vertical;
};

mat3 camera_mat( in vec3 ro, in vec3 ta, float cr )
{
	vec3 cw = normalize(ta-ro);
	vec3 cp = vec3(sin(cr), cos(cr),0.0);
	vec3 cu = normalize( cross(cw,cp) );
	vec3 cv = cross(cu,cw);
  return mat3( cu, cv, cw );
}

camera create_camera(float vfov,float aspect)
{
  float theta = radians(vfov);
  float half_height = tan(theta/2.0);
  float half_width  = half_height*aspect;
  vec3 orig =ca*vec3(0.,0.,d);
  camera c = camera(
    orig,
    ca*vec3(-half_width, -half_height, -1.0),
    ca*vec3(half_width*2., 0.0, 0.0),
    ca*vec3(0.0, half_height*2., 0.0)
  );
  return c;
}

ray get_ray(camera c,float u,float v)
{
  vec3 off = 0.03*random_in_unit_disk(vec3(u,v,u*v));
  off*=vec3(u,v,0.0);
  return ray(c.orig+off,c.lower_left_corner+u*c.horizontal+v*c.vertical-off);
}
//#endregion camera

//#region material

struct material
{
  uint category;
  vec4 data;
};

//菲涅尔项
float schlick(float cosine, float ref_idx) {
  float r0 = (1.0-ref_idx) / (1.0+ref_idx);
  r0 = r0*r0;
  return r0 + (1.0-r0)*pow((1.0 - cosine),5.0);
}

vec3 attenuation;
ray scattered;
material m;
hit_record hr;
bool scatter(in ray r_in)
{
  if (0u==m.category) { //lambert材质
    vec3 dir = hr.normal + random_unit_vector(hr.p);
    scattered.orig = hr.p;
    scattered.dir = dir;
    attenuation = m.data.xyz;
    return true;
  } 
  else if(1u==m.category){ //metal
    vec3 reflected = reflect(normalize(r_in.dir), hr.normal);
    scattered = ray(hr.p, reflected+rand(hr.p).x*m.data.w);
    attenuation = m.data.xyz;
    return (dot(scattered.dir, hr.normal) > 0.0);
  }
  else if(2u==m.category){ //dielectric
    attenuation = m.data.xyz;
    float etai_over_etat = (hr.front_face)?(1.0 / m.data.w):(m.data.w);
    vec3 unit_direction = normalize(r_in.dir);
    float cos_theta = min(dot(-unit_direction, hr.normal), 1.0);
    float sin_theta = sqrt(1.0 - cos_theta*cos_theta);
    if (etai_over_etat * sin_theta > 1.0 ) {
      vec3 reflected = reflect(unit_direction, hr.normal);
      scattered = ray(hr.p, reflected);
      return true;
    }
    float reflect_prob = schlick(cos_theta, etai_over_etat);
    if (rand(hr.p).x < reflect_prob)
    {
      vec3 reflected = reflect(unit_direction, hr.normal);
      scattered = ray(hr.p, reflected);
      return true;
    }
    vec3 refracted = refract(unit_direction, hr.normal, etai_over_etat);
    scattered = ray(hr.p, refracted);
    return true;
  } else if(3u==m.category){//棋盘格
    vec3 dir = hr.normal + random_unit_vector(hr.p);
    scattered.orig = hr.p;
    scattered.dir = dir;
    vec3 sines = sin(10.0*hr.p);
    float v = sines.x*sines.z;
    if(v<0.0){
      attenuation = vec3(1.0);
    }else{
      attenuation = m.data.xyz;
    }
    return true;
  } else if(4u==m.category){
    attenuation = m.data.xyz;
    return false;
  }
  return true;
}

//#endregion material

//#region xy_rect
struct xy_rect
{
  float x0, x1, y0, y1, k;
};

bool hit(xy_rect rect, ray r,float t0,float t1,inout hit_record hr)
{
  float t = (rect.k-r.orig.z) / r.dir.z;
  if (t < t0 || t > t1)
      return false;
  float x = r.orig.x + t*r.dir.x;
  float y = r.orig.y + t*r.dir.y;
  if (x < rect.x0 || x > rect.x1 || y < rect.y0 || y > rect.y1)
      return false;
  hr.t = t;
  vec3 outward_normal = vec3(0, 0, 1);
  set_face_normal(hr,r, outward_normal);
  hr.p = ray_at(r,t);
  return true;
}

//#endregion xy_rect

//#region aabb
struct aabb
{
    vec3 min;
    vec3 max;
};

bool aabb_hit(aabb box, ray r, float tmin,float tmax)
{
    for(int a = 0;a<3;a++){
        float invD = 1.0f / r.dir[a];
        float t0 = (box.min[a]-r.orig[a])*invD;
        float t1 = (box.max[a]-r.orig[a])*invD;
        if(invD<0.0f)
        {
            float t2 = t0;
            t0 = t1;
            t1 = t2;
        }
        tmin = t0>tmin ? t0:tmin; 
        tmax = t1<tmax ? t1:tmax; 
        if(tmax<tmin)
        {
            return false;
        }
    }
    return true;
}

aabb surrounding_box(aabb box0,aabb box1)
{
    vec3 small = min(box0.min,box1.min);
    vec3 big = max(box0.max,box1.max);
    return aabb(small,big);
}

aabb get_aabb(in sphere s)
{
    return aabb(s.center - vec3(s.radius),s.center + vec3(s.radius));
}

aabb get_aabb(in xy_rect rect)
{
    return aabb(vec3(rect.x0,rect.y0,rect.k-0.0001),vec3(rect.x1,rect.y1,rect.k+0.0001));
}
//#endregion aabb

//todo: 使用uniform数组保存场景
const sphere s0 = sphere(vec3(0.0,0.0,0.0),0.3);
const sphere s1 = sphere(vec3(0.0,-100.31,0.0),100.0);
const sphere s2 = sphere(vec3(0.65,0.0,0.0),0.3);
const sphere s3 = sphere(vec3(-0.65,0.0,0.0),0.3);
const sphere s4 = sphere(vec3(0.0,2.0,0.0),1.0);
const xy_rect mirror = xy_rect(-1.6,1.6,-0.30,1.0,-0.7);
const xy_rect mirror2 = xy_rect(-1.6,1.6,-0.30,1.0,3.0);

const material m0 = material(0u,vec4(0.7, 0.3, 0.3,0.0));
const material m1 = material(1u,vec4(0.85, 0.85, 0.85,0.1));
const material m2 = material(3u,vec4(0.8, 0.8, 0.0,0.0));
const material m3 = material(2u,vec4(0.99, 0.99, 0.99, 1.52));
const material m4 = material(4u,vec4(0.8, 0.8, 0.8, 0.0));
const material m5 = material(1u,vec4(0.95, 0.95, 0.95,0.0));

bool hit_world(in ray r)
{
  bool hit_anything = false;
  hit_record hr_old = hr;
  hr_old.t = 1e16;

  if(aabb_hit(get_aabb(s0),r,0.01,100.0)&&hit(s0,r,0.01,100.0,hr)){
    hit_anything = true;
    if(hr.t<hr_old.t){
      m = m0;
      hr_old = hr;
    }else{
      hr = hr_old;
    }
  }
  if(aabb_hit(get_aabb(s1),r,0.01,100.0)&&hit(s1,r,0.01,100.0,hr)){
    hit_anything = true;
    if(hr.t<hr_old.t){
      m = m2;
      hr_old = hr;
    }else{
      hr = hr_old;
    }
  }
  if(aabb_hit(get_aabb(s2),r,0.01,100.0)&&hit(s2,r,0.01,100.0,hr)){
    hit_anything = true;
    if(hr.t<hr_old.t){
      m = m1;
      hr_old = hr;
    }else{
      hr = hr_old;
    }
  }
  if(aabb_hit(get_aabb(s3),r,0.01,100.0)&&hit(s3,r,0.01,100.0,hr)){
    hit_anything = true;
    if(hr.t<hr_old.t){
      m = m3;
      hr_old = hr;
    }else{
      hr = hr_old;
    }
  }
  if(aabb_hit(get_aabb(s4),r,0.01,100.0)&&hit(s4,r,0.01,100.0,hr)){
    hit_anything = true;
    if(hr.t<hr_old.t){
      m = m4;
      hr_old = hr;
    }else{
      hr = hr_old;
    }
  }
  if(aabb_hit(get_aabb(mirror),r,0.01,100.0)&&hit(mirror,r,0.01,100.0,hr)){
    hit_anything = true;
    if(hr.t<hr_old.t){
      m = m5;
      hr_old = hr;
    }else{
      hr = hr_old;
    }
  }
  if(aabb_hit(get_aabb(mirror2),r,0.01,100.0)&&hit(mirror2,r,0.01,100.0,hr)){
    hit_anything = true;
    if(hr.t<hr_old.t){
      m = m5;
      hr_old = hr;
    }else{
      hr = hr_old;
    }
  }
  return hit_anything;
}

//天空颜色
//todo: 使用天空盒
vec3 sky_color(ray r){
  vec3 dir = normalize(r.dir);
  float t = 0.5*(dot(dir,vec3(0.,1.,0.0)) + 1.0);
  return lerp(vec3(1.0, 1.0, 1.0),vec3(0.5, 0.7, 1.0),t);
}

vec3 ray_color(ray r)
{
  ray r_in = r;
  int i=0;
  vec3 color = vec3(0.0,0.0,0.0);
  //vec3 att[32]; 
  vec3 att = vec3(1.);
  while (i++<32) {
    if (hit_world(r_in)) {
      if(scatter(r_in)){
        r_in = scattered; //反射的光线
        //att[i] = attenuation;
        att *= attenuation;
      }else{
        color = attenuation;
        break;
      }
    }else{
      //color = sky_color(r_in)*0.3;
      color = vec3(0.0);
      break;
    }
  }
  
  // while(--i>0)
  // {
  //   color = att[i]*color;
  // }
  return color*att;
}

void main()
{
    vec2 uv = (gl_FragCoord.xy+vec2(0.5,0.5))/vec2(800.0,600.0);
    camera c = create_camera(70.,4./3.);
    vec3 color;
    for (uint i = 0u; i < 4u; i++)
    {
      vec3 ra = rand(iFrame*23u+i*47u)*0.001;
      ray r = get_ray(c,uv.x+ra.x,uv.y+ra.y);
      color += ray_color(r) / 4.0; 
    }
    color /= float(maxFrame);
    color += texelFetch(tex, ivec2(gl_FragCoord),0).xyz;//texture(tex,uv).rgb;
    frag_color = vec4(color, 1.0);
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

//创建(浮点)纹理
function create_texture(gl){
  const tex =  gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  //要绑定到fbo需要颜色格式color_renderable
  //参见:https://www.khronos.org/registry/OpenGL/specs/es/3.0/es_spec_3.0.pdf#page=143&zoom=100,168,666
  //opengl中GL_RGB16F是color_renderable的，然而在opengl es(包括webgl)中不是
  //参见:https://stackoverflow.com/questions/69016956/webgl2-incomplete-framebuffer
  // gl.texImage2D(
  //   gl.TEXTURE_2D,
  //   0,
  //   gl.RGB10_A2,
  //   width,
  //   height,
  //   0,
  //   gl.RGBA,
  //   gl.UNSIGNED_INT_2_10_10_10_REV,
  //   null
  // );
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGB10_A2,
    width,
    height,
    0,
    gl.RGBA,
    gl.UNSIGNED_INT_2_10_10_10_REV,
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
  let yaw=90;
  let pitch=30;
  let d=3;

  //创建资源
  const program_ray_tracing = create_program(gl, vs_default_str, fs_ray_tracing_str);
  const program_display = create_program(gl,vs_default_str,fs_display_str);
  const loc_pos_rt = gl.getAttribLocation(program_ray_tracing, "position");
  const loc_pos_display = gl.getAttribLocation(program_display, "position");
  const loc_tex_rt = gl.getUniformLocation(program_ray_tracing, "tex");
  const loc_tex_display = gl.getUniformLocation(program_display, "tex");
  const loc_iFrame = gl.getUniformLocation(program_ray_tracing, "iFrame");
  const loc_maxFrame = gl.getUniformLocation(program_ray_tracing, "maxFrame");
  const loc_ca = gl.getUniformLocation(program_ray_tracing, "ca");
  const loc_d = gl.getUniformLocation(program_ray_tracing, "d");



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
  gl.uniform1ui(loc_iFrame,0);
  gl.uniform1ui(loc_d, d);
  gl.uniform1ui(loc_maxFrame,nsamples);
  gl.uniformMatrix3fv(loc_ca, false, [1, 0, 0, 0, 1, 0, 0, 0, 1]);
  gl.useProgram(program_display);
  gl.uniform1i(loc_tex_display,0);

  //
  document.body.appendChild(canvas);
  //
  const range = document.createElement("input");
  range.type = "range";
  range.min=1;
  range.max=128;
  range.value=nsamples;
  range.step=1;
  document.body.appendChild(document.createElement("br"));
  document.body.appendChild(range);

  let i = 0;
  const update = () => {
    if (i >= nsamples) return;
    gl.uniform1ui(loc_maxFrame,nsamples);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.useProgram(program_ray_tracing);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    //将tex1 copy 到 tex0, 为了累积采样光线
    gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 0, 0, width, height);
    gl.uniform1ui(loc_iFrame, ++i);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.clearColor(1, 1, 1, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program_display);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };
  
  setInterval(update, 0);
  
  const update_camera = ()=>{
      //更新相机矩阵
      const y = (-yaw / 180.0) * 3.14159265;
      const p = (-pitch / 180.0) * 3.14159265;
      const front = [
        -Math.cos(y) * Math.cos(p),
        -Math.sin(p),
        -Math.sin(y) * Math.cos(p),
      ];
      let up = [0.0, 1.0, 0.0];
      const right = normalize(cross(front, up));
      up = cross(right, front);
      const ca = [...right, ...up, ...front];
      gl.useProgram(program_ray_tracing);
      gl.uniformMatrix3fv(loc_ca, false, ca);
      gl.uniform1f(loc_d, d);
      //重新开始渲染
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 0, 0, width, height);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      i = 0;
  }

  range.onchange = ()=>{
    nsamples = range.valueAsNumber;
    update_camera();
  };

  canvas.onmousemove = e=>{
    if (e.buttons == 1) {
      //移动摄像机
      //...
      yaw += e.movementX*0.1;
      pitch += e.movementY*0.1;
      pitch = Math.max(Math.min(89, pitch), -89);
      update_camera();
    }
  }
  canvas.onwheel = e=>{
    d += e.deltaY * -0.001;
    update_camera();
  }
  update_camera();
}
