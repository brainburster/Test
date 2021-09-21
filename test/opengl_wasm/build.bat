emcc src\main.cpp src\wnd.cpp -std=c++17 -s USE_WEBGL2=1 -s WASM=1 -s USE_GLFW=3 -O3 -o index.js
