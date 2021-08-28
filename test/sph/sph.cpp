#define _USE_MATH_DEFINES
#include <math.h>
#include <time.h>

#include <vector>
#include <forward_list>
#include <unordered_map>
#include <functional>
#include <iostream>

struct Vec2
{
    float x;
    float y;
    constexpr Vec2() : x{0}, y{0} {};
    constexpr Vec2(float x, float y) : x{x}, y{y} {}
    constexpr Vec2(const Vec2 &other) : x{other.x}, y{other.y} {}
    Vec2 &operator=(const Vec2 &other)
    {
        if (this == &other)
            return *this;
        x = other.x;
        y = other.y;
        return *this;
    }
    Vec2 operator-() const noexcept
    {
        return {-x, -y};
    }
    Vec2 operator+(const Vec2 &rhs) const noexcept
    {
        return {x + rhs.x, y + rhs.y};
    }
    Vec2 operator-(const Vec2 &rhs) const noexcept
    {
        return {x - rhs.x, y - rhs.y};
    }
    Vec2 operator*(const Vec2 &rhs) const noexcept
    {
        return {x * rhs.x, y * rhs.y};
    }
    Vec2 operator/(const Vec2 &rhs) const noexcept
    {
        return {x / rhs.x, y / rhs.y};
    }
    Vec2 operator+(float rhs) const noexcept
    {
        return {x + rhs, y + rhs};
    }
    Vec2 operator-(float rhs) const noexcept
    {
        return {x - rhs, y - rhs};
    }
    Vec2 operator*(float rhs) const noexcept
    {
        return {x * rhs, y * rhs};
    }
    Vec2 operator/(float rhs) const noexcept
    {
        return {x / rhs, y / rhs};
    }
    friend Vec2 operator+(float lhs, const Vec2& rhs)
    {
        return {lhs + rhs.x, lhs + rhs.y};
    }
    friend Vec2 operator-(float lhs, const Vec2& rhs)
    {
        return {lhs - rhs.x, lhs - rhs.y};
    }
    friend Vec2 operator*(float lhs, const Vec2& rhs)
    {
        return {lhs * rhs.x, lhs * rhs.y};
    }
    friend Vec2 operator/(float lhs, const Vec2& rhs)
    {
        return {lhs / rhs.x, lhs / rhs.y};
    }
    Vec2 &operator+=(const Vec2 &rhs) noexcept
    {
        x += rhs.x;
        y += rhs.y;
        return *this;
    }
    Vec2 &operator-=(const Vec2 &rhs) noexcept
    {
        x -= rhs.x;
        y -= rhs.y;
        return *this;
    }
    Vec2 &operator*=(const Vec2 &rhs) noexcept
    {
        x *= rhs.x;
        y *= rhs.y;
        return *this;
    }
    Vec2 &operator/=(const Vec2 &rhs) noexcept
    {
        x /= rhs.x;
        y /= rhs.y;
        return *this;
    }
    Vec2 &operator+=(float rhs) noexcept
    {
        x += rhs;
        y += rhs;
        return *this;
    }
    Vec2 &operator-=(float rhs) noexcept
    {
        x -= rhs;
        y -= rhs;
        return *this;
    }
    Vec2 &operator*=(float rhs) noexcept
    {
        x *= rhs;
        y *= rhs;
        return *this;
    }
    Vec2 &operator/=(float rhs) noexcept
    {
        x /= rhs;
        y /= rhs;
        return *this;
    }
    Vec2 pow(float gama) const
    {
        return {powf(x, gama), powf(y, gama)};
    }
    Vec2 &pow_e(float gama)
    {
        x = powf(x, gama);
        y = powf(y, gama);
        return *this;
    }

    float distance(const Vec2 &rhs) const
    {
        const float a = x - rhs.x;
        const float b = y - rhs.y;
        return powf(a * a + b * b, 0.5f);
    }

    float norm() const
    {
        return powf(x * x + y * y, 0.5f);
    }
};
struct Setting
{
    static constexpr float h = 50; //光滑核半径
    static constexpr float _2h = h * 2;
    static constexpr float h_2 = h * h;
    static constexpr float h_3 = h_2 * h;
    static constexpr float pi = M_PI;
    static constexpr float _2pi = pi * 2;
    static constexpr float p0 = 100;
    static constexpr int gama = 8;
    static constexpr float B = 0.025f;
    static constexpr float ki_vi = 0.01f; //kinematic viscosity
    static constexpr Vec2 g = {0, -9.8f};
    static constexpr float dt = 0.001f;
};

//假设粒子质量始终为1, m=1
struct Particle
{
    Vec2 x;
    Vec2 v;
    float p;
    float rho;
};

struct Utility
{
    static Vec2 clamp(const Vec2 &v, float _min, float _max)
    {
        return {fmin(fmax(v.x, _min), _max), fmin(fmax(v.y, _min), _max)};
    }

    //poly6核, 用于密度(rho)插值
    //其梯度在接近r接近0时减少, 不适合用于压强插值
    static float W_Poly6(float r)
    {
        using S = Setting;
        if (r < 0 || r > S::h)
            return 0;
        constexpr float h_9 = S::h_3 * S::h_3 * S::h_3;
        constexpr float sigma = 315.f / (64.f * S::pi * h_9);
        const float x = S::h * S::h - r * r;
        return sigma * x * x * x;
    }

    //Spiky核, 用于插值压强(p)
    static float W_Spiky(float r)
    {
        using S = Setting;
        if (r < 0 || r > S::h)
            return 0;
        constexpr float h_6 = S::h_3 * S::h_3;
        constexpr float sigma = 15.f / (S::pi * h_6);
        const float x = S::h - r;
        const float r_2 = r * r;
        return sigma * x * x * x * (r_2 - 0.75 * (S::h_2 - r_2));
    }

    //Spiky核的梯度, 用于求压强梯度(▽p)
    //此处光滑核的梯度是一个标量,
    //要求压强梯度还需要乘上方向向量r/|r|
    static float Grad_W_Spiky(float r)
    {
        using S = Setting;
        if (r < 0 || r > S::h)
            return 0;
        constexpr float h_6 = S::h_3 * S::h_3;
        constexpr float sigma = -45.f / (S::pi * h_6);
        const float x = S::h - r;
        return sigma * x * x;
    }

    //viscosity核, 用于插值剪切力
    static float W_Visco(float r)
    {
        using S = Setting;
        if (r < 0 || r > S::h)
            return 0;
        constexpr float sigma = 15.f / (2 * S::pi * S::h_3);
        constexpr float half_h = S::h / 2;
        const float r_2 = r * r;
        const float a = -r_2 * r / (S::_2pi * S::h_3);
        const float b = r_2 / S::h_2;
        const float c = half_h / r - 1;
        return sigma * (a + b + c);
    }

    //viscosity核的Laplacian, 用于求粘度
    static float Lapl_W_Visco(float r)
    {
        using S = Setting;
        if (r < 0 || r > S::h)
            return 0;
        constexpr float h_5 = S::h_3 * S::h_2;
        constexpr float sigma = 45.f / (S::pi * h_5);
        return sigma * (1.f - r / S::h);
    }
};

//Neighborhood指一堆相邻粒子的集合
struct Neighborhood
{
    using callback_t = std::function<void(Particle &, Particle &, float h)>;
    using value_t = Particle *; //不管理Particle的生命周期
    enum
    {
        num_neighbor = 20
    };

    std::vector<value_t> p__s;

    Neighborhood()
    {
        p__s.reserve(num_neighbor);
    }

    void push(value_t p)
    {
        // if (p__s.size() > num_neighbor)
        //     return;
        p__s.push_back(p);
    }

    std::vector<value_t> &get_range()
    {
        return p__s;
    }

    void for_each_neighbor(value_t p, const callback_t &callback)
    {
        for (value_t &q : p__s)
        {
            const float d = p->x.distance(q->x);
            if (d < Setting::h)
            {
                callback(*p, *q, d);
            }
        }
    }

    //获得此粒子集合相对于某个粒子的相邻粒子集合, 以Setting::h作为半径
    void get_neighbors(value_t p, Neighborhood &n__s)
    {
        for (value_t &q : p__s)
        {
            const float d = p->x.distance(q->x);
            if (d < Setting::h)
            {
                n__s.push(q);
            }
        }
    }
};

struct Grids
{
    using grid_coords_t = std::pair<int, int>;
    using grid_id_t = size_t;
    using Grid = Neighborhood;
    using value_t = Grid::value_t;
    using callback_t = Grid::callback_t;
    enum
    {
        max_grid_num = 256,
        max_particle_num_in_grid = Grid::num_neighbor,
        grid_size = (size_t)Setting::_2h + 1,
    };

    struct hash_grid_coords
    {
        size_t operator()(const grid_coords_t& coords) const
        {
            return coords.first * 73856093 ^ coords.second * 19349663;
        }
    };
    std::unordered_map<grid_coords_t, grid_id_t, hash_grid_coords> grid_map;
    std::vector<Grid> grids;

    void init()
    {
        grid_map.reserve(max_grid_num);
        grids.reserve(100);
    }

    void reset()
    {
        grid_map.clear();
        grids.clear();
    }

    void insert(Particle *p)
    {
        grid_coords_t g_coords = {(int)p->x.x / grid_size, (int)p->x.y / grid_size};
        //如果映射中不存在此网格
        if (auto iter = grid_map.find(g_coords); iter == grid_map.end())
        {
            grid_id_t g_id = grids.size();
            if (g_id < max_grid_num)
            {
                grids.emplace_back();
                grids.back().push(p);
                grid_map.insert({g_coords, g_id});
            }
        }
        else
        {
            grids[iter->second].push(p);
        }
    }

    void for_each_neighbor(value_t p, const callback_t &callback)
    {
        int coords_x = (int)(p->x.x / grid_size - 0.5f);
        int coords_y = (int)(p->x.y / grid_size - 0.5f);
        grid_coords_t g_coords[4] = {
            {coords_x, coords_y},
            {coords_x + 1, coords_y},
            {coords_x, coords_y + 1},
            {coords_x + 1, coords_y + 1},
        };
        for (auto g_coo : g_coords)
        {
            if (auto iter = grid_map.find(g_coo); iter != grid_map.end())
            {
                grids[iter->second].for_each_neighbor(p, callback);
            }
        }
    }

    void get_neighbors(value_t p, Neighborhood &n__s)
    {
        int coords_x = (int)(p->x.x / grid_size - 0.5);
        int coords_y = (int)(p->x.y / grid_size - 0.5);
        grid_coords_t g_coords[4] = {
            {coords_x, coords_y},
            {coords_x + 1, coords_y},
            {coords_x, coords_y + 1},
            {coords_x + 1, coords_y + 1},
        };
        for (auto g_coo : g_coords)
        {
            if (auto iter = grid_map.find(g_coo); iter != grid_map.end())
            {
                grids[iter->second].get_neighbors(p, n__s);
            }
        }
    }
};

class SPH
{
public:
    enum
    {
        width = 600,
        height = 800
    };

    static SPH &GetInst()
    {
        static SPH sph{};
        return sph;
    }

    void init()
    {
        srand(time(0));
        _particles.resize(100);
        for (int i = -5; i < 5; i++)
        {
            for (int j = 0; j < 10; j++)
            {
                auto &p = _particles[i + 5 + j * 10];
                p.x = {i * 40.f + width / 2, j * 40.f + height * 0.5f};
            }
        }
        
    }

    void clear()
    {
        _particles.clear();
        _grids.reset();
    }

    void *get_data() noexcept
    {
        return &_particles[0];
    }

    int get_data_length() const noexcept
    {
        return _particles.size();
    }

    constexpr int get_particle_size() const noexcept
    {
        return sizeof(_particles[0]);
    }

    void update()
    {
        //更新网格
        update_grids();
        //更新粒子
        update_particles();
    }

private:
    void update_grids()
    {
        _grids.reset();
        for (auto &p : _particles)
        {
            _grids.insert(&p);
        }
    }

    //WCSPH
    void update_particles()
    {
        using U = Utility;
        using S = Setting;

        for (auto &p : _particles)
        {
            //更新密度
            float rho = 0;
            _grids.for_each_neighbor(&p,[&rho](Particle& p1, Particle& p2, float r){
                rho += U::W_Poly6(r); //*m, 假设质点质量都为1
            });
            p.rho = rho;
            //更新压强, 通过状态方程
            p.p = S::B * (pow(p.rho / S::p0, S::gama) - 1);
        }

        for (auto &p : _particles)
        {
            Vec2 lapl_v = {};
            Vec2 grad_p = {};
            Vec2 a_s = {}; //表面张力
            _grids.for_each_neighbor(&p,[&lapl_v, &grad_p, &a_s](Particle& p1, Particle& p2, float r){
                lapl_v += p2.v * U::Lapl_W_Visco(r) / p2.rho;
                a_s += (p1.x - p2.x) * U::W_Poly6(r);
                if (&p1 == &p2 || r < 0.01f)
                    return;
                const Vec2 d = (p1.x - p2.x) / r;
                grad_p += U::Grad_W_Spiky(r) * (p1.p / (p1.rho * p1.rho) + p2.p / (p2.rho * p2.rho)) * d;
            });
            //grad_p *= p.rho;
            a_s *= -S::h_2;
            //剪切力和压力
            const Vec2 f_v = S::ki_vi * lapl_v;
            const Vec2 a_p = grad_p; /// p.rho;
            //边界力
            Vec2 a_b = {};
            if (p.x.x < S::h/2)
            {
                const float r = fmax(p.x.x, 1e-2f);
                constexpr Vec2 d = {-1, 0};
                a_b += U::Grad_W_Spiky(r)/r * 1e6 * d;
            }
            else if (p.x.x > width - S::h / 2)
            {
                const float r = fmax(width - p.x.x, 1e-2f);
                constexpr Vec2 d = {1, 0};
                a_b += U::Grad_W_Spiky(r)/r * 1e6 * d;
            }
            if (p.x.y < 0)
            {
                const float r = fmax(p.x.y, 1e-2f);
                constexpr Vec2 d = {0, -1};
                a_b += U::Grad_W_Spiky(r)/r * 1e6 * d;
            }
            else if (p.x.y > height - 1)
            {
                const float r = fmax(height - p.x.y, 1e-2f);
                constexpr Vec2 d = {0, 1};
                a_b += U::Grad_W_Spiky(r)/r * 1e6 * d;
            }
            const Vec2 a = f_v + a_b + a_p + a_s + S::g;
            p.v += a * S::dt;
            p.v *= 1.f - fmin(powf(p.v.norm(), 2) * S::h * 1e-9f + 1e-6f, 0.9f); //阻尼
            p.x += p.v * S::dt;
        }
    }

    SPH() = default;
    std::vector<Particle> _particles;
    Grids _grids;
    //std::vector<Neighborhood> _neighborboods;
};

extern "C"
{
    void init()
    {
        SPH::GetInst().init();
    }
    void *get_data()
    {
        return SPH::GetInst().get_data();
    }
    void clear()
    {
        SPH::GetInst().clear();
    }
    void update(float *data)
    {
        SPH::GetInst().update();
    }
    int get_data_length()
    {
        return SPH::GetInst().get_data_length();
    }
    int get_particle_size()
    {
        return SPH::GetInst().get_particle_size();
    }
}
