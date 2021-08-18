class DNA {
  constructor(){
    //质点位置(整数坐标)
    this.p = [];
    //弹簧链接
    this.s = [];
    //肌肉链接
    this.m = [];
  }

  //随机初始化
  random_init(){
    const n = Math.random()*8+3;
    let pos = [400,300];
    for (let i = 0; i < n; i++) {
      const x = [
        Math.floor((Math.random()*2 - 1) * 50 + pos[0]),
        Math.floor((Math.random()*2 - 1) * 50 + pos[1])];
      this.p.push(x[0]*10000+x[1]);
      pos = x;
    }
    
    const closed = [];
    for (let i = 0; i < n; i++) {
      if (i > 0) {
        const id = i * 10001 - 1;
        if (Math.random() > 0.8) {
          this.m.push(id);
        } else {
          this.s.push(id);
        }
        closed.push(id);
      }
      const m = Math.random() * 5 + 1;
      for (let j = 0; j < m; j++) {
        const l = Math.floor(Math.random() * n);
        if (i === l) continue;
        const d = Math.abs(this.p[i] - this.p[l]);
        if (d / 10000 > 60 || d % 10000 > 60) continue;
        const il = i + l * 10000;
        if (closed.includes(il)) continue;
        if (closed.includes(l + i * 10000)) continue;
        if (Math.random() > 0.8) {
          this.m.push(il);
        } else {
          this.s.push(il);
        }
        closed.push(il);
      }
    }
    
  }
  //交叉
  //突变
  //生成弹簧质点生物
  gen_ms_creature(){
    return new SMCreature(this);
  }
  //序列化成字符串
  toString(){
    return JSON.stringify(this);
  }
  //从字符串反序列化
  parse(){
    return JSON.parse(this);
  }
}

class Particle {
  constructor(pos) {
    this.x = pos || [0, 0];
    this.u = [0, 0];
    //this.a = [0, 0];
    this.id = Math.floor(Math.random() * 1e6);
  }
}

class Spring {
  constructor(p1,p2,len){
    this.p1 = p1;
    this.p2 = p2;
    this.original_len = len;
    this.len = len;
  }
}

class SMCreature {
  //作为一个整体，在弹簧质点世界中运动
  //获取第一个质点的x坐标/时间，来决定适应度
  //高度、弹簧总长度、面积和复杂度也可以作为参考
  constructor(dna) {
    this.dna = dna;
    this.particles = [];
    this.springs = new Map(); // {p1.id*p2.id, spring}
    this.muscles = new Map(); // {p1.id*p2.id, spring}
    this.fitness = 0;
    //
    dna.p.forEach(point => {
      const pos = [point % 10000, Math.floor(point / 10000)];
      this.particles.push(new Particle(pos));
    });

    dna.s.forEach(index => {
      const p1 = this.particles[index % 10000];
      const p2 = this.particles[Math.floor(index / 10000)];
      const len = ((p1.x[0] - p2.x[0]) ** 2 + (p1.x[1] - p2.x[1]) ** 2) ** 0.5;
      this.springs.set(p1.id * p2.id, new Spring(p1, p2, len));
    });

    dna.m.forEach(index => {
      const p1 = this.particles[index % 10000];
      const p2 = this.particles[Math.floor(index / 10000)];
      const len = ((p1.x[0] - p2.x[0]) ** 2 + (p1.x[1] - p2.x[1]) ** 2) ** 0.5;
      this.muscles.set(p1.id * p2.id,  new Spring(p1, p2, len));
    });
    //起始的x坐标
    this.start_x = this.particles[0].x[0];
  }

}

class GASMSYS {
  constructor() {
    //随机生成初始种群
    //loop:
    //模拟
    //评价
    //选择
    //交叉
    //突变
    //生成新的种群, gen++; goto loop;

    //代数
    this.gen = 0;
    this.gmax = 100;
    //种群
    this.pop = [];

    //状态
    this.state = 0;
    //显示
    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d");
    this.canvas.width = 800;
    this.canvas.height = 600;
    this.w = this.canvas.width;
    this.h = this.canvas.height;
    this.dt = 1; //ms
    this.time = 0;
  }

  simulate(creatues){
    const dt = this.dt * 0.001;
    const g = [0, 9.8];
    let k_y = 1000;
    const m = 1;
    const dashpot_damping = 0.8;

    const norm = (a) => {
      return (a[0] ** 2 + a[1] ** 2) ** 0.5;
    };
    const mul_s = (a, b) => {
      return [a[0] * b, a[1] * b];
    };

    const get_a = (c, p, v, dh) => {
      let f = [m * g[0], m * g[1]];
      c.particles.forEach((q) => {
        if (p === q) return;
        let s = null;
        const id = p.id * q.id;
        if (c.springs.has(id)) {
          s = c.springs.get(id);
        } else if (c.muscles.has(id)) {
          s = c.muscles.get(id);
        } else {
          return;
        }

        const p1 = [p.x[0] + v[0] * dh * dt, p.x[1] + v[1] * dh * dt];
        const p2 = q.x;
        const p1_p2 = [p1[0] - p2[0], p1[1] - p2[1]];
        const length = norm(p1_p2);
        const direction = mul_s(p1_p2, 1 / length);
        const f_spring = -k_y * (length / s.len - 1);
        const v_rel =
          (v[0] - q.u[0]) * direction[0] + (v[1] - q.u[1]) * direction[1];

        f = [
          (f[0] + (f_spring - dashpot_damping * v_rel) * direction[0]) / m,
          (f[1] + (f_spring - dashpot_damping * v_rel) * direction[1]) / m,
        ];
      });

      return f;
    };

    const substep = () =>
      creatues.forEach((c) => {
        c.particles.forEach((p) => {
          let k = 0.999999; //速度衰减(阻尼)

          if (p.x[1] > this.h - 1.5) {
            k = 0.9983; //模拟地面摩擦
          }

          const a1 = get_a(c, p, p.u, 0); //m = 1, 所以f=a
          const v1 = p.u;
          const a2 = get_a(c, p, v1, 1);
          //更新位置
          p.x = [
            p.x[0] + p.u[0] * dt + 0.5 * a1[0] * dt ** 2, //2阶泰勒展开
            p.x[1] + p.u[1] * dt + 0.5 * a1[1] * dt ** 2,
          ];
          //更新速度
          p.u = [
            p.u[0] * k + dt*0.5*(a1[0]+a2[0]),
            p.u[1] * k + dt*0.5*(a1[1]+a2[1])
          ];

          //边缘检测,反弹
          if (p.x[0] < 0) {
            p.x[0] = 1;
            p.u = [-p.u[0], p.u[1]];
          }
          if (p.x[0] > this.w - 1) {
            p.x[0] = this.w - 1;
            p.u = [-p.u[0], p.u[1]];
          }
          if (p.x[1] > this.h - 1) {
            p.x[1] = this.h - 1;
            p.u = [p.u[0], -p.u[1]];
          }
          if (p.x[1] < 0) {
            p.x[1] = 1;
            p.u = [p.u[0], -p.u[1]];
          }
        });
      });

    //进行10次子步骤
    for (let index = 0; index < 10; index++) {
      substep();
    }

    //肌肉伸缩
    creatues.forEach((c) => {
      c.particles.forEach((p) => {
        c.particles.forEach((q) => {
          if (p === q) return;
          let m = null;
          const id = p.id * q.id;
          if (!c.muscles.has(id)) return;
          m = c.muscles.get(id);
          m.len =
            (0.8 * (Math.sin(this.time * 0.001 * 5) + 1) + 0.2) *
            m.original_len;
        });
      });
    });
  }

  draw_creatures(creatues){
    const draw_spring = (s, color) => {
      this.ctx.beginPath();
      this.ctx.moveTo(s.p1.x[0], s.p1.x[1]);
      this.ctx.lineTo(s.p2.x[0], s.p2.x[1]);
      this.ctx.closePath();
      const d = ((s.p1.x[1]- s.p2.x[1])**2+(s.p1.x[0]- s.p2.x[0])**2)**0.5
      this.ctx.lineWidth = 2.4 * Math.min(s.len / d, 4) + 0.1;
      this.ctx.strokeStyle = color;
      this.ctx.stroke();
      this.ctx.strokeStyle = "black";
    };

    const draw_particle = (p)=>{
      this.ctx.beginPath();
      this.ctx.ellipse(p.x[0], p.x[1], 5, 5, 0, 0, Math.PI * 2);
      this.ctx.closePath();
      this.ctx.fillStyle = "black";
      this.ctx.fill();
    }

    creatues.forEach(c=>{
      c.springs.forEach(s=>{
        draw_spring(s,"black");
      });
      c.muscles.forEach(m=>{
        draw_spring(m,"rgb(233,123,123)");
      });
      c.particles.forEach(draw_particle);
    });
  }

  get_canvas(){
    return this.canvas;
  }

  render(){
    //...
    this.ctx.fillStyle = "white";
    this.ctx.fillRect(0, 0, this.w, this.h);
    this.ctx.fillStyle = "black";
    //...
    this.draw_creatures(this.pop);
    //...
  }

  update(){
    this.simulate(this.pop);
  }

  init_pop() {
    for (let i = 0; i < 10; i++) {
      const dna = new DNA();
      dna.random_init();
      this.pop.push(dna.gen_ms_creature());
    }
  }

  fitness_test() {
    //模拟10秒计算适应度
  }

  run() {
    this.init_pop();
    let previous = new Date().getTime();
    let lag = 0.0;
    const gameloop = () => {
      const current = new Date().getTime();
      const elapsed = current - previous;
      previous = current;
      lag += elapsed;
      if (lag < 400) {
        while (lag >= this.dt) {
          this.update();
          lag -= this.dt;
          this.time += this.dt;
        }
        this.render();
      } else {
        console.log("计算超时");
        lag = 0;
      }

      requestAnimationFrame(gameloop);
    };
    //this.handle_input();
    gameloop();
  }
}

function main(){
  const ga_smsys = new GASMSYS();
  document.body.appendChild(ga_smsys.get_canvas());
  ga_smsys.run();
}