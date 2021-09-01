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
    friend Vec2 operator+(float lhs, const Vec2 &rhs)
    {
        return {lhs + rhs.x, lhs + rhs.y};
    }
    friend Vec2 operator-(float lhs, const Vec2 &rhs)
    {
        return {lhs - rhs.x, lhs - rhs.y};
    }
    friend Vec2 operator*(float lhs, const Vec2 &rhs)
    {
        return {lhs * rhs.x, lhs * rhs.y};
    }
    friend Vec2 operator/(float lhs, const Vec2 &rhs)
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
    static constexpr float h = 30; //光滑核半径
    static constexpr float _2h = h * 2;
    static constexpr float h_2 = h * h;
    static constexpr float h_3 = h_2 * h;
    static constexpr float pi = M_PI;
    static constexpr float _2pi = pi * 2;
    static constexpr float rho0 = 100.f;
    static constexpr int gama = 8;
    static constexpr float B = 0.01f;
    static constexpr float ki_vi = 1e8f; //kinematic viscosity
    static constexpr Vec2 g = {0, -9.8f};
    static constexpr float dt = 0.005f;
};

//假设粒子质量始终为1, m=1
struct Particle
{
    Vec2 x;
    Vec2 v;
    float p;
    float rho;
    Vec2 v_pre;
    Vec2 x_pre;
    Vec2 f_v_g_ext;
    Vec2 f_p;
    float k_pci;
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

    //poly6核的梯度
    template <typename T>
    static T Grad_W_Poly6(T R)
    {
        using S = Setting;
        if constexpr (!std::is_arithmetic_v<T>)
        {
            const float r = R.norm();
            if (r < 0 || r > S::h)
                return Vec2{0.f, 0.f};
            constexpr float h_9 = S::h_3 * S::h_3 * S::h_3;
            constexpr float sigma = -945.f / (32.f * S::pi * h_9);
            const float x = S::h * S::h - r * r;
            return sigma * x * x * R;
        }
        else
        {
            const float r = R;
            if (r < 0 || r > S::h)
                return 0.f;
            constexpr float h_9 = S::h_3 * S::h_3 * S::h_3;
            constexpr float sigma = -945.f / (32.f * S::pi * h_9);
            const float x = S::h * S::h - r * r;
            return sigma * x * x * R;
        }
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

    //Spiky核的梯度, 用于求压强梯度(▽p),
    //由于梯度处于x轴下方，实际使用的时候要注意方向
    template <typename T>
    static T Grad_W_Spiky(T R)
    {
        using S = Setting;
        if constexpr (!std::is_arithmetic_v<T>)
        {
            const float r = R.norm();
            if (r <= 0 || r > S::h)
                return Vec2{0.f, 0.f};
            constexpr float h_6 = S::h_3 * S::h_3;
            constexpr float sigma = -45.f / (S::pi * h_6);
            const float x = S::h - r;
            return sigma * x * x / r * R;
        }
        else
        {
            const float r = R;
            if (r <= 0 || r > S::h)
                return 0.f;
            constexpr float h_6 = S::h_3 * S::h_3;
            constexpr float sigma = -45.f / (S::pi * h_6);
            const float x = S::h - r;
            return sigma * x * x;
        }
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

    enum
    {
        num_neighbor = 20
    };

    std::vector<Particle *> p__s;

    Neighborhood()
    {
        p__s.reserve(num_neighbor);
    }

    void push(Particle *p)
    {
        // if (p__s.size() > num_neighbor)
        //     return;
        p__s.push_back(p);
    }

    std::vector<Particle *> &get_range()
    {
        return p__s;
    }

    void clear()
    {
        p__s.clear();
    }

    void for_each_neighbor(Particle &p, const callback_t &callback)
    {
        for (Particle *q : p__s)
        {
            const float d = p.x.distance(q->x);
            if (d < Setting::h)
            {
                callback(p, *q, d);
            }
        }
    }

    //获得此粒子集合相对于某个粒子的相邻粒子集合, 以Setting::h作为半径
    void get_neighbors(Particle &p, Neighborhood &n__s)
    {
        for (Particle *q : p__s)
        {
            const float d = p.x.distance(q->x);
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
    using callback_t = Grid::callback_t;
    enum
    {
        max_grid_num = 256,
        max_particle_num_in_grid = Grid::num_neighbor,
        grid_size = (size_t)Setting::_2h + 1,
    };

    struct hash_grid_coords
    {
        size_t operator()(const grid_coords_t &coords) const
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

    void for_each_neighbor(Particle &p, const callback_t &callback)
    {
        int coords_x = (int)(p.x.x / grid_size - 0.5f);
        int coords_y = (int)(p.x.y / grid_size - 0.5f);
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

    void get_neighbors(Particle &p, Neighborhood &n__s)
    {
        int coords_x = (int)(p.x.x / grid_size - 0.5);
        int coords_y = (int)(p.x.y / grid_size - 0.5);
        grid_coords_t g_coords[4] = {
            {coords_x, coords_y},
            {coords_x + 1, coords_y},
            {coords_x, coords_y + 1},
            {coords_x + 1, coords_y + 1},
        };
        n__s.clear();
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
        width = 1200,
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
        _neighborboods.resize(100);
        for (int i = -5; i < 5; i++)
        {
            for (int j = 0; j < 10; j++)
            {
                auto &p = _particles[i + 5 + j * 10];
                p.x = {i * 30.f + width / 2, j * 30.f + height * 0.5f};
                p.v = {rand() % 100 * 0.001f, rand() % 100 * 0.001f};
            }
        }
    }

    void clear()
    {
        _particles.clear();
        _neighborboods.clear();
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
        //update_particles();
        update_particles_PCISPH();
    }

private:
    void update_grids()
    {
        _grids.reset();
        for (auto &p : _particles)
        {
            _grids.insert(&p);
        }

        const size_t len = _particles.size();
        if (_neighborboods.size() < len)
        {
            _neighborboods.resize(len);
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
            _grids.for_each_neighbor(p, [&rho](Particle &p1, Particle &p2, float r) {
                rho += U::W_Poly6(r); //*m, 假设质点质量都为1 
            });
            p.rho = rho;
            //更新压强, 通过状态方程
            p.p = S::B * (pow(p.rho / S::rho0, S::gama) - 1);
        }

        for (auto &p : _particles)
        {
            Vec2 lapl_v = {};
            Vec2 grad_p = {};
            Vec2 f_s = {}; //表面张力
            _grids.for_each_neighbor(p, [&lapl_v, &grad_p, &f_s](Particle &p1, Particle &p2, float r){
                if (&p1 == &p2 || r < 1e-8f)
                    return;
                const Vec2 p2_p1 = p1.x - p2.x;
                lapl_v += p2.v * U::Lapl_W_Visco(r) / (p2.rho * r);
                f_s += p2_p1 * U::W_Poly6(r);
                grad_p += U::Grad_W_Spiky(p2_p1) * (p1.p / (p1.rho * p1.rho) + p2.p / (p2.rho * p2.rho));
            });
            f_s *= -S::h_2;
            //剪切力和压力
            const Vec2 f_v = -S::ki_vi * lapl_v * 2;
            const Vec2 f_p = grad_p;
            //边界力
            Vec2 f_b = {};
            if (p.x.x < S::h / 2)
            {
                const float r = fmax(p.x.x, 1e-2f);
                constexpr Vec2 d = {-1, 0};
                f_b += U::Grad_W_Spiky(r) / r * 1e6 * d;
            }
            else if (p.x.x > width - S::h / 2)
            {
                const float r = fmax(width - p.x.x, 1e-2f);
                constexpr Vec2 d = {1, 0};
                f_b += U::Grad_W_Spiky(r) / r * 1e6 * d;
            }
            if (p.x.y < S::h / 2)
            {
                const float r = fmax(p.x.y, 1e-2f);
                constexpr Vec2 d = {0, -1};
                f_b += U::Grad_W_Spiky(r) / r * 1e6 * d;
            }
            else if (p.x.y > height - 1 - S::h / 2)
            {
                const float r = fmax(height - p.x.y, 1e-2f);
                constexpr Vec2 d = {0, 1};
                f_b += U::Grad_W_Spiky(r) / r * 1e6 * d;
            }
            const Vec2 a = f_v + f_b + f_p + f_s + S::g; //m=1
            p.x += p.v * S::dt + 0.5f * a * S::dt * S::dt;
            p.v += a * S::dt;
            p.v *= 1.f - fmin(powf(p.v.norm(), 2) * S::h * 1e-9f + 1e-6f, 0.9f); //阻尼
        }
    }

    //PCISPH
    void update_particles_PCISPH()
    {
        using U = Utility;
        using S = Setting;

        const size_t len = _particles.size();
        constexpr float kk_pci = 1e-8f* 0.5f * (S::rho0 * S::rho0) / (S::dt * S::dt);
        for (size_t i = 0; i < len; ++i)
        {
            Particle &p1 = _particles[i];
            Neighborhood &neighbors = _neighborboods[i];
            //更新邻居
            _grids.get_neighbors(p1, neighbors);
            //更新k_pci, f_p = k_pci * rho_err
            float sum_grad_wij = 0.f;
            float sum_grad_wij_2 = 0.f;
            for (Particle *q : neighbors.get_range())
            {
                if (&p1 == q)
                    continue;
                const Particle &p2 = *q;
                const float r = p1.x.distance(p2.x);
                const float g_wij = -U::Grad_W_Spiky(r);
                sum_grad_wij += g_wij;
                sum_grad_wij_2 += g_wij * g_wij;
            }
            p1.k_pci = kk_pci / (sum_grad_wij * sum_grad_wij + sum_grad_wij_2 + 1e-8f);
        }

        for (size_t i = 0; i < len; ++i)
        {
            Particle &p1 = _particles[i];
            Neighborhood &neighbors = _neighborboods[i];
            //更新压力以外的受力
            Vec2 f_v = {};   //剪切力
            Vec2 f_s = {};   //表面张力
            Vec2 f_b = {};   //边界力
            Vec2 f_g = S::g; //重力
            for (Particle *q : neighbors.get_range())
            {
                const Particle &p2 = *q;
                const Vec2 p2_p1 = p1.x - p2.x;
                const float r = p2_p1.norm();
                f_v += p2.v * U::Lapl_W_Visco(r) / S::rho0;
                if (&p1 == q || r < 1e-8)
                    continue;
                f_s += p2_p1 * U::W_Poly6(r) / r;
            }
            f_v *= -S::ki_vi * 2;
            f_s *= -S::h_2 * 1e3f;
            if (p1.x.x < S::h / 2)
            {
                const float r = fmax(p1.x.x, 1e-2f);
                constexpr Vec2 d = {-1, 0};
                f_b += U::Grad_W_Spiky(r) / r * 1e6 * d;
            }
            else if (p1.x.x > width - S::h / 2)
            {
                const float r = fmax(width - p1.x.x, 1e-2f);
                constexpr Vec2 d = {1, 0};
                f_b += U::Grad_W_Spiky(r) / r * 1e6 * d;
            }
            if (p1.x.y < S::h / 2)
            {
                const float r = fmax(p1.x.y, 1e-2f);
                constexpr Vec2 d = {0, -1};
                f_b += U::Grad_W_Spiky(r) / r * 1e6 * d;
            }
            else if (p1.x.y > height - 1 - S::h / 2)
            {
                const float r = fmax(height - p1.x.y, 1e-2f);
                constexpr Vec2 d = {0, 1};
                f_b += U::Grad_W_Spiky(r) / r * 1e6 * d;
            }
            p1.f_v_g_ext = f_v + f_b + f_s + f_g;

            //初始化压力和压强
            p1.p = 0.f;
            p1.f_p = {};
        }

        //预测矫正循环
        float max_rho_err = 0.f;
        size_t iter = 0;
        do
        {
            //预测位移和速度
            for (Particle &p : _particles)
            {
                p.v_pre = p.v + (p.f_v_g_ext + p.f_p) * S::dt;
                p.x_pre = p.x + p.v_pre * S::dt;
            }
            for (size_t i = 0; i < len; ++i)
            {
                Particle &p1 = _particles[i];
                Neighborhood &neighbors = _neighborboods[i];
                //所有粒子更新完位置后，更新(预测)密度,和(预测)压强, 通过计算rho_err
                p1.rho = 0.f;
                for (Particle *p2 : neighbors.get_range())
                {
                    float r = p1.x.distance(p2->x);
                    p1.rho += U::W_Poly6(r);
                }
                const float rho_err = S::rho0 - p1.rho;
                max_rho_err = fmax(max_rho_err, fabs(rho_err));
                p1.p += p1.k_pci * rho_err;
            }
            //计算压力
            for (size_t i = 0; i < len; ++i)
            {
                Particle &p1 = _particles[i];
                Neighborhood &neighbors = _neighborboods[i];
                //
                for (Particle *q : neighbors.get_range())
                {
                    if (&p1 == q)
                        continue;
                    const Particle &p2 = *q;
                    const Vec2 p2_p1 = p1.x - p2.x;
                    const float r = p2_p1.norm();
                    if (r < 1e-8f)
                        continue;
                    p1.f_p += -U::Grad_W_Spiky(p2_p1) * (p1.p + p2.p) / (S::rho0 * S::rho0);
                }
            }
        } while (max_rho_err > 0.03f && ++iter < 10);
        //更新v和x
        for (Particle &p : _particles)
        {
            Vec2 a = p.f_v_g_ext + p.f_p; //m = 1
            p.x = p.x + p.v * S::dt + 0.5f * S::dt * S::dt * a;
            p.v += a * S::dt;
            p.v *= 1.f - fmin(powf(p.v.norm(), 2) * S::h * 1e-6f*S::dt + 1e-5f * S::dt, 0.8f); //阻尼
        }
    }

    SPH() = default;
    std::vector<Particle> _particles;
    Grids _grids;
    std::vector<Neighborhood> _neighborboods;
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
