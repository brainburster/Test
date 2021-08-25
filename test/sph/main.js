var Module = {};

const sph_view = (function CreateSphView() {
  const o = {};
  const view_div = document.createElement("div")
  const canvas = document.createElement("canvas");
  const setting = document.createElement("div");
  const ctx = canvas.getContext("2d");
  view_div.appendChild(canvas);
  view_div.appendChild(setting);

  o.get_view_div = () => {
    return view_div;
  };

  o.init = () => {
    //Module._init();
  };

  o.clear = () => {
    //Module._clear();
  };

  o.unpdate = ()=>{
    //...
    //Module._update();
  }

  o.render = ()=>{
    //渲染粒子
  }

  o.run = ()=>{
    //模拟循环
    Module._foo();
  }

  return o;
})();

function main() {
  //...
  Module.onRuntimeInitialized = function () {
    Module = this;
    setTimeout(()=>{
      document.body.appendChild(sph_view.get_view_div());
      sph_view.run();
    },1000)
  };
}
