//弹簧质点系统，参考了胡渊鸣大佬的代码: https://github.com/taichi-dev/taichi/blob/master/examples/simulation/mass_spring_game.py
//以及Games201 https://www.bilibili.com/video/BV1ZK411H7Hc

//杨式模数
let k_y = 2000;
const m = 1;
const g = [0, 9.8];
//减震器大小
const dashpot_damping = 0.0005;

//弹簧
class Spring {
  constructor(p1, p2, len) {
    this.p1 = p1;
    this.p2 = p2;
    this.len = len;
  }
  draw(ctx) {
    ctx.beginPath();
    ctx.lineWidth = 2.5;
    ctx.moveTo(this.p1.x[0], this.p1.x[1]);
    ctx.lineTo(this.p2.x[0], this.p2.x[1]);
    ctx.closePath();
    ctx.stroke();
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
    ctx.fillText("左键创建质点，右键拖动，中(E)键删除，滚轮改变弹性系数，空格暂停，F键创建固定点，C键清空, ",10,20,800);
    ctx.fillText("杨氏模量: "+k_y.toFixed(2),10,40,300);

    this.particles.forEach((p) => {
      p.draw(ctx);
    });
  }

  update() {
    if (this.stop) {
      return;
    }
    const p = this.particles;
    const dt = this.dt * 0.001;
    const substep = () =>
      p.forEach((p) => {
        if (p.fixed) {
          p.u = [0,0];
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
              const damping = Math.min(dashpot_damping *k_y,100);
            f = [
              f[0] + (f_spring - damping * v_rel) * direction[0],
              f[1] + (f_spring - damping * v_rel) * direction[1],
            ];
          });
          return f;
        };

        //获得速度;
        const get_v = (p, v, dh) => {
          const f = get_f(p, v, dh);
          const a = [f[0] / m, f[1] / m];
          return [(p.u[0] + a[0] * dt)*(0.9999), (p.u[1] + a[1] * dt)*(0.9999)];
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
          p.u = [-p.u[0] * 0.99, p.u[1] * 0.99];
        }
        if (p.x[0] > this.w - 1) {
          p.x[0] = this.w - 1;
          p.u = [-p.u[0] * 0.99, p.u[1] * 0.99];
        }
        if (p.x[1] > this.h - 1) {
          p.x[1] = this.h - 1;
          p.u = [p.u[0] * 0.99, -p.u[1] * 0.99];
        }
        if (p.x[1] < 0) {
          p.x[1] = 1;
          p.u = [p.u[0] * 0.99, -p.u[1] * 0.99];
        }
      });
    for (let index = 0; index < 10; index++) {
      substep();
    }
  }
  
  add_particle(x,y){
    const p1 = new Particle([x, y]);
    this.particles.push(p1);
    this.particles.forEach((p) => {
      if (p === p1) {
        return;
      }
      const d = ((p.x[0] - p1.x[0]) ** 2 + (p.x[1] - p1.x[1]) ** 2) ** 0.5;
      if (d > 20 && d < 60) {
        p1.springs.push(new Spring(p1, p, d));
        p.springs.push(new Spring(p, p1, d));
      }
    });
  }

  handle_input() {
    const mouse_state = {"pos" : [0,0]};

    const delete_p_s = ()=>{
      for (let i = 0; i < this.particles.length; i++) {
        const p = this.particles[i];
        const [x,y] = mouse_state.pos;
        //删除弹簧
        for (let j = 0; j < p.springs.length; j++) {
          const s = p.springs[j];
          const d = ((s.p2.x[0] - x) ** 2 + (s.p2.x[1] - y) ** 2) ** 0.5;
          if(d<60){
            p.springs.splice(j,1);
            j--;
          }
        }
        //删除质点
        const d = ((p.x[0] - x) ** 2 + (p.x[1] - y) ** 2) ** 0.5;
        if(d<50){
            this.particles.splice(i, 1);
            i--;
        }
      }
    }

    document.oncontextmenu = (e) => {
      e.preventDefault();
    };

    this.canvas.onmousedown = (e) => {
      mouse_state.pos = [e.offsetX, e.offsetY];
      const [x,y] = mouse_state.pos;
      if (e.buttons === 4) {
        delete_p_s();
      }
      else if (e.buttons === 1) {
        this.add_particle(x,y);
      }
    };

    this.canvas.onwheel = (e)=>{
      if(e.deltaY<0){
        k_y*=1.1;
      }else{
        k_y/=1.1;
      }
    };

    this.canvas.onmousemove = (e)=>{
      const [x, y] = [e.offsetX, e.offsetY];
      const d = [x - mouse_state.pos[0], y - mouse_state.pos[1]];
      mouse_state.pos = [x, y];
      if (e.buttons === 4) {
        delete_p_s();
      }
      else if(e.buttons===2){
        this.particles.forEach((p)=>{
          const dis = ((p.x[0] - x) ** 2 + (p.x[1] - y) ** 2) ** 0.5;
          if(dis<60){
            p.u = [d[0]*8,d[1]*8];
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
  smsys.add_particle(450,300);
  smsys.add_particle(200,300);
  smsys.add_particle(250,300);
  smsys.add_particle(225,300+25*3**0.5);

  document.body.appendChild(smsys.get_canvas());

  smsys.run();
}
