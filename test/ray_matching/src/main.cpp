#include "..\header\header.hpp"

GLint frame = 0;
GLfloat yaw = 90;
GLfloat pitch = 30;
GLfloat discance = 10;

void cursor_pos_callback(GLFWwindow *window, double x, double y)
{
    static double last_x = -1;
    static double last_y = -1;
    if (last_x < 0 || last_y < 0)
    {
        last_x = x;
        last_y = y;
        return;
    }
    GLuint action = glfwGetMouseButton(window, GLFW_MOUSE_BUTTON_LEFT);
    if (GLFW_PRESS == action)
    {
        const int dx = x - last_x;
        const int dy = y - last_y;
        yaw += dx * 0.01;
        pitch += dy * 0.005;
        if (pitch > 80.f)
        {
            pitch = 80.f;
        }
        else if (pitch < -80.f)
        {
            pitch = -80.f;
        }
    }
    else if (GLFW_RELEASE == action)
    {
        last_x = x;
        last_y = y;
    }
}

void scroll_callback(GLFWwindow *window, double x, double y)
{
    discance += -y * 0.01;
    if (discance > 20.f)
    {
        discance = 20.f;
    }
    else if (discance < 1.f)
    {
        discance = 1.f;
    }
}

int main()
{
    GLfloat vertices[] = {
        -1.f, -1.f,
        1.f, -1.f,
        -1.f, 1.f,
        1.f, 1.f
    };

    const GLchar *vs_str =
#include "../shader/vs.vs"
        ;

    const GLchar *fs_str =
#include "../shader/fs.fs"
        ;

    Wnd::init(800, 600);
    glfwSetCursorPosCallback(Wnd::window, cursor_pos_callback);
    glfwSetScrollCallback(Wnd::window, scroll_callback);
    GLuint vs = glCreateShader(GL_VERTEX_SHADER);
    glShaderSource(vs, 1, &vs_str, nullptr);
    glCompileShader(vs);
    GLuint fs = glCreateShader(GL_FRAGMENT_SHADER);
    glShaderSource(fs, 1, &fs_str, nullptr);
    glCompileShader(fs);
    GLuint shader_program = glCreateProgram();
    glAttachShader(shader_program, vs);
    glAttachShader(shader_program, fs);
    glLinkProgram(shader_program);
    glUseProgram(shader_program);

    GLuint vbo = 0;
    glGenBuffers(1, &vbo);
    glBindBuffer(GL_ARRAY_BUFFER, vbo);
    glBufferData(GL_ARRAY_BUFFER, sizeof(vertices), vertices, GL_STATIC_DRAW);
    GLint pos_loc = glGetAttribLocation(shader_program, "position");
    GLint state_loc = glGetUniformLocation(shader_program, "state");
    GLint frame_loc = glGetUniformLocation(shader_program, "iframe");
    glEnableVertexAttribArray(pos_loc);
    glVertexAttribPointer(pos_loc, 2, GL_FLOAT, GL_FALSE, 0, 0);
    glUniform3f(state_loc, yaw, pitch, discance);
    glUniform1i(frame_loc, frame);

    Wnd::run();
    Wnd::onupdate = [&]()
    {
        frame++;
    };
    Wnd::onrender = [&]()
    {
        glUniform3f(state_loc, yaw, pitch, discance);
        glUniform1i(frame_loc, frame);
        glClearColor(0, 0, 0, 1);
        glClear(GL_COLOR_BUFFER_BIT);
        glfwSwapBuffers(Wnd::window);
        glDrawArrays(GL_TRIANGLE_STRIP, 0, 4);
        glfwPollEvents();
    };
}