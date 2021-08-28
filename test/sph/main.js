var Module = {};

const sph_view = (function CreateSphView() {
  const view_div = document.createElement("div")
  const canvas = document.createElement("canvas");
  const setting = document.createElement("div");
  const ctx = canvas.getContext("2d");
  view_div.appendChild(canvas);
  view_div.appendChild(setting);
  const w = 1200;
  const h = 800;

  const init = () => {
    canvas.width = w;
    canvas.height = h;
    Module._init();
  };

  // const clear = () => {
  //   Module._clear();
  // };

  const update = ()=>{
    for (let index = 0; index < 6; index++) {
      Module._update();
    }
  }

  const render = ()=>{
    ctx.clearRect(0, 0, w, h);
    const ptr = Module._get_data() >> 2;
    const len = Module._get_data_length();
    const p_size = Module._get_particle_size() >> 2;
    //渲染粒子
    for (let i = 0; i < len; i++) {
      const index = ptr + i * p_size;
      const x = Module.HEAPF32[index];
      const y = Module.HEAPF32[index + 1];
      const p = Module.HEAPF32[index + 4];
      const rho = Module.HEAPF32[index + 5];
      ctx.beginPath();
      ctx.arc(x, h - y, 10, 0, 2 * Math.PI);
      ctx.closePath();
      ctx.fillStyle = `rgb(${p*100 -rho*100 + 100},${120 - rho*100},233)`; //"lightblue";
      ctx.fill();
    }
  }

  const get_view_div = () => {
    return view_div;
  };

  const run = ()=>{
    let previous = new Date().getTime();
    let lag = 0.0;
    const delay = 1;

    const gameloop = () => {
      const current = new Date().getTime();
      const elapsed = current - previous;
      previous = current;
      lag += elapsed;
      if (lag < 300) {
        while (lag >= delay) {
          lag -= delay;
          update();
        }
        render();
      } else {
        console.log("计算超时");
        lag = 0;
      }
      requestAnimationFrame(gameloop);
    }

    init();
    gameloop();
  }
  

  return {
    get_view_div,
    run
  };
})();

function main() {
  //...
  Module.onRuntimeInitialized = function () {
    document.body.appendChild(sph_view.get_view_div());
    sph_view.run();
  };
}
