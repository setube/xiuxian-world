# 修仙文字游戏

多人在线修炼养成游戏，基于 Vue 3 + Express.js + PostgreSQL 构建。

## 技术栈

### 前端
- Vue 3.5 + Composition API
- Vite 7
- Pinia 状态管理
- NaiveUI 组件库
- Socket.IO 实时通信

### 后端
- Express.js 4
- TypeORM + PostgreSQL
- Redis 缓存
- Socket.IO
- JWT 双令牌认证

## 快速开始

### 环境要求
- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- pnpm

### 安装步骤

1. 克隆项目
```bash
git clone https://github.com/setube/xiuxian-world.git
cd xiuxian-world
```

2. 安装后端依赖
```bash
cd server
pnpm install
cp .env.example .env
# 编辑 .env 配置数据库和 Redis 连接
```

3. 安装前端依赖
```bash
cd ../view
pnpm install
```

4. 启动开发服务器
```bash
# 终端1 - 后端
cd server
pnpm dev

# 终端2 - 前端
cd view
pnpm dev
```

5. 访问 http://localhost:25128

### 生产构建
```bash
# 前端构建（输出到 server/public）
cd view
pnpm build

# 后端构建
cd server
pnpm build
```

## 游戏特色

### 六大宗门

| 宗门 | 特色 | 玩法 |
|-----|------|------|
| 太乙宗 | 丹道正宗 | 炼丹、布阵 |
| 星辰宫 | 星象占卜 | 星盘、道侣、观星 |
| 黑煞门 | 邪道魔修 | 煞气、血魂幡、夺魂 |
| 万灵宗 | 驭兽世家 | 灵兽捕捉、兽潮 |
| 合欢宗 | 双修法门 | 双修系统 |
| 落云宗 | 灵植培育 | 灵眼之树（全服共享） |

### 境界体系

九大境界，每境四阶：

1. **炼气期** - 初期/中期/后期/圆满
2. **筑基期** - 需要筑基丹突破
3. **结丹期** - 需要渡结丹之劫
4. **元婴期** - 需要渡元婴之劫
5. **化神期**
6. **炼虚期**
7. **合体期**
8. **大乘期**
9. **渡劫期**

### 核心系统

- **修炼系统** - 闭关修炼、深度闭关、南宫婉奇遇
- **洞府系统** - 灵脉产出、静室修炼、访客互动、社交拜访
- **PvP竞技** - 竞技场对战、魂魄系统
- **秘境探索** - 随机秘境、副本挑战
- **交易市场** - 玩家自由交易
- **宗门外交** - 宗门关系、掌门选举

## 项目结构

```
xiuxian-world/
├── server/                 # 后端服务
│   ├── src/
│   │   ├── config/        # 配置文件
│   │   ├── controllers/   # 控制器
│   │   ├── game/constants/# 游戏常量配置
│   │   ├── middlewares/   # 中间件
│   │   ├── models/        # TypeORM 实体
│   │   ├── routes/        # API 路由
│   │   ├── seeds/         # 种子数据
│   │   ├── services/      # 业务逻辑
│   │   ├── socket/        # Socket.IO 处理
│   │   └── utils/         # 工具函数
│   └── public/            # 前端构建输出
│
└── view/                   # 前端应用
    └── src/
        ├── api/           # API 封装
        ├── router/        # 路由配置
        ├── stores/        # Pinia 状态
        ├── views/         # 页面组件
        └── utils/         # 工具函数
```

## 环境变量

后端 `.env` 配置示例：

```env
# 服务器
PORT=3000
NODE_ENV=development

# 数据库
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_DATABASE=xiuxian

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# 客户端URL（CORS）
CLIENT_URL=http://localhost:25128
```

## 许可证

MIT License
