//本质上是个格子气自动机，不过借用了点LBM的思想

class Grid {
  constructor(w, h, size) {
    this.w = w;
    this.h = h;
    this.size = size;
    this.data = [];
    this.default = -1;
    this.time = 0;
    for (let j = 0; j < this.h; j++) {
      for (let i = 0; i < this.w; i++) {
        this.data.push(0);
      }
    }
  }
  set_default(v) {
    this.default = v;
  }
  get_index(x, y) {
    if (x < 0 || x >= this.w || y < 0 || y >= this.h) {
      return -1;
    }
    return x + y * this.w;
  }
  get(x, y) {
    const i = this.get_index(x, y);
    return i < 0 ? this.default : this.data[i];
  }
  set(x, y, v) {
    const i = this.get_index(x, y);
    if (i > 0) {
      this.data[i] = v;
    }
  }
  forEach(callback) {
    for (let j = 0; j < this.h; j++) {
      for (let i = 0; i < this.w; i++) {
        callback(this.get(i, j), i, j, this.size);
      }
    }
  }
  forEachMargolusNeighborhoods(callback){
    const parity = this.time & 1;
    for (let j = -parity; j < this.h; j += 2) {
      for (let i = -parity; i < this.w; i += 2) {
        const n__s = [
          this.get(i, j),
          this.get(i + 1, j),
          this.get(i, j + 1),
          this.get(i + 1, j + 1),
        ];

        const [a, b, c, d] = callback(n__s);

        this.set(i, j, a)
        this.set(i + 1, j, b)
        this.set(i, j + 1, c)
        this.set(i + 1, j + 1, d);
      }
    }
    this.time++;
  }
}

const rule = (()=>{
  const c = [[-1,-1],[1,-1],[-1,1],[1,1]];
  const w = 0.25;
  const cs = 1 / Math.SQRT2;
  const cs_2 = cs * cs;
  const k = 0.25;
  return (n)=>{
    if (n[0] < 0 || n[3] < 0 || n[2] < 0 || n[1] < 0) {
      if((n[0]<0&&n[3]<0)||(n[1]<0&&n[2]<0)){return n;} //对角线上有方块直接返回
      let rho = 0;
      let count = 0;
      if(n[0]>0){ rho +=n[0];count++;};
      if(n[1]>0){ rho +=n[1];count++;};
      if(n[2]>0){ rho +=n[2];count++;};
      if(n[3]>0){ rho +=n[3];count++;};
      rho/=count;
      if(n[0]>=0){ n[0] = rho;};
      if(n[1]>=0){ n[1] = rho;};
      if(n[2]>=0){ n[2] = rho;};
      if(n[3]>=0){ n[3] = rho;};
      return n;
    }
    //传播
    //碰撞
    const rho = n[0]+n[1]+n[2]+n[3]+1e-20;
    const u_x = (n[3]*c[0][0]+n[2]*c[1][0]+n[1]*c[2][0]+n[0]*c[3][0])/rho;
    const u_y = (n[3]*c[0][1]+n[2]*c[1][1]+n[1]*c[2][1]+n[0]*c[3][1])/rho + 0.05;
    for (let i = 0; i < 4; i++) {
      const vu = (c[i][0]*u_x+c[i][1]*u_y)/cs_2;
      const f_eq = w * rho * (1 + vu);
      //const f_eq = w * rho;
      n[i] = n[i] * (1 - k) + k * f_eq;
    }
    return n;
  }
})();

class Test {
  constructor() {
    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d");
    this.w = 800;
    this.h = 600;
    this.canvas.width = this.w;
    this.canvas.height = this.h;
    this.canvas.style = "border:1.2px solid gray;";
    this.grid = new Grid(800 / 10, 600 / 10, 10);
    this.brush = 1;
  }

  get_canvas() {
    return this.canvas;
  }

  draw() {
    this.ctx.clearRect(0, 0, this.w, this.h);
    this.grid.forEach((v, i, j, size) => {
      this.ctx.fillStyle = `rgb(${255 - v * 100},255,${255 - v * 80})`;
      if(v<0){
        this.ctx.fillStyle = "gray";
      }
      this.ctx.fillRect(i * size, j * size, size, size);
    });
    this.ctx.fillStyle = "black";
    this.ctx.font = "16px sans-serif"
    this.ctx.fillText("左键气体，右键墙，中键橡皮", 10, 20, 500);
  }

  handle_input() {
    const plot = (x, y, v) => this.grid.set(x, y, v);
    //bresenham's line算法, https://en.wikipedia.org/wiki/Bresenham%27s_line_algorithm
    const plot_line = (x0, y0, x1, y1, c) => {
      const dx = Math.abs(x1 - x0);
      const dy = -Math.abs(y1 - y0);
      const sx = x0 < x1 ? 1 : -1;
      const sy = y0 < y1 ? 1 : -1;
      let err = dx + dy; /* error value e_xy */
      while (true) {
        plot(x0, y0, c);
        if (x0 == x1 && y0 == y1) break;
        const e2 = 2 * err;
        /* e_xy+e_x > 0 */
        if (e2 >= dy) {
          err += dy;
          x0 += sx;
        }
        /* e_xy+e_y < 0 */
        if (e2 <= dx) {
          err += dx;
          y0 += sy;
        }
      }
    };

    let last = null;

    this.canvas.oncontextmenu = (e) => e.preventDefault();
    this.canvas.onmousedown = (e) => {
      // const lbtndown = e.buttons & 1;
      // const rbtndown = e.buttons&2;
      // const mbtndown = e.buttons&4;
      switch(e.buttons)
      {
        case 1:
          this.brush = 25;
          break;
        case 2:
          this.brush = -1;
          break;
        case 4:
          this.brush = 1e-20;
          break;
      }
      if (!e.buttons) return;
      const x = Math.floor(e.offsetX / this.grid.size);
      const y = Math.floor(e.offsetY / this.grid.size);
      this.last = [x, y];
      this.grid.set(x, y, this.brush);
    };
    this.canvas.onmouseup = (e)=>{
      last = null;
    }
    this.canvas.onmousemove = (e) => {
      const x = Math.floor(e.offsetX / this.grid.size);
      const y = Math.floor(e.offsetY / this.grid.size);
      switch(e.buttons)
      {
        case 1:
          this.brush = 25;
          break;
        case 2:
          this.brush = -1;
          break;
        case 4:
          this.brush = 1e-20;
          break;
      }
      if (e.buttons) {
        last = last || [x, y];
        plot_line(...last, x, y, this.brush);
        last = [x, y];
      }
    };
  }

  run() {
    this.handle_input();
    setInterval(() => {
      this.update();
      this.draw();
    }, 16);
  }

  update(){
    this.grid.forEachMargolusNeighborhoods(rule);
  }
}

function main() {
  const test = new Test();
  document.body.appendChild(test.get_canvas());
  document.body.style = "text-align:center;margin:32px";
  test.run();
}

document.body.onload = main;
