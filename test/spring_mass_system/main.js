//弹簧质点系统，参考了胡渊鸣大佬的代码: https://github.com/taichi-dev/taichi/blob/master/examples/simulation/mass_spring_game.py
//以及Games201 https://www.bilibili.com/video/BV1ZK411H7Hc

//杨式模数
let k_y = 1000;
const m = 1;
const g = [0, 9.8];
//减震器大小
const dashpot_damping = 0.8;

//弹簧
class Spring {
  constructor(p1, p2, len) {
    this.p1 = p1;
    this.p2 = p2;
    this.len = len;
    this.b_muscle = false;
  }

  draw(ctx) {
    ctx.beginPath();
    ctx.moveTo(this.p1.x[0], this.p1.x[1]);
    ctx.lineTo(this.p2.x[0], this.p2.x[1]);
    ctx.closePath();
    const d = ((this.p1.x[1]- this.p2.x[1])**2+(this.p1.x[0]- this.p2.x[0])**2)**0.5
    ctx.lineWidth = 2.4*Math.abs(this.len/d)+0.1;
    if(this.b_muscle){
      ctx.strokeStyle = "rgb(233,123,123)";
    }else{
      ctx.strokeStyle = "black";
    }
    ctx.stroke();
    ctx.lineWidth = 1;
  }
}

//粒子
class Particle {
  constructor(x) {
    //x位置，u速度，f受力
    this.x = x || [0, 0];
    this.u = [0, 0];
    //this.f = [0, 0];
    this.springs = [];
    this.fixed = false;
    this.obj_id = Math.floor(Math.random()*1000000);
  }

  draw(ctx) {
    ctx.beginPath();
    ctx.ellipse(this.x[0], this.x[1], 5, 5, 0, 0, Math.PI * 2);
    ctx.closePath();
    if (this.fixed) {
      ctx.fillStyle = "pink";
    } else {
      ctx.fillStyle = "black";
    }
    ctx.fill();
    this.springs.forEach((s) => s.draw(ctx));
  }
}

/** 弹簧质点系统 */
class SMSYS {
  constructor(w, h) {
    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d");
    this.canvas.width = w;
    this.canvas.height = h;
    this.w = w;
    this.h = h;
    this.dt = 1; //ms
    this.time = 0;
    this.stop = false;
    this.particles = [];
  }

  get_canvas() {
    return this.canvas;
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
          //this.handle_input();
          this.update();
          lag -= this.dt;
        }
        this.render();
      } else {
        console.log("计算超时");
        lag = 0;
      }

      requestAnimationFrame(gameloop);
    };
    this.handle_input();
    gameloop();
  }

  render() {
    const ctx = this.ctx;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, this.w, this.h);
    ctx.strokeStyle = "gray";
    ctx.strokeRect(0, 0, this.w, this.h);
    ctx.strokeStyle = "black";
    ctx.fillStyle = "black";
    ctx.font = "16px Arial";
    ctx.fillText(
      "左键创建质点，右键拖动，中(E)键删除，滚轮改变弹性系数,",
      10,
      20,
      800
    );
    ctx.fillText(
      "空格暂停，F键创建固定点，M键切换弹簧/肌肉，C键清空",
      10,
      40,
      800
    );
    ctx.fillText("杨氏模量: " + k_y.toFixed(2), 10, 60, 300);

    this.particles.forEach((p) => {
      p.draw(ctx);
    });
  }

  update() {
    if (this.stop) {
      return;
    }
    const ps = this.particles;
    const dt = this.dt * 0.001;
    const substep = () =>
      ps.forEach((p) => {
        if (p.fixed) {
          p.u = [0, 0];
          return;
        }
        //获取受力
        const get_f = (p, v, dh) => {
          let f = [m * g[0], m * g[1]];
          p.springs.forEach((s) => {
            const rest_len = s.len;
            const p1 = [p.x[0] + v[0] * dh * dt, p.x[1] + v[1] * dh * dt];
            const p2 = s.p2.x;
            const p1_p2 = [p1[0] - p2[0], p1[1] - p2[1]];
            const length = (p1_p2[0] ** 2 + p1_p2[1] ** 2) ** 0.5;
            const direction = [p1_p2[0] / length, p1_p2[1] / length];
            const f_spring = -k_y * (length / rest_len - 1);
            const v_rel =
              (v[0] - s.p2.u[0]) * direction[0] +
              (v[1] - s.p2.u[1]) * direction[1];

            f = [
              f[0] + (f_spring - dashpot_damping * v_rel) * direction[0],
              f[1] + (f_spring - dashpot_damping * v_rel) * direction[1],
            ];
          });
          return f;
        };

        //获得速度;
        const get_v = (p, v, dh) => {
          const f = get_f(p, v, dh);
          const a = [f[0] / m, f[1] / m];
          let k = 0.999999;
          if (p.x[1] > this.h - 1.5) {
            k = 0.995;
          }
          return [(p.u[0] + a[0] * dt) * k, (p.u[1] + a[1] * dt) * k];
        };

        //获得期望速度
        const v1 = get_v(p, p.u, 0);
        const v2 = get_v(p, v1, 0.5);
        const v3 = get_v(p, v2, 0.5);
        const v4 = get_v(p, v3, 1);

        //RK4 更新速度
        p.u = [
          (1 / 6.0) * (v1[0] + 2 * v2[0] + 2 * v3[0] + v4[0]),
          (1 / 6.0) * (v1[1] + 2 * v2[1] + 2 * v3[1] + v4[1]),
        ];

        //更新位置
        p.x = [p.x[0] + p.u[0] * dt, p.x[1] + p.u[1] * dt];

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
    for (let index = 0; index < 10; index++) {
      substep();
    }

    //
    const norm = (a)=>{
      return (a[0] ** 2 + a[1] ** 2) ** 0.5;
    }
    //点乘
    const dot = (a,b)=>{
      return a[0] * b[0] + a[1] * b[1];
    }
    //叉乘
    const cross = (a, b) => {
      return a[0] * b[1] - a[1] * b[0];
    };
    //
    const sub = (a, b) => {
      return [a[0] - b[0], a[1] - b[1]];
    };
    //
    const add = (a, b) => {
      return [a[0] + b[0], a[1] + b[1]];
    };
    //
    const mul_scalar = (a, b) => {
      return [a[0] * b, a[1] * b];
    };

    if (this.time%3==1) {
      //计算碰撞
      ps.forEach((p) => {
        ps.some((q) => {
          if (q.obj_id===p.obj_id) return false;
          if (p === q) return false;
          if (Math.abs(p.x[0] - q.x[0]) > 35) return false;
          if (Math.abs(p.x[1] - q.x[1]) > 35) return false;
          return q.springs.some((s) => {
            if (s.p2 == q) return false;
            const p2_p1 = mul_scalar(p.u, dt * 60);
            const p2 = add(p.x, p2_p1);
            const a = sub(s.p1.x, p.x);
            const b = sub(s.p2.x, p.x);
            const c = p2_p1;
            const d = sub(p.x, s.p1.x);
            const e = sub(p2, s.p1.x);
            const f = sub(s.p2.x, s.p1.x);
            const g = cross(a, c) * cross(b, c);
            const h = cross(d, f) * cross(e, f);
            if (g < 0 && h < 0) {
              const l = norm(f);
              const n = [-f[1]/l, f[0]/l]; //法线
              const r = sub(p.u,mul_scalar(mul_scalar(n,dot(p.u,n)),2))//反射向量
              const la = norm(a);
              const lb = norm(b);
              s.p1.u = sub(s.p1.u,mul_scalar(p.u,0.33*la/(la+lb)));
              s.p2.u = sub(s.p2.u,mul_scalar(p.u,0.33*lb/(la+lb)));
              p.u = mul_scalar(r,0.66);
              p.x = add(p.x, mul_scalar(r, dt * 60));
              return true;
            }
            return false;
          });
        });
      });
    }

    //肌肉伸缩
    ps.forEach((p) => {
      p.springs.forEach((s) => {
        if (s.b_muscle) {
          s.len = 17 * (Math.sin(this.time*0.001 * 5) + 1) + 16;
        }
      });
    });
    this.time += this.dt;
  }

  add_particle(x, y) {
    const p1 = new Particle([x, y]);
    this.particles.push(p1);
    this.particles.forEach((p) => {
      if (p === p1) {
        return;
      }
      const d = ((p.x[0] - p1.x[0]) ** 2 + (p.x[1] - p1.x[1]) ** 2) ** 0.5;
      if (d > 16 && d < 60) {
        p1.springs.push(new Spring(p1, p, d));
        p.springs.push(new Spring(p, p1, d));
      }
    });
    const list1 = [];
    const set_same_obj_id = (p,id,d)=>{
      p.springs.forEach(s=>{
        if(list1.includes(s.p2)) return;
        s.p2.obj_id = id;
        list1.push(s.p2);
        set_same_obj_id(s.p2,id,d-1);
      })
    }
    set_same_obj_id(p1,p1.obj_id,10);
  }

  handle_input() {
    const mouse_state = { pos: [0, 0] };

    const delete_p_s = () => {
      for (let i = 0; i < this.particles.length; i++) {
        const p = this.particles[i];
        const [x, y] = mouse_state.pos;
        //删除弹簧
        for (let j = 0; j < p.springs.length; j++) {
          const s = p.springs[j];
          const d = ((s.p2.x[0] - x) ** 2 + (s.p2.x[1] - y) ** 2) ** 0.5;
          if (d < 31) {
            p.springs.splice(j, 1);
            j--;
          }
        }
        //删除质点
        const d = ((p.x[0] - x) ** 2 + (p.x[1] - y) ** 2) ** 0.5;
        if (d < 30) {
          this.particles.splice(i, 1);
          i--;
        }
      }
    };

    const add_speed = (x,y,v)=>{
      this.particles.forEach((p) => {
        const dis = ((p.x[0] - x) ** 2 + (p.x[1] - y) ** 2) ** 0.5;
        if (dis < 60) {
          p.u = v;
        }
      });
    }

    const add_muscle = (x, y)=>{
      this.particles.forEach(p=>{
        p.springs.forEach(s=>{
          const m1 =  (s.p1.x[0]+s.p2.x[0])*0.5;
          const m2 =  (s.p1.x[1]+s.p2.x[1])*0.5;
          const d2 = (m1 - x) ** 2 + (m2 - y) ** 2;
          if(d2<200){
            s.b_muscle = !s.b_muscle;
          }
        })
      })
    }
    this.add_speed = add_speed;
    this.add_muscle = add_muscle;

    document.oncontextmenu = (e) => {
      e.preventDefault();
    };

    this.canvas.onmousedown = (e) => {
      mouse_state.pos = [e.offsetX, e.offsetY];
      const [x, y] = mouse_state.pos;
      if (e.buttons === 4) {
        delete_p_s();
      } else if (e.buttons === 1) {
        this.add_particle(x, y);
      }
    };

    this.canvas.onwheel = (e) => {
      if (e.deltaY < 0) {
        k_y *= 1.1;
      } else {
        k_y /= 1.1;
      }
    };

    this.canvas.onmousemove = (e) => {
      const [x, y] = [e.offsetX, e.offsetY];
      const d = [x - mouse_state.pos[0], y - mouse_state.pos[1]];
      mouse_state.pos = [x, y];
      if (e.buttons === 4) {
        delete_p_s();
      } else if (e.buttons === 2) {
        this.particles.forEach((p) => {
          const dis = ((p.x[0] - x) ** 2 + (p.x[1] - y) ** 2) ** 0.5;
          if (dis < 60) {
            add_speed(x,y, [d[0] * 5, d[1] * 5]);
          }
        });
      }
    };

    window.onkeydown = (e) => {
      switch (e.key) {
        case " ":
          this.stop = !this.stop;
          break;
        case "c":
          this.particles.length = 0;
          break;
        case "f":
          const p1 = new Particle(mouse_state.pos);
          p1.fixed = true;
          this.particles.push(p1);
          break;
        case "e":
          delete_p_s();
          break;
        case "m":
          add_muscle(...mouse_state.pos);
          break;
        default:
          break;
      }
    };
  }
}

function main() {
  const smsys = new SMSYS(800, 600);
  const p = new Particle([400, 300]);
  p.fixed = true;
  smsys.particles.push(p);
  smsys.add_particle(459,300);
  smsys.add_particle(200,300);
  smsys.add_particle(250,300);
  smsys.add_particle(225,300+25*3**0.5);
  smsys.add_particle(215,1);

  document.body.appendChild(smsys.get_canvas());

  smsys.run();
  smsys.add_particle(700,600);
  smsys.add_particle(740,600);
  smsys.add_particle(710,556.7);
  smsys.add_muscle(700,590);
  smsys.add_speed(730,620,[20,30]);
}
