#include "../header/header.hpp"

Wnd::render_callback_t Wnd::onrender;
Wnd::update_callback_t Wnd::onupdate;
GLFWwindow* Wnd::window;

static void error_callback(int error, const char* description) 
{
    std::cerr << "GLFW ERROR:" << error << "\ndescription:" << description;
}

void Wnd::init(int w, int h)
{
    glfwSetErrorCallback(error_callback);

    if (!glfwInit())
    {
        std::cerr << "Error: GLFW Initialization failed.";
        emscripten_force_exit(EXIT_FAILURE);
    }
    glfwWindowHint(GLFW_CONTEXT_VERSION_MAJOR, 3);
    glfwWindowHint(GLFW_CONTEXT_VERSION_MINOR, 0);

    window = glfwCreateWindow(w, h, "wnd", NULL, NULL);
    if (!window)
    {
        std::cerr << "Error: GLFW Window Creation Failed.";
        glfwTerminate();
        emscripten_force_exit(EXIT_FAILURE);
    }
    glfwMakeContextCurrent(window);

    glClearColor(0.0f, 0.0f, 0.0f, 1.0f);
}

void Wnd::run(){
    emscripten_set_main_loop([](){
        if(onupdate) onupdate();
        if(onrender) onrender();
    }, 0, false);
}