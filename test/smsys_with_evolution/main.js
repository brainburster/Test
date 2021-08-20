let setting = (function () {
  const o = {};
  o.b_fixed_len = false;
  o.pop_size = 16;
  o.g = [0, 9.8];
  o.m = 0.05;
  o.k_y = 20;
  o.k_muscle = 2;
  o.max_time = 12000;
  o.sim_speed = 1;
  o.track_best = false;
  return o;
})();

class DNA {
  constructor() {
    //质点位置
    this.p = [];
    //弹簧链接
    this.s = [];
  }

  copy() {
    const o = this.parse(this.toString());
    const dna = new DNA();
    dna.p = o.p;
    dna.s = o.s;
    return dna;
  }

  //随机初始化
  random_init() {
    const n = Math.random() * 5 + 3;
    for (let i = 0; i < n; i++) {
      const x = [
        Math.floor((Math.random() * 2 - 1) * 30),
        Math.floor((Math.random() * 2 - 1) * 30),
      ];
      this.p.push(x);
    }

    const existed = [];
    for (let i = 0; i < n; i++) {
      if (i > 0) {
        const id = i * 10001 - 1;
        const s = [i, i - 1, Math.random() > 0.8 ? 1 : 0];
        this.s.push(s);
        existed.push(id);
      }
      const m = Math.random() * 5 + 1;
      for (let j = 0; j < m; j++) {
        const l = Math.floor(Math.random() * n);
        if (i === l) continue;
        const d = Math.abs(this.p[i] - this.p[l]);
        if (d / 10000 > 60 || d % 10000 > 60) continue;
        const il = i + l * 10000;
        if (existed.includes(il)) continue;
        if (existed.includes(l + i * 10000)) continue;
        const s = [i, l, Math.random() > 0.8 ? 1 : 0];
        this.s.push(s);
        existed.push(il);
      }
    }
  }

  //交叉
  crossover(other) {
    const dna = this.copy();
    const p_len = Math.min(dna.p.length, other.p.length);
    const s_len = Math.min(dna.s.length, other.s.length);
    for (let i = 0; i < p_len; i += Math.random() < 0.5 ? 1 : 2) {
      dna.p[i] = [...other.p[i]];
    }
    for (let i = 0; i < s_len; i += Math.random() < 0.5 ? 1 : 2) {
      dna.s[i] = [
        other.s[i][0] % dna.s.length,
        other.s[i][1] % dna.s.length,
        other.s[i][2],
      ];
    }
    return dna;
  }

  //突变
  mutation() {
    const r = Math.random();
    if (r < 0.5) {
      //移动顶点位置
      const i = Math.floor(Math.random() * this.p.length);
      this.p[i][0] += (Math.random() - 0.5) * 30;
      this.p[i][1] += (Math.random() - 0.5) * 30;
    } else if (r < 0.6) {
      //减少一个顶点
      const i = Math.floor(Math.random() * this.p.length);
      this.p.slice(i, 1);
      this.s.forEach((ijk, index) => {
        if (ijk[0] === i) this.s.slice(index, 1);
        else if (ijk[1] === i) this.s.slice(index, 1);
      });
    } else if (r < 0.65) {
      if (this.p.length > 10) {
        return this;
      }
      //增加一个顶点
      const x = this.p[this.p.length - 1];
      const x_new = [
        x[0] + (Math.random() * 2 - 1) * 30,
        x[1] + (Math.random() * 2 - 1) * 30,
      ];
      const n = Math.random() * 3;
      for (let j = 0; j < n; j++) {
        const i = Math.floor(Math.random() * this.p.length);
        this.s.push([this.p.length, i, Math.random() > 0.8 ? 1 : 0]);
      }
      this.p.push(x_new);
    } else if (r < 0.78) {
      //减少一条弹簧
      const i = Math.floor(Math.random() * this.s.length);
      this.s.slice(i, 1);
    } else if (r < 0.82) {
      //增加一条弹簧
      const i = Math.floor(Math.random() * this.p.length);
      const j = Math.floor(Math.random() * this.p.length);
      if (i === j || this.s.length > 20) {
        return this;
      }
    } else if (r < 0.92) {
      //弹簧肌肉切换
      const i = Math.floor(Math.random() * this.s.length);
      this.s[i][2] = this.s[i][2] === 0 ? 1 : 0;
    } else {
      //x轴反向
      this.p.forEach((p) => {
        p[0] = -p[0];
      });
    }
    return this;
  }

  //生成弹簧质点生物
  gen_ms_creature() {
    return new SMCreature(this);
  }

  //序列化成字符串
  toString() {
    return JSON.stringify(this);
  }

  //从字符串反序列化
  parse() {
    return JSON.parse(this);
  }
}

class Particle {
  constructor(pos) {
    this.x = pos || [0, 0];
    this.u = [0, 0];
    //this.a = [0, 0];
    this.id = Math.floor(Math.random() * 1e6);
    this.springs = [];
  }
}

class Spring {
  constructor(p1, p2, len, b_muscle = false) {
    this.p1 = p1;
    this.p2 = p2;
    this.original_len = len;
    this.len = len;
    this.b_muscle = b_muscle;
  }
}

class SMCreature {
  constructor(dna) {
    this.dna = dna.copy();
    this.particles = [];
    this.springs = new Map(); // {key:p1.id*p2.id,val: spring}
    this.fitness = 0;
    //
    let pos = [600, 530];
    dna.p.forEach((point) => {
      pos = [pos[0] + point[0], pos[1] + point[1]];
      this.particles.push(new Particle(pos));
    });

    dna.s.forEach((i) => {
      const p1 = this.particles[i[0]];
      const p2 = this.particles[i[1]];
      if (!p1 || !p2) {
        return;
      }
      if (this.springs.has(p1.id * p2.id)) {
        return;
      }
      let spring = null;
      if (setting.b_fixed_len) {
        spring = new Spring(p1, p2, 30, i[2]);
      } else {
        const len =
          ((p1.x[0] - p2.x[0]) ** 2 + (p1.x[1] - p2.x[1]) ** 2) ** 0.5;
        spring = new Spring(p1, p2, Math.min(Math.max(len, 10), 80), i[2]);
      }

      this.springs.set(p1.id * p2.id, spring);
      p1.springs.push([spring, 1]);
      p2.springs.push([spring, -1]);
    });

    //起始的x坐标
    //this.start_x = this.particles[0].x[0];
  }

  get_fitness() {
    if (this.particles.length < 3 || this.particles.length > 10)
      return -100 * this.particles.length;
    if (this.springs.size < 3 || this.springs.size > 16)
      return -100 * this.springs.size;
    if (this.particles[0].x[1] > 2000) return -10000;
    let fitness = this.particles.reduce((a, b) => {
      return Math.abs(a) < Math.abs(b.x[0] - 600) ? a : b.x[0] - 600;
    }, 1e10);
    if (fitness < 0) fitness *= 0.75;
    fitness = Math.abs(fitness);
    if (fitness < 1) fitness = -1000;
    // let n_m = 0;
    // this.springs.forEach((s) => {
    //   if (s.b_muscle) {
    //     n_m++;
    //   }
    // });
    //fitness *= 1 - n_m * 0.05 -this.springs.size*0.01 - this.particles.length*0.01;
    return fitness;
  }
}

class GASMSYS {
  constructor() {
    //代数
    this.gen = 0;
    this.gmax = 100;
    this.best_fitness = 0;
    this.best_fitness_old = 0;
    this.worst_fitness = 0;
    this.same_fitness_count = 0;
    this.pop_size = 30;
    this.pop = [];

    //显示
    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d");
    this.canvas.width = 1200;
    this.canvas.height = 600;
    this.w = this.canvas.width;
    this.h = this.canvas.height;
    this.dt = 1; //ms
    this.time = 0;
    this.offsetX = 0;
    this.scale = 1;
    this.stop = false;
  }

  simulate(creatues) {
    const dt = this.dt * 0.001 * setting.sim_speed;
    const g = setting.g;
    const k_y = setting.k_y;
    const k_muscle = setting.k_muscle;
    const m = setting.m;
    const dashpot_damping = 0.8;

    const norm = (a) => {
      return (a[0] ** 2 + a[1] ** 2) ** 0.5;
    };
    const mul_s = (a, b) => {
      return [a[0] * b, a[1] * b];
    };

    const get_a = (c, p, v, dh) => {
      let f = [m * g[0], m * g[1]];
      p.springs.forEach((sd) => {
        const s = sd[0];
        const d = sd[1];
        let p1 = s.p1;
        let p2 = s.p2;
        if (d < 0) {
          const temp = p1;
          p1 = p2;
          p2 = temp;
        }
        const p1x = [p1.x[0] + v[0] * dh * dt, p1.x[1] + v[1] * dh * dt];
        const p1_p2 = [p1x[0] - p2.x[0], p1x[1] - p2.x[1]];
        const length = norm(p1_p2);
        const direction = mul_s(p1_p2, 1 / length);
        const f_spring = -k_y * (length / s.len - 1);
        const v_rel =
          (v[0] - p2.u[0]) * direction[0] + (v[1] - p2.u[1]) * direction[1];

        f = [
          f[0] + (f_spring - dashpot_damping * v_rel) * direction[0],
          f[1] + (f_spring - dashpot_damping * v_rel) * direction[1],
        ];
      });

      return [f[0] / m, f[1] / m];
    };

    const substep = () =>
      creatues.forEach((c) => {
        c.particles.forEach((p) => {
          let k = 0.9999; //速度衰减(阻尼)

          if (p.x[1] > this.h - 20.5) {
            k = 0.996; //模拟地面摩擦
          }

          const a1 = get_a(c, p, p.u, 0);
          const v1 = p.u;
          const a2 = get_a(c, p, v1, 1);
          //更新位置
          p.x = [
            p.x[0] + p.u[0] * dt + 0.5 * a1[0] * dt ** 2, //2阶泰勒展开
            p.x[1] + p.u[1] * dt + 0.5 * a1[1] * dt ** 2,
          ];
          //更新速度
          p.u = [
            p.u[0] * k + dt * 0.5 * (a1[0] + a2[0]),
            p.u[1] * k + dt * 0.5 * (a1[1] + a2[1]),
          ];

          // p.x = [
          //   p.x[0] + dt * p.u[0] + a1[0] * dt * dt * 0.5,
          //   p.x[1] + dt * p.u[1] + a1[1] * dt * dt * 0.5,
          // ];
          // p.u = [p.u[0] * k + dt * a1[0], p.u[1] * k + dt * a1[1]];

          if (p.x[1] > this.h - 20) {
            p.x[1] = this.h - 20;
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
      c.springs.forEach((s) => {
        if (s.b_muscle) {
          s.len =
            (0.8 * (Math.sin((this.time * k_muscle * setting.sim_speed) / s.original_len) + 1) +
              0.2) *
            s.original_len;
        }
      });
    });
  }

  draw_creatures(creatues) {
    const scale = this.scale;
    const off_y = (this.h - 15) * (1 - scale);
    const off_x = this.offsetX + (this.w / 2 - this.offsetX) * (1 - scale);
    const draw_spring = (s) => {
      this.ctx.beginPath();
      this.ctx.moveTo(s.p1.x[0] * scale + off_x, s.p1.x[1] * scale + off_y);
      this.ctx.lineTo(s.p2.x[0] * scale + off_x, s.p2.x[1] * scale + off_y);
      this.ctx.closePath();
      const d =
        ((s.p1.x[1] - s.p2.x[1]) ** 2 + (s.p1.x[0] - s.p2.x[0]) ** 2) ** 0.5;
      this.ctx.lineWidth = (2.4 * Math.min(s.len / d, 4) + 0.1) * scale;
      if (s.b_muscle) {
        this.ctx.strokeStyle = "rgb(233,123,123)";
      } else {
        this.ctx.strokeStyle = "black";
      }
      this.ctx.stroke();
      this.ctx.strokeStyle = "black";
    };

    const draw_particle = (p) => {
      this.ctx.beginPath();
      this.ctx.arc(
        p.x[0] * scale + off_x,
        p.x[1] * scale + off_y,
        5 * scale,
        0,
        Math.PI * 2
      );
      this.ctx.closePath();
      this.ctx.fillStyle = "black";
      this.ctx.fill();
    };

    creatues.forEach((c) => {
      c.springs.forEach(draw_spring);
      c.particles.forEach(draw_particle);
    });
  }

  get_canvas() {
    return this.canvas;
  }

  render() {
    //清空
    this.ctx.fillStyle = "white";
    this.ctx.fillRect(0, 0, this.w, this.h);
    //绘制尺子
    this.ctx.lineWidth = 0.5;
    this.ctx.fillStyle = "gray";
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.h - 15);
    this.ctx.lineTo(this.w, this.h - 15);
    this.ctx.closePath();
    this.ctx.stroke();
    const scale = this.scale;
    this.ctx.font = "12px Arial";
    for (let i = -this.w / 2; i < this.w / 2; i += Math.floor(this.w / 100)) {
      const x = this.w / 2 + i;
      const y = this.h - 15;
      const d = (x - this.w / 2) / scale - this.offsetX;
      if (x % 5 == 0) {
        this.ctx.fillText(d.toFixed(2), x - 4, this.h, 100);
        this.ctx.fillRect(x, y, 2, 5);
      } else {
        this.ctx.fillRect(x, y, 2, 3);
      }
    }

    this.ctx.fillStyle = "rgb(233,100,100)";
    this.ctx.fillRect(this.w / 2, this.h - 14.5, 2, 4.5);

    //绘制文字
    const size = 20;
    let i = 1.5;
    this.ctx.fillStyle = "gray";
    this.ctx.font = size - 2 + "px Arial";
    this.ctx.fillText("代数: " + (this.gen + 1), size, size * i++, 200);
    this.ctx.fillText("种群大小: " + this.pop.length, size, size * i++, 200);
    this.ctx.fillText(
      "时间: " + (this.time / 1000).toFixed(2) + "s",
      size,
      size * i++,
      200
    );
    this.ctx.fillText("缩放: " + this.scale.toFixed(2), size, size * i++, 200);
    this.ctx.fillText(
      "偏移: " + this.offsetX.toFixed(2),
      size,
      size * i++,
      200
    );
    this.ctx.fillText(
      "最高分数: " + this.best_fitness.toFixed(2),
      size,
      size * i++,
      200
    );
    this.ctx.fillText(
      "上次分数: " + this.best_fitness_old.toFixed(2),
      size,
      size * i++,
      200
    );
    this.ctx.fillText(
      "最低分数: " + this.worst_fitness.toFixed(2),
      size,
      size * i++,
      200
    );
    this.ctx.fillText(
      "变异强度: " + (this.same_fitness_count + 1),
      size,
      size * i++,
      200
    );
    this.ctx.fillText(
      "弹性系数({/}): " + setting.k_y.toFixed(2),
      size,
      size * i++,
      400
    );
    this.ctx.fillText(
      "伸缩速度(;/'): " + setting.k_muscle.toFixed(2),
      size,
      size * i++,
      400
    );
    this.ctx.fillText(
      "质量(</>): " + setting.m.toFixed(2),
      size,
      size * i++,
      200
    );
    this.ctx.fillText(
      "固定弹簧长度(f): " + setting.b_fixed_len,
      size,
      size * i++,
      200
    );
    this.ctx.fillText("重开(r)，跳过当前轮(p)", size, size * i++, 200);
    this.ctx.fillText(
      "每轮时间(↑/↓): " + (setting.max_time / 1000).toFixed(2) + "s",
      size,
      size * i++,
      400
    );
    this.ctx.fillText(
      "模拟速度, 影响精度(←/→): " + (setting.sim_speed).toFixed(2),
      size,
      size * i++,
      400
    );
    this.ctx.fillText(
      "跟踪(t): " + setting.track_best,
      size,
      size * i++,
      400
    );
    this.ctx.fillText(
      "保存(k)，读取(l)",
      size,
      size * i++,
      400
    );

    //绘制弹簧质点
    this.ctx.fillStyle = "black";
    this.draw_creatures(this.pop);
    //...
  }

  update() {
    if (this.time > setting.max_time) {
      this.time = 0;
      this.offsetX = 0;
      //this.scale = 1;
      this.gen += 1;
      this.pop.sort((a, b) => {
        return b.get_fitness() - a.get_fitness();
      });
      this.best_fitness_old = this.best_fitness;
      this.best_fitness = this.pop[0].get_fitness();
      this.worst_fitness = this.pop[this.pop.length - 1].get_fitness();
      if (this.best_fitness_old === this.best_fitness) {
        this.same_fitness_count++;
      } else {
        this.same_fitness_count = 0;
      }
      this.pop.length = setting.pop_size;
      const half = setting.pop_size / 2;
      //
      for (let i = 0; i < half; i++) {
        const p1 = this.pop[i].dna.copy();
        this.pop[i] = this.pop[i].dna.gen_ms_creature();
        if (Math.random() < 0.05) {
          const r = new DNA();
          r.random_init();
          this.pop[half + i] = r.gen_ms_creature();
        } else if (Math.random() < 0.5) {
          const p2 = this.pop[Math.floor(Math.random() ** 2 * half)].dna.copy();
          this.pop[half + i] = p1.crossover(p2).mutation().gen_ms_creature();
        } else {
          p1.mutation();
          for (let j = 0; j < this.same_fitness_count ** 0.6; j++) {
            p1.mutation();
          }
          this.pop[half + i] = p1.gen_ms_creature();
        }
      }
    }

    this.simulate(this.pop);

    if (setting.track_best && this.pop.length > 0) {
      this.offsetX = -this.pop[0].particles[0].x[0] + this.w / 2;
    }
  }

  init_pop() {
    for (let i = 0; i < setting.pop_size; i++) {
      const dna = new DNA();
      dna.random_init();
      this.pop.push(dna.gen_ms_creature());
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
      if (lag < 400) {
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

    this.init_pop();
    this.handle_input();
    gameloop();
  }

  handle_input() {
    const mouse_state = { pos: [0, 0] };
    this.canvas.oncontextmenu = (e) => e.preventDefault();
    this.canvas.onmousemove = (e) => {
      const [x, y] = [e.offsetX, e.offsetY];
      const d = [x - mouse_state.pos[0], y - mouse_state.pos[1]];
      mouse_state.pos = [x, y];
      if (e.buttons === 1 || e.buttons === 2) {
        this.offsetX += d[0];
      }
    };
    this.canvas.onwheel = (e) => {
      if (e.deltaY > 0) {
        this.scale *= 1.1;
      } else {
        this.scale /= 1.1;
      }
    };
    window.onkeydown = (e) => {
      switch (e.key) {
        case "k":
          this.save();
          break;
        case "l":
          this.load();
          break;
        case "t":
          setting.track_best = !setting.track_best;
          break;
        case "ArrowRight":
          setting.sim_speed += 0.1;
          setting.sim_speed = Math.min(setting.sim_speed, 5);
          break;
        case "ArrowLeft":
          setting.sim_speed -= 0.1;
          setting.sim_speed = Math.max(setting.sim_speed, 0.1);
          break;
        case "ArrowUp":
          setting.max_time += 100;
          setting.max_time = Math.min(setting.max_time, 60000);
          break;
        case "ArrowDown":
          setting.max_time -= 100;
          setting.max_time = Math.max(setting.max_time, 500);
          break;
        case "r":
          this.pop.length = 0;
          this.time = 0;
          this.gen = 0;
          this.init_pop();
          break;
        case "p":
          this.time += setting.max_time;
          break;
        case "f":
          setting.b_fixed_len = !setting.b_fixed_len;
          break;
        case "[":
          setting.k_y /= 1.1;
          break;
        case "]":
          setting.k_y *= 1.1;
          break;
        case ";":
          setting.k_muscle /= 1.1;
          break;
        case "'":
          setting.k_muscle *= 1.1;
          break;
        case ",":
          setting.m /= 1.1;
          break;
        case ".":
          setting.m *= 1.1;
          break;
        case " ":
          this.stop = !this.stop;
          break;
        case "s":
          this.scale = 1;
          this.offsetX = 0;
          break;
        case "d":
          {
            let off = -1e10;
            this.pop.forEach((c) => {
              off = Math.max(off, Math.floor(c.particles[0].x[0]));
            });
            this.offsetX = this.w / 2 - off;
          }
          break;
        case "a":
          {
            let off = 1e10;
            this.pop.forEach((c) => {
              off = Math.min(off, Math.floor(c.particles[0].x[0]));
            });
            this.offsetX = -off + this.w / 2;
          }
          break;
      }
    };
  }
  save(){
    const o = {};
    o.setting = setting;
    o.dna_pop = this.pop.map((c) => c.dna);
    const data = JSON.stringify(o);
    const blob = new Blob([data], { type: "text/plain;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ga_smsys_save.json"
    a.click();
    //URL.revokeObjectURL(url);
  }

  load(){
    const input_file = document.createElement("input");
    input_file.type = "file";
    input_file.style = "visibility:hidden";
    document.body.appendChild(input_file);
    input_file.click();
    new Promise((resolve) => {
      input_file.onchange = () => {
        const file = input_file.files[0];
        input_file.remove();
        resolve(file);
      };
    }).then((file) => {
      const fr = new FileReader();
      return new Promise((resolve, reject) => {
        if (/.json$/.test(file.name)) {
          fr.onload = () => {
            resolve(fr.result);
          };
          fr.readAsText(file);
        } else {
          reject(`[${file.name}]不是json文件`);
        }
      });
    }).then((file_content) => {
      return JSON.parse(file_content);
    }).then((data) => {
      setting = data.setting
      this.time  = 0;
      this.gen = 0;
      this.pop = data.dna_pop.map(dna=>{
        Object.setPrototypeOf(dna, DNA.prototype);
        return dna.gen_ms_creature();
      });
    }).catch((reason) => {
      console.log(reason);
    })
  }
}

function main() {
  const ga_smsys = new GASMSYS();
  document.body.appendChild(ga_smsys.get_canvas());
  ga_smsys.run();
}
