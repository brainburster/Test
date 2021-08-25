class Vec2 {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  copy() {
    return new Vec2(this.x, this.y);
  }

  norm1() {
    return Math.abs(this.x) + Math.abs(this.y);
  }

  norm2() {
    return (this.x ** 2 + this.y ** 2) ** 0.5;
  }

  norm_inf() {
    return Math.max(Math.abs(this.x), Math.abs(this.y));
  }

  norm2_2() {
    return this.x ** 2 + this.y ** 2;
  }

  dot(other) {
    return this.x * other.x + this.y * other.y;
  }

  cross(other) {
    return this.x * other.y - other.x * this.y;
  }

  op_dot(other) {
    return this.x(other.x) + this.y(other.y);
  }

  op_cross(other) {
    return this.x(other.y) - this.y(other.x);
  }

  op_mul_s(rhs) {
    return new Vec2(this.x(rhs), this.y(rhs));
  }

  op_mul(other) {
    return new Vec2(this.x(other.x), this.y(other.y));
  }

  add(other) {
    return new Vec2(this.x + other.x, this.y + other.y);
  }

  add_e(other) {
    this.x += other.x;
    this.y += other.y;
  }

  sub(other) {
    return new Vec2(this.x - other.x, this.y - other.y);
  }

  sub_e(other) {
    this.x -= other.x;
    this.y -= other.y;
  }

  mul(other) {
    return new Vec2(this.x * other.x, this.y * other.y);
  }

  mul_e(other) {
    this.x *= other.x;
    this.y *= other.y;
  }

  div(other) {
    return new Vec2(this.x / other.x, this.y / other.y);
  }

  div_e(other) {
    this.x /= other.x;
    this.y /= other.y;
  }

  mod(other) {
    return new Vec2(this.x % other.x, this.y % other.y);
  }

  mod_e(other) {
    this.x %= other.x; 
    this.y %= other.y;
  }

  mul_s(rhs) {
    return new Vec2(this.x * rhs, this.y * rhs);
  }

  mul_s_e(rhs) {
    this.x *= rhs; 
    this.y *= rhs;
  }

  div_s(rhs) {
    return new Vec2(this.x / rhs, this.y / rhs);
  }

  div_s_e(rhs) {
    this.x /= rhs; 
    this.y /= rhs;
  }

  mod_s(rhs) {
    return new Vec2(this.x % rhs, this.y % rhs);
  }

  mod_s_e(rhs) {
    this.x %= rhs; 
    this.y %= rhs;
  }

  clamp(min, max) {
    return new Vec2(clamp(this.x, min, max), clamp(this.y, min, max));
  }

  clamp_e(min, max) {
    this.x = clamp(this.x, min, max);
    this.y = clamp(this.y, min, max);
  }

  floor() {
    return new Vec2(Math.floor(this.x), Math.floor(this.y));
  }

  floor_e() {
    this.x = Math.floor(this.x);
    this.y = Math.floor(this.y);
  }
}

function clamp(v, min, max) {
  return Math.min(Math.max(v, min), max);
}

const setting = {
  g: new Vec2(0, 9.8),
  h: 20,
  sim_dt: 0.001,
  B: 80,
  gama: 6,
};

class Particle {
  constructor(x, y, m = 1,p=0,rho=1) {
    this.x = new Vec2(x, y);
    this.v = new Vec2(0, 0);
    this.a = new Vec2(0, 0);
    this.m = m;
    this.p = p;
    this.rho = rho;
  }
}

class Grid {
  constructor(w, h) {
    this.size = 20;
    this.w = Math.floor(w / 20);
    this.h = Math.floor(h / 20);
    this.data = new Array(this.w * this.h);
    for (let index = 0; index < this.w * this.h; index++) {
      this.data[index] = [];
    }
  }

  clear() {
    this.data.forEach((_, i) => {
      this.data[i] = [];
    });
  }

  check_p(x) {
    return x.x >= 0 && x.x < this.w * 20 && x.y >= 0 && x.y < this.h * 20;
  }

  check_g(x) {
    return x.x >= 0 && x.x < this.w && x.y >= 0 && x.y < this.h;
  }

  set(x, particle) {
    if (!this.check_p(x)) return false;
    const i = x.mul_s(0.05).floor();
    const index = i.x + this.w * i.y;
    this.data[index].push(particle);
    return true;
  }

  get(x) {
    if (!this.check_p(x)) return null;
    const i = x.mul_s(0.05).floor();
    const index = i.x + this.w * i.y;
    return this.data[index];
  }

  get_neighborhoods(p, h) {
    const neighborhoods = [];
    const i = p.x.mul_s(0.05).floor();
    for (let a = -1; a < 2; a++) {
      for (let b = -1; b < 2; b++) {
        const ind = new Vec2(i.x + a, i.y + b);
        if (!this.check_g(ind)) {
          continue;
        }
        const index = ind.x + this.w * ind.y;
        this.data[index].forEach((q) => {
          if (/*q != p &&*/ p.x.sub(q.x).norm2_2() < h ** 2) {
            neighborhoods.push(q);
          }
        });
      }
    }
    return neighborhoods;
  }

  forEach_neighborhoods(p, h, callback) {
    const i = p.x.mul_s(0.05).floor();
    for (let a = -1; a < 2; a++) {
      for (let b = -1; b < 2; b++) {
        const ind = new Vec2(i.x + a, i.y + b);
        if (!this.check_g(ind)) {
          continue;
        }
        const index = ind.x + this.w * ind.y;
        this.data[index].forEach((q) => {
          if (/*q != p &&*/ p.x.sub(q.x).norm2_2() < h ** 2) {
            callback(q);
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
    this.stop = false;
    //
    this.fluid_layer = new Grid(w, h);
    this.solid_layer = new Grid(w, h);
    this.boundary_layer = new Grid(w, h);
    //
    this.fluids = [];
    this.solids = [];
    this.boundarys = [];
    //
    this.canvas = document.createElement("canvas");
    this.canvas.width = this.w;
    this.canvas.height = this.h;
    this.ctx = this.canvas.getContext("2d");
  }

  //cubic spline kernel
  W(r, h) {
    const q = r.norm2() / h;
    const sigma = 40 / (7 * Math.PI * h ** 2);
    if (q <= 0.5 && q >= 0) {
      return sigma * 6 * (q ** 3 + q ** 2) + 1;
    } else if (q <= 1 && q > 0.5) {
      return sigma * 2 * (1 - q) ** 3;
    }
    return 0;
  }

  W_Poly6(r, h) {
    if (r < 0 || r > h) return 0;
    const sigma = 315 / (64 * Math.PI * h ** 9);
    return sigma * (h ** 2 - r ** 2) ** 3;
  }

  //▽W
  grad_W_Poly6(r, h) {
    if (r < 0 || r > h) return 0;
    const sigma = -945 / (32 * Math.PI * h ** 9);
    return sigma * (h ** 2 - r ** 2) ** 2;
  }

  //▽²W
  laplacian_W_Poly6(r, h) {
    if (r < 0 || r > h) return 0;
    const sigma = 945 / (8 * Math.PI * h ** 9);
    return sigma * (h ** 2 - r ** 2) ** 2 * (r ** 2 - 0.75 * (h ** 2 - r ** 2));
  }

  W_spiky(r,h){
    if (r < 0 || r > h) return 0;
    const sigma = 15 / (Math.PI * h ** 6);
    return sigma * (h - r) ** 3 * (r ** 2 - 0.75 * (h ** 2 - r ** 2));
  }

  grad_W_spiky(r,h){
    if (r < 0 || r > h) return 0;
    r = Math.max(r,0.01);
    const sigma = -45 / (Math.PI * h ** 6 * r);
    return sigma * (h - r) ** 2 * r;
  }


  update_layers() {
    this.fluid_layer.clear();
    this.solid_layer.clear();
    this.boundary_layer.clear();
    //...
    this.fluids.forEach((f) => {
      this.fluid_layer.set(f.x, f);
    });
    this.solids.forEach((s) => {
      this.solid_layer.set(s.x, s);
    });
    this.boundarys.forEach((s) => {
      this.boundary_layer.set(s.x, s);
    });
  }

  //获取邻居,假设h永远小于格子宽度
  get_neighborhoods(p, h) {
    const neighborhoods = [];
    neighborhoods.concat(this.fluid_layer.get_neighborhoods(p, h));
    neighborhoods.concat(this.solid_layer.get_neighborhoods(p, h));
    neighborhoods.concat(this.boundary_layer.get_neighborhoods(p, h));
    return neighborhoods;
  }

  forEach_neighborhoods(p, h, callback) {
    this.fluid_layer.forEach_neighborhoods(p, h, callback);
    this.solid_layer.forEach_neighborhoods(p, h, callback);
    this.boundary_layer.forEach_neighborhoods(p, h, callback);
  }

  //更新流体粒子(WCSPH)
  simple_fluid_simulator() {
    const g = setting.g;
    const h = setting.h;
    const B = setting.B;
    const gama = setting.gama;
    const dt = setting.sim_dt;
    const _1_0 = new Vec2(1, 0);
    const _0_1 = new Vec2(0, 1);
    const _1_n1 = new Vec2(1, -1);
    const _n1_1 = new Vec2(-1, 1);

    const W = this.W_Poly6;
    const G_W = (x, h) =>
      new Vec2(this.grad_W_spiky(x.x, h), this.grad_W_spiky(x.y, h));
    //更新ρ
    const substep = () => {
      this.fluids.forEach((p) => {
        p.rho = 0;
        this.forEach_neighborhoods(p, h, (q) => {
          p.rho += q.m * this.W(p.x.sub(q.x), h);
        });
      });

      //更新p
      this.fluids.forEach((p) => {
        p.p = B * (p.rho ** gama - 1);
      });

      this.fluids.forEach((p) => {
        //计算 f_pressure
        const grid_p = new Vec2(0, 0);
        this.forEach_neighborhoods(p, h, (q) => {
          if (p != q) {
            const a = 0;
          }
          //const wij = W(p.x.sub(q.x).norm2(), h);
          const grand_wij = G_W(p.x.sub(q.x), h);

          grid_p.add_e(
            grand_wij.mul_s(q.m * (p.p / p.rho ** 2 + q.p / q.rho ** 2))
          );
        });
        grid_p.mul_s_e(p.rho);
        const f_pres = grid_p.mul_s(-1 / p.rho);
        //通过f_pressure、f_ext(g)更新v
        // const a = f_pres.add(g.mul_s(p.rho)).div_s(p.m);
        // p.v.add_e(f_pres.add(g.mul_s(p.rho)).div_s(p.m).mul_s(dt));
        // //更新x
        // p.x.add_e(p.v.mul_s(dt));
        // p.v.mul_s_e(0.999);

        //通过f_pressure、f_ext(g)更新v
        const a = f_pres.add(g.mul_s(p.rho)).div_s(p.m);
        const v = p.v.add(a.mul_s(dt));
        p.x.add_e(p.v.mul_s(dt))
        p.x.add_e(a.mul_s(dt ** 2 * 0.5));
        p.v = p.v.add(v).mul_s(0.5).mul_s(0.9999);

        if (p.x.x < 0) {
          p.x.x = 0;
          p.v.mul_s(_n1_1);
        } else if (p.x.x > this.w - 1) {
          p.x.x = this.w - 1;
          p.v.mul_e(_n1_1);
        } else if (p.x.y < 0) {
          p.x.y = 0;
          p.v.mul_e(_1_n1);
        } else if (p.x.y > this.h - 1) {
          p.x.y = this.h - 1;
          p.v.mul_e(_1_n1);
        }
      });
    };
    for (let i = 0; i < 10; i++) {
      substep();
    }
  }

  update_particles() {
    //...
    this.simple_fluid_simulator();
    //...
    //this.update_solids();
  }

  update() {
    //根据粒子新的位置更新网格
    this.update_layers();
    //更新粒子
    this.update_particles();
    //更新时间
    this.sim_time += setting.sim_dt;
  }

  //...

  get_canvas() {
    return this.canvas;
  }

  draw_particle() {
    this.fluids.forEach((f) => {
      this.ctx.beginPath();
      this.ctx.arc(f.x.x, f.x.y, 5, 0, 2 * Math.PI);
      this.ctx.closePath();
      this.ctx.strokeStyle = "blue";
      this.ctx.stroke();
    });

    this.solids.forEach((f) => {
      this.ctx.beginPath();
      this.ctx.arc(f.x.x, f.x.y, 5, 0, 2 * Math.PI);
      this.ctx.closePath();
      this.ctx.strokeStyle = "brown";
      this.ctx.stroke();
    });

    this.boundarys.forEach((f) => {
      this.ctx.beginPath();
      this.ctx.arc(f.x.x, f.x.y, 5, 0, 2 * Math.PI);
      this.ctx.closePath();
      this.ctx.strokeStyle = "black";
      this.ctx.stroke();
    });
  }

  render() {
    this.ctx.clearRect(0, 0, this.w, this.h);
    this.draw_particle();
  }

  init() {
    for (let i = this.w * 0.25; i < this.w * 0.75; i += 30) {
      for (let j = this.h * 0.5; j < this.h; j += 30) {
        this.fluids.push(new Particle(i, j, 1));
      }
    }
  }

  run() {
    let previous = new Date().getTime();
    let lag = 0.0;
    const gameloop = () => {
      const current = new Date().getTime();
      const elapsed = current - previous;
      previous = current;
      lag += elapsed;
      if (lag < 300) {
        while (lag >= this.dt) {
          lag -= this.dt;
          if (this.stop) continue;
          this.update();
          this.time += this.dt;
        }
        this.render();
      } else {
        console.log("计算超时");
        lag = 0;
      }

      requestAnimationFrame(gameloop);
    };

    this.init();
    //this.handle_input();
    gameloop();
  }
}

function main() {
  let sph = new SPH(400, 300);
  document.body.appendChild(sph.get_canvas());
  sph.run();
}
