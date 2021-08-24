class Vec2 {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  copy(){
    return new Vec2(this.x, this.y);
  }

  norm1() {
    return Math.abs(this.x) + Math.abs(this.y);
  }

  norm2() {
    return (this.x ** 2 + this.y ** 2) ** 0.5;
  }

  norm_inf(){
    return Math.max(Math.abs(this.x), Math.abs(this.y));
  }

  norm2_2() {
    return this.x ** 2 + this.y ** 2;
  }

  dot(other){
    return this.x * other.x + this.y * other.y;
  }

  cross(other){
    return this.x * other.y - other.x * this.y;
  }

  op_dot(other){
    return this.x(other.x) + this.y(other.y);
  }

  op_cross(other){
    return this.x(other.y) - this.y(other.x);
  }

  op_mul(other){
    return new Vec2(this.x(other.x), this.y(other.y));
  }

  add(other) {
    return new Vec2(this.x + other.x, this.y + other.y);
  }

  sub(other) {
    return new Vec2(this.x - other.x, this.y - other.y);
  }

  mul(other) {
    return new Vec2(this.x * other.x, this.y * other.y);
  }

  div(other) {
    return new Vec2(this.x / other.x, this.y / other.y);
  }

  mod(other){
    return new Vec2(this.x % other.x, this.y % other.y);
  }

  mul_s(rhs) {
    return new Vec2(this.x * rhs, this.y * rhs);
  }

  div_s(rhs) {
    return new Vec2(this.x / rhs, this.y / rhs);
  }

  mod_s(rhs) {
    return new Vec2(this.x % rhs, this.y % rhs);
  }

  clamp(min, max){
    return new Vec2(clamp(this.x, min, max), clamp(this.y, min, max));
  }

  floor(){
    return new Vec2(Math.floor(this.x), Math.floor(this.y));
  }
}

function clamp(v, min, max) {
  return Math.min(Math.max(v, min), max);
}

const setting = {
  g : new Vec2(0,9.8),
  h : 1,
  sim_dt : 0.001,
}

class Particle {
  constructor(x, y, m = 1) {
    this.x = new Vec2(x, y);
    this.v = new Vec2(0,0);
    this.m = m;
    this.rho = 0;
  }
}

class Grid {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.data = new Array(w * h);
    this.data.forEach((_, i) => {
      this.data[i] = [];
    });
  }

  clear() {
    this.data.forEach((_, i) => {
      this.data[i] = [];
    });
  }

  check(x) {
    return x.x >= 0 && x.x < this.w && x.y >= 0 && x.y < this.h;
  }

  set(x, particle) {
    if (!this.check(x)) return false;
    const i = x.floor();
    const index = i.x + this.w * i.y;
    this.data.push(particle);
    return true;
  }

  get(x) {
    if (!this.check(x)) return null;
    const i = x.floor();
    const index = i.x + this.w * i.y;
    return this.data[index];
  }

  get_neighborhoods(x, h) {
    const neighborhoods = [];
    const i = x.floor();
    for (let a = -1; a < 2; a++) {
      for (let b = -1; b < 2; b++) {
        const ind = new Vec2(i.x + a, i.y + b);
        if (!this.check(x)) {
          continue;
        }
        const index = ind.x + this.w * ind.y;
        this.data[index].forEach((p) => {
          if (x.sub(p.x).norm2_2() < h ** 2) {
            neighborhoods.push(p);
          }
        });
      }
    }
    return neighborhoods;
  }

  forEach_neighborhoods(x, h, callback) {
    const i = x.floor();
    for (let a = -1; a < 2; a++) {
      for (let b = -1; b < 2; b++) {
        const ind = new Vec2(i.x + a, i.y + b);
        if (!this.check(x)) {
          continue;
        }
        const index = ind.x + this.w * ind.y;
        this.data[index].forEach((p) => {
          if (x.sub(p.x).norm2_2() < h ** 2) {
            callback(p);
          }
        });
      }
    }
  }
}

class SPH {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.time = 0;
    this.dt = 1;
    this.sim_time = 0;
    //
    this.fluid_layer = new Grid(w, h);
    this.solid_layer = new Grid(w, h);
    this.boundary_layer = new Grid(w, h);
    //
    this.fluids = [];
    this.solids = [];
    this.boundarys = [];
  }

  //cubic spline kernel
  W(r,h){
    const q = r.norm1() / h;
    const sigma = 40 / (7 * Math.PI * h ** 2);
    if (q <= 0.5 && q >= 0) {
      return 6 * (q ** 3 + q ** 2) + 1;
    }
    else if(q <= 1 && q > 0.5){
      return 2 * (1 - q) ** 3;
    }
    return 0;
  }

  update_layers() {
    this.fluid_layer.clear();
    this.solid_layer.clear();
    //...
    this.fluids.forEach((f) => {
      this.fluid_layer.set(f.x, f);
    });
    this.solids.forEach((s) => {
      this.solid_layer.set(s.x, s);
    });
  }

  //获取邻居,假设h永远小于格子宽度
  get_neighborhoods(x, h) {
    const neighborhoods = [];
    neighborhoods.concat(this.fluid_layer.get_neighborhoods(x, h));
    neighborhoods.concat(this.solid_layer.get_neighborhoods(x, h));
    neighborhoods.concat(this.boundary_layer.get_neighborhoods(x, h));
    return neighborhoods;
  }

  forEach_neighborhoods(x, h, callback) {
    this.fluid_layer.get_neighborhoods(x, h, callback);
    this.solid_layer.get_neighborhoods(x, h, callback);
    this.boundary_layer.get_neighborhoods(x, h, callback);
  }

  //更新流体粒子(简单流体模拟)
  simple_fluid_simulator() {
    const h = setting.h;
    //更新ρ
    this.fluids.forEach((f) => {
      f.rho = 0;
      this.forEach_neighborhoods(f.x, h, (p) => {
        f.rho += p.m * this.W(p.x.sub(f.x), h);
      });
    });
    this.fluids.forEach((f) => {
      //计算▽²v,以及f_viscosity
      //计算▽ρ,以及f_pressure
      //通过f_viscosity、f_pressure、f_ext(g)更新v
      //更新x
    });
  }

  update_particles() {
    //...
    this.simple_fluid_simulator();
    //...
    //this.update_solids();
  }

  update() {
    //更新粒子
    this.update_particles();
    //根据粒子新的位置更新网格
    this.update_layers();
    //更新时间
    this.sim_time += setting.sim_dt;
  }

  //...
}
