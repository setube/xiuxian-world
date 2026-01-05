import axios, { type AxiosError, type AxiosResponse } from 'axios'
import router from '@/router'
import { ApiError } from '@/utils/ApiError'
import type { ApiResponse, ApiSuccessResponse, ApiErrorResponse } from '@/types/api'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000
})

// 请求拦截器
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => Promise.reject(error)
)

// 清除所有认证信息并跳转登录
const clearAuthAndRedirect = () => {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
  localStorage.removeItem('characterId')
  localStorage.removeItem('spiritRootId')
  localStorage.removeItem('daoName')
  router.push({ name: 'Login' })
}

// 响应拦截器
api.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    const data = response.data

    // 统一格式响应处理
    if (data && typeof data === 'object' && 'code' in data) {
      // 错误响应（code !== 0）
      if (data.code !== 0) {
        const apiError = new ApiError(data as ApiErrorResponse)
        return Promise.reject(apiError)
      }
      // 成功响应：提取 data.data 保持现有代码兼容
      const successResponse = data as ApiSuccessResponse<unknown>
      return {
        ...response,
        data: successResponse.data
      } as AxiosResponse
    }

    return response
  },
  async (error: AxiosError<ApiErrorResponse>) => {
    const originalRequest = error.config as typeof error.config & { _retry?: boolean }

    // 处理错误响应
    if (error.response?.data && 'code' in error.response.data && typeof error.response.data.code === 'number') {
      const apiError = new ApiError(error.response.data)

      // 令牌过期，尝试刷新
      if (apiError.needsTokenRefresh() && !originalRequest?._retry) {
        originalRequest._retry = true

        const refreshToken = localStorage.getItem('refreshToken')
        if (refreshToken) {
          try {
            const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken })

            if (data.code === 0) {
              const tokens = data.data.tokens
              localStorage.setItem('accessToken', tokens.accessToken)
              localStorage.setItem('refreshToken', tokens.refreshToken)
              originalRequest!.headers.Authorization = `Bearer ${tokens.accessToken}`
              return api(originalRequest!)
            }
          } catch {
            clearAuthAndRedirect()
            return Promise.reject(apiError)
          }
        }
        clearAuthAndRedirect()
        return Promise.reject(apiError)
      }

      // 需要重新登录的错误
      if (apiError.needsRelogin()) {
        clearAuthAndRedirect()
        return Promise.reject(apiError)
      }

      return Promise.reject(apiError)
    }

    // 网络错误等非业务错误
    if (error.response?.status === 401) {
      clearAuthAndRedirect()
    }

    return Promise.reject(error)
  }
)

// ============ 工具函数 ============

/**
 * 提取错误消息
 */
export function extractErrorMessage(error: unknown, defaultMessage = '操作失败'): string {
  // ApiError
  if (error instanceof ApiError) {
    return error.message
  }

  // 普通 Error
  if (error instanceof Error) {
    return error.message
  }

  return defaultMessage
}

/**
 * 判断是否为特定错误类型
 */
export function isErrorType(error: unknown, errorType: string): boolean {
  if (error instanceof ApiError) {
    return error.is(errorType)
  }
  return false
}

/**
 * 判断是否为 ApiError
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

// ============ API 模块 ============

// 认证 API
export const authApi = {
  register: (data: { username: string; email: string; password: string }) => api.post('/auth/register', data),

  login: (data: { username: string; password: string }) => api.post('/auth/login', data),

  refresh: (refreshToken: string) => api.post('/auth/refresh', { refreshToken }),

  logout: () => api.post('/auth/logout')
}

// 玩家 API
export const playerApi = {
  // 设置角色名（灵根检测前）
  setName: (name: string) => api.post('/player/set-name', { name }),

  // 灵根检测并创建角色
  detectSpiritRoot: () => api.post('/player/detect-spirit-root'),

  // 创建角色（保留兼容）
  createCharacter: (data: { name: string; spiritRootId?: string }) => api.post('/player/create', data),

  getProfile: () => api.get('/player/profile'),

  getStats: () => api.get('/player/stats'),

  getPlayer: (id: string) => api.get(`/player/${id}`)
}

// 修炼 API
export const cultivationApi = {
  // 获取修炼状态
  getStatus: () => api.get('/cultivation/status'),

  // 开始闭关修炼
  start: () => api.post('/cultivation/start'),

  // 开始深度闭关（神游太虚）
  startDeep: () => api.post('/cultivation/deep/start'),

  // 结束深度闭关
  finishDeep: (forceExit?: boolean) => api.post('/cultivation/deep/finish', { forceExit }),

  // 切换和平模式
  togglePeaceMode: () => api.post('/cultivation/peace-mode'),

  // 清除丹毒
  clearPoison: () => api.post('/cultivation/clear-poison'),

  // 上线结算（被动修炼）
  handleOnline: () => api.post('/cultivation/online'),

  // 突破
  breakthrough: () => api.post('/cultivation/breakthrough')
}

// 宗门 API
export const sectApi = {
  // 获取宗门状态
  getStatus: () => api.get('/sect/status'),

  // 加入宗门
  join: (sectId: string) => api.post('/sect/join', { sectId }),

  // 叛门
  leave: () => api.post('/sect/leave'),

  // 领取俸禄
  claimSalary: () => api.post('/sect/salary'),

  // 晋升
  promote: () => api.post('/sect/promote'),

  // 获取宗门成员（分页）
  getMembers: (page: number = 1, pageSize: number = 10) => api.get('/sect/members', { params: { page, pageSize } }),

  // 宗门点卯
  checkIn: () => api.post('/sect/checkin'),

  // 宗门传功
  teach: () => api.post('/sect/teach'),

  // 获取宝库物品列表
  getTreasuryItems: () => api.get('/sect/treasury'),

  // 购买宝库物品
  purchaseTreasuryItem: (itemId: string, quantity?: number) => api.post('/sect/treasury/purchase', { itemId, quantity: quantity || 1 }),

  // 捐献灵石
  donate: (amount: number) => api.post('/sect/donate', { amount }),

  // 获取悬赏列表
  getBounties: () => api.get('/sect/bounties'),

  // 接受悬赏
  acceptBounty: (bountyId: string) => api.post('/sect/bounties/accept', { bountyId }),

  // 提交悬赏
  submitBounty: (bountyId: string) => api.post('/sect/bounties/submit', { bountyId }),

  // 放弃悬赏
  abandonBounty: (bountyId: string) => api.post('/sect/bounties/abandon', { bountyId })
}

// 储物袋 API
export const inventoryApi = {
  // 获取背包物品列表
  getInventory: (params?: { type?: string; sort?: string; page?: number; pageSize?: number }) => api.get('/inventory', { params }),

  // 获取背包容量
  getCapacity: () => api.get('/inventory/capacity'),

  // 获取单个物品详情
  getItemDetail: (inventoryItemId: string) => api.get(`/inventory/item/${inventoryItemId}`),

  // 使用物品
  useItem: (inventoryItemId: string, quantity?: number) => api.post(`/inventory/use/${inventoryItemId}`, { quantity: quantity || 1 }),

  // 丢弃物品
  discardItem: (inventoryItemId: string, quantity?: number) =>
    api.post(`/inventory/discard/${inventoryItemId}`, { quantity: quantity || 1 }),

  // 获取已学习的配方列表
  getRecipes: () => api.get('/inventory/recipes'),

  // 学习配方
  learnRecipe: (inventoryItemId: string) => api.post('/inventory/learn-recipe', { inventoryItemId }),

  // 检查是否可以炼制
  canCraft: (recipeId: string, times?: number) => api.get(`/inventory/can-craft/${recipeId}`, { params: { times: times || 1 } }),

  // 炼制物品
  craft: (recipeId: string, times?: number) => api.post('/inventory/craft', { recipeId, times: times || 1 }),

  // 赠送物品
  giftItem: (inventoryItemId: string, targetCharacterId?: string, targetName?: string, quantity?: number) =>
    api.post('/inventory/gift', { inventoryItemId, targetCharacterId, targetName, quantity: quantity || 1 })
}

// 药园 API (黄枫谷专属)
export const herbGardenApi = {
  // 获取药园状态
  getGarden: () => api.get('/garden'),

  // 获取可用种子列表
  getSeeds: () => api.get('/garden/seeds'),

  // 播种
  plant: (plotIndex: number, seedId: string) => api.post('/garden/plant', { plotIndex, seedId }),

  // 采收
  harvest: (plotIndex: number) => api.post('/garden/harvest', { plotIndex }),

  // 处理事件（除草/除虫/浇水）
  handleEvent: (plotIndex: number, action: 'weed' | 'pesticide' | 'water') => api.post('/garden/handle-event', { plotIndex, action }),

  // 扩建药园
  expand: () => api.post('/garden/expand'),

  // 晋升丹道长老
  becomeElder: () => api.post('/garden/become-elder'),

  // 获取探索状态
  getExploreStatus: () => api.get('/garden/explore/status'),

  // 开始洞天寻宝
  startExplore: (plotIndex: number) => api.post('/garden/explore', { plotIndex }),

  // 战斗行动
  combat: (action: 'attack' | 'flee') => api.post('/garden/explore/combat', { action })
}

// 太一门 API (太一门专属)
export const taiyiApi = {
  // 获取太一门系统状态
  getStatus: () => api.get('/taiyi/status'),

  // 获取元素列表
  getElements: () => api.get('/taiyi/elements'),

  // 使用引道
  useGuidance: (element: 'metal' | 'wood' | 'water' | 'fire' | 'earth') => api.post('/taiyi/guidance', { element }),

  // 使用神识冲击
  useConsciousnessStrike: (targetCharacterId: string) => api.post('/taiyi/strike', { targetCharacterId })
}

// 星宫 API (星宫专属)
export const starpalaceApi = {
  // 获取星宫系统完整状态
  getStatus: () => api.get('/starpalace/status'),

  // ========== 侍妾系统 ==========
  // 获取侍妾状态
  getConsort: () => api.get('/starpalace/consort'),

  // 每日问安
  greetConsort: () => api.post('/starpalace/consort/greet'),

  // 赠予侍妾
  giftConsort: (amount: number) => api.post('/starpalace/consort/gift', { amount }),

  // 灵力反哺
  spiritFeedback: () => api.post('/starpalace/consort/spirit-feedback'),

  // 派遣侍妾到引星盘
  assignConsort: (diskIndex: number) => api.post('/starpalace/consort/assign', { diskIndex }),

  // 召回侍妾
  recallConsort: () => api.post('/starpalace/consort/recall'),

  // ========== 观星台系统 ==========
  // 获取观星台状态
  getObservatory: () => api.get('/starpalace/observatory'),

  // 开始凝聚星辰
  startGathering: (diskIndex: number, starType: string) => api.post('/starpalace/disk/start', { diskIndex, starType }),

  // 收集产出
  collectDisk: (diskIndex: number) => api.post('/starpalace/disk/collect', { diskIndex }),

  // 处理引星盘事件
  handleDiskEvent: (diskIndex: number) => api.post('/starpalace/disk/handle-event', { diskIndex }),

  // 扩展引星盘
  expandDisks: () => api.post('/starpalace/disk/expand'),

  // ========== 周天星斗大阵 ==========
  // 获取大阵状态
  getArrayStatus: () => api.get('/starpalace/array'),

  // 发起大阵
  initiateArray: () => api.post('/starpalace/array/initiate'),

  // 加入大阵
  joinArray: (arrayId: string) => api.post('/starpalace/array/join', { arrayId }),

  // ========== 星衍天机 ==========
  // 获取观星状态
  getStargazeStatus: () => api.get('/starpalace/stargaze'),

  // 进行观星
  stargaze: () => api.post('/starpalace/stargaze'),

  // 改换星移
  changeFate: () => api.post('/starpalace/stargaze/change-fate')
}

// 黑煞教 API (黑煞教专属)
export const heishaApi = {
  // 获取魔道禁术系统完整状态
  getStatus: () => api.get('/heisha/status'),

  // 检查是否被奴役
  checkEnslaved: () => api.get('/heisha/enslaved'),

  // ========== 傀儡系统 ==========
  // 获取傀儡列表
  getPuppets: () => api.get('/heisha/puppets'),

  // 发动夺舍
  soulSeize: (targetId: string) => api.post('/heisha/seize', { targetId }),

  // 释放傀儡
  releasePuppet: (puppetId: string) => api.post('/heisha/release', { puppetId }),

  // ========== 侍妾窃取系统 ==========
  // 获取窃取的侍妾
  getStolenConsort: () => api.get('/heisha/stolen-consort'),

  // 窃取侍妾
  stealConsort: (targetId: string) => api.post('/heisha/steal-consort', { targetId }),

  // 魔音灌脑
  brainwash: () => api.post('/heisha/brainwash'),

  // 强索元阴
  extract: () => api.post('/heisha/extract'),

  // ========== 丹魔之咒系统 ==========
  // 获取咒印状态
  getCurseStatus: () => api.get('/heisha/curse/status'),

  // 施放丹魔之咒
  castCurse: (targetId: string) => api.post('/heisha/curse/cast', { targetId }),

  // 收割诅咒修为
  harvestCurse: (targetId: string) => api.post('/heisha/curse/harvest', { targetId }),

  // 解除自身诅咒
  removeCurse: () => api.post('/heisha/curse/remove')
}

// 血魂幡 API (黑煞教专属)
export const bloodSoulBannerApi = {
  // 获取血魂幡状态
  getStatus: () => api.get('/blood-soul-banner/status'),

  // 升级血魂幡
  upgrade: () => api.post('/blood-soul-banner/upgrade'),

  // ========== 煞气池 ==========
  // 获取煞气池状态
  getShaPoolStatus: () => api.get('/blood-soul-banner/sha-pool'),

  // 每日献祭
  dailySacrifice: () => api.post('/blood-soul-banner/sacrifice'),

  // 化功为煞
  convertCultivation: (amount: number) => api.post('/blood-soul-banner/convert', { amount }),

  // ========== 魂魄储备 ==========
  // 获取魂魄储备
  getSoulStorage: () => api.get('/blood-soul-banner/souls'),

  // ========== 炼化槽 ==========
  // 获取炼化槽列表
  getRefinementSlots: () => api.get('/blood-soul-banner/slots'),

  // 囚禁魂魄（开始炼化）
  startRefinement: (slotIndex: number, soulType: string) => api.post('/blood-soul-banner/slots/start', { slotIndex, soulType }),

  // 安抚幡灵（维护槽位）
  maintainSlot: (slotIndex: number) => api.post('/blood-soul-banner/slots/maintain', { slotIndex }),

  // 收取精华（收取炼化产物）
  collectRefinement: (slotIndex: number) => api.post('/blood-soul-banner/slots/collect', { slotIndex }),

  // ========== PvE系统 ==========
  // 获取血洗山林状态
  getBloodForestStatus: () => api.get('/blood-soul-banner/blood-forest/status'),

  // 血洗山林
  raidBloodForest: () => api.post('/blood-soul-banner/blood-forest/raid'),

  // 获取召唤魔影状态
  getShadowSummonStatus: () => api.get('/blood-soul-banner/shadow-summon/status'),

  // 召唤魔影
  summonShadow: () => api.post('/blood-soul-banner/shadow-summon/summon')
}

// PvP API
export const pvpApi = {
  // 获取PvP状态
  getStatus: () => api.get('/pvp/status'),

  // 获取可挑战目标列表
  getTargets: (limit?: number) => api.get('/pvp/targets', { params: { limit } }),

  // 发起挑战
  challenge: (targetId: string) => api.post('/pvp/challenge', { targetId }),

  // 获取战斗历史
  getHistory: (limit?: number) => api.get('/pvp/history', { params: { limit } }),

  // ========== 神魂陨落系统 ==========
  // 获取神魂状态（神魂动荡、道心破碎、杀戮值、仇敌列表）
  getSoulStatus: () => api.get('/pvp/soul-status'),

  // 获取仇敌列表
  getEnemies: () => api.get('/pvp/enemies'),

  // 获取杀戮值
  getKillCount: () => api.get('/pvp/kill-count')
}

// 万灵宗 API (万灵宗专属)
export const wanlingApi = {
  // 获取万灵宗系统完整状态
  getStatus: () => api.get('/wanling/status'),

  // 获取灵兽列表
  getBeasts: () => api.get('/wanling/beasts'),

  // ========== 寻觅灵兽 ==========
  // 寻觅灵兽
  searchBeast: () => api.post('/wanling/search'),

  // ========== 灵兽管理 ==========
  // 喂养灵兽
  feedBeast: (beastId: string, foodId: string) => api.post('/wanling/beast/feed', { beastId, foodId }),

  // 出战灵兽
  deployBeast: (beastId: string) => api.post('/wanling/beast/deploy', { beastId }),

  // 收回灵兽
  recallBeast: (beastId: string) => api.post('/wanling/beast/recall', { beastId }),

  // 灵兽休息
  restBeast: (beastId: string) => api.post('/wanling/beast/rest', { beastId }),

  // 灵兽改名
  renameBeast: (beastId: string, newName: string) => api.post('/wanling/beast/rename', { beastId, newName }),

  // 放生灵兽
  releaseBeast: (beastId: string) => api.post('/wanling/beast/release', { beastId }),

  // 进化灵兽
  evolveBeast: (beastId: string) => api.post('/wanling/beast/evolve', { beastId }),

  // ========== 偷菜系统 ==========
  // 获取偷菜目标
  getRaidTargets: () => api.get('/wanling/raid/targets'),

  // 执行偷菜
  raidGarden: (targetId: string) => api.post('/wanling/raid', { targetId }),

  // 获取偷菜记录
  getRaidHistory: () => api.get('/wanling/raid/history'),

  // ========== 万兽渊探渊 ==========
  // 探渊（火凤之翎掉落）
  exploreAbyss: () => api.post('/wanling/abyss/explore')
}

// 落云宗 API (落云宗专属)
export const luoyunApi = {
  // 获取落云宗系统完整状态（灵树状态 + 个人贡献 + 排名）
  getStatus: () => api.get('/luoyun/status'),

  // 浇灌灵树（每日一次，消耗修为）
  waterTree: () => api.post('/luoyun/water'),

  // 献祭妖丹（增加成熟度和贡献）
  offerPill: (tier: number, count: number) => api.post('/luoyun/offer-pill', { tier, count }),

  // 参与防御入侵
  defend: () => api.post('/luoyun/defend'),

  // 领取收获奖励
  claimHarvest: () => api.post('/luoyun/harvest'),

  // 获取贡献排行榜
  getRankings: (limit?: number) => api.get('/luoyun/rankings', { params: { limit } }),

  // 使用灵眼之液（升级灵根或催熟灵草）
  useLiquid: (effect: 'root' | 'herb') => api.post('/luoyun/use-liquid', { effect }),

  // 满足当前环境需求（环境系统）
  satisfyEnvironment: () => api.post('/luoyun/satisfy-environment')
}

// 合欢宗 API (合欢宗专属)
export const hehuanApi = {
  // 获取情缘三境系统完整状态
  getStatus: () => api.get('/hehuan/status'),

  // 获取待处理的邀请
  getInvites: () => api.get('/hehuan/invites'),

  // ========== 第一层：凡尘缘 (闭关双修) ==========
  // 发起闭关双修邀请（支持道号或ID）
  inviteBasicDual: (targetName: string) => api.post('/hehuan/basic/invite', { targetName }),

  // 接受双修邀请
  acceptBasicDual: (sessionId: string) => api.post('/hehuan/basic/accept', { sessionId }),

  // 拒绝双修邀请
  rejectBasicDual: (sessionId: string) => api.post('/hehuan/basic/reject', { sessionId }),

  // ========== 第二层：同参道 (缔结同参 & 双修温养) ==========
  // 获取同参信息
  getBondInfo: () => api.get('/hehuan/bond'),

  // 发起缔结同参邀请（支持道号或ID）
  inviteSoulBond: (targetName: string) => api.post('/hehuan/bond/invite', { targetName }),

  // 接受同参契约
  acceptSoulBond: (bondId: string) => api.post('/hehuan/bond/accept', { bondId }),

  // 拒绝同参契约
  rejectSoulBond: (bondId: string) => api.post('/hehuan/bond/reject', { bondId }),

  // 发起双修温养
  initiateNourish: () => api.post('/hehuan/nourish/initiate'),

  // 接受温养邀请
  acceptNourish: (sessionId: string) => api.post('/hehuan/nourish/accept', { sessionId }),

  // ========== 第三层：魔染道 (种下心印 & 双修采补) ==========
  // 获取炉鼎列表
  getSlaves: () => api.get('/hehuan/slaves'),

  // 发起心神之战（支持道号或ID）
  initiateSoulBattle: (targetName: string) => api.post('/hehuan/soul-battle', { targetName }),

  // 采补炉鼎
  harvestSlave: (slaveId: string) => api.post('/hehuan/harvest', { slaveId }),

  // 挣脱心印（被奴役者使用）
  attemptEscape: () => api.post('/hehuan/escape'),

  // 检查是否被奴役
  checkEnslaved: () => api.get('/hehuan/enslaved')
}

// 元婴宗 API (元婴宗专属)
export const yuanyingApi = {
  // 获取元婴宗系统完整状态
  getStatus: () => api.get('/yuanying/status'),

  // 元神出窍（开始寻宝，需元婴期境界）
  startProjection: () => api.post('/yuanying/project'),

  // 元婴闭关（开始修炼，宗门专属）
  startCultivation: () => api.post('/yuanying/cultivate'),

  // 元婴归窍（召回并结算奖励）
  recallSoul: () => api.post('/yuanying/recall'),

  // 问道寻真（宗门专属，消耗修为换取随机奖励）
  seekTruth: () => api.post('/yuanying/seek-truth'),

  // 获取青元剑诀残篇状态
  getFragments: () => api.get('/yuanying/fragments'),

  // 领悟青元剑诀
  masterGreenSword: () => api.post('/yuanying/master-sword')
}

// 木人阁 API
export const woodenDummyApi = {
  // 获取木人阁状态
  getStatus: () => api.get('/dummy/status'),

  // 挑战木人傀儡
  challenge: (realmTier: number, subTier?: number) => api.post('/dummy/challenge', { realmTier, subTier }),

  // 获取战斗历史
  getHistory: (limit?: number) => api.get('/dummy/history', { params: { limit } })
}

// 阵法 API (已整合到洞府系统)
export const formationApi = {
  // 获取阵法状态
  getStatus: () => api.get('/cave/formation/status'),

  // 学习阵法
  learn: (formationId: string) => api.post('/cave/formation/learn', { formationId }),

  // 激活阵法
  activate: (formationId: string) => api.post('/cave/formation/activate', { formationId }),

  // 撤销阵法
  deactivate: () => api.post('/cave/formation/deactivate'),

  // 获取所有阵法模板
  getTemplates: () => api.get('/cave/formation/templates')
}

// 排行榜 API
export const rankingApi = {
  // 获取修为榜
  getCultivationRanking: (limit?: number, offset?: number) => api.get('/ranking/cultivation', { params: { limit, offset } }),

  // 获取恶人榜
  getEvilRanking: (limit?: number, offset?: number) => api.get('/ranking/evil', { params: { limit, offset } }),

  // 获取战力榜
  getPowerRanking: (limit?: number, offset?: number) => api.get('/ranking/power', { params: { limit, offset } }),

  // 获取PvP击杀榜
  getPvpKillsRanking: (limit?: number, offset?: number) => api.get('/ranking/pvp-kills', { params: { limit, offset } }),

  // 获取掠夺榜
  getLootRanking: (limit?: number, offset?: number) => api.get('/ranking/loot', { params: { limit, offset } }),

  // 获取我的排名
  getMyRank: (type: string) => api.get('/ranking/my-rank', { params: { type } }),

  // 获取我的所有排名
  getAllMyRanks: () => api.get('/ranking/my-ranks')
}

// 夺宝 API
export const lootApi = {
  // 获取夺宝状态
  getStatus: () => api.get('/loot/status'),

  // 获取可掠夺目标
  getTargets: (limit?: number) => api.get('/loot/targets', { params: { limit } }),

  // 执行夺宝
  attack: (targetId: string) => api.post('/loot/attack', { targetId }),

  // 获取我的掠夺统计
  getStats: () => api.get('/loot/stats')
}

// 试炼古塔 API
export const towerApi = {
  // 获取古塔状态
  getStatus: () => api.get('/tower/status'),

  // 进入古塔（从第一层开始）
  enter: () => api.post('/tower/enter'),

  // 继续闯塔（挑战当前层）
  continue: () => api.post('/tower/continue'),

  // 退出古塔
  exit: () => api.post('/tower/exit'),

  // 重置古塔（消耗修为）
  reset: () => api.post('/tower/reset'),

  // 获取琉璃塔榜
  getRanking: (limit?: number, offset?: number) => api.get('/tower/ranking', { params: { limit, offset } }),

  // 获取全服首杀记录
  getServerFirsts: () => api.get('/tower/server-firsts')
}

// 世界事件 API
export const worldEventApi = {
  // 获取近期世界事件
  getRecentEvents: (limit?: number) => api.get('/world-events/recent', { params: { limit } }),

  // 获取我的buff/debuff
  getMyBuffs: () => api.get('/world-events/my-buffs'),

  // 获取我的事件历史
  getMyHistory: (limit?: number) => api.get('/world-events/my-history', { params: { limit } }),

  // 获取修炼效率加成
  getCultivationMultiplier: () => api.get('/world-events/cultivation-multiplier')
}

// 渡劫 API
export const tribulationApi = {
  // 获取渡劫状态
  getStatus: () => api.get('/tribulation/status'),

  // 尝试筑基之劫
  attemptFoundation: () => api.post('/tribulation/foundation'),

  // 尝试结丹之劫
  attemptCoreFormation: () => api.post('/tribulation/core-formation'),

  // 尝试元婴之劫
  attemptNascentSoul: () => api.post('/tribulation/nascent-soul'),

  // 获取渡劫记录
  getRecords: (limit?: number) => api.get('/tribulation/records', { params: { limit } }),

  // 获取南宫婉奇遇状态
  getNangongWanStatus: () => api.get('/tribulation/nangong-wan/status')
}

// 万宝楼 API
export const marketApi = {
  // 获取市场挂单列表
  getListings: (params?: { page?: number; pageSize?: number; search?: string; itemType?: string }) => api.get('/market', { params }),

  // 获取我的挂单
  getMyListings: () => api.get('/market/my-listings'),

  // 获取挂单详情
  getListingDetail: (listingId: string) => api.get(`/market/listing/${listingId}`),

  // 创建挂单（上架物品）
  createListing: (data: { itemId: string; quantity: number; price: { itemId: string; quantity: number }[] }) =>
    api.post('/market/list', data),

  // 取消挂单（下架物品）
  cancelListing: (listingId: string) => api.post(`/market/cancel/${listingId}`),

  // 购买物品
  purchase: (listingId: string, quantity?: number) => api.post(`/market/purchase/${listingId}`, { quantity })
}

// 洞府 API
export const caveApi = {
  // ========== 洞府管理 ==========
  // 检查是否可以开辟洞府
  canOpen: () => api.get('/cave/can-open'),

  // 开辟洞府
  open: () => api.post('/cave/open'),

  // 获取洞府信息
  getInfo: () => api.get('/cave/info'),

  // ========== 灵脉系统 ==========
  // 收取灵气
  harvestEnergy: () => api.post('/cave/spirit-vein/harvest'),

  // 升级灵脉
  upgradeSpiritVein: () => api.post('/cave/spirit-vein/upgrade'),

  // ========== 静室系统 ==========
  // 转化灵气为修为
  convertEnergy: () => api.post('/cave/meditation/convert'),

  // 升级静室
  upgradeMeditation: () => api.post('/cave/meditation/upgrade'),

  // ========== 万宝阁 ==========
  // 获取万宝阁展示
  getTreasureDisplay: () => api.get('/cave/treasure'),

  // 上架物品到万宝阁
  displayTreasure: (inventoryItemId: string, slot: number) => api.post('/cave/treasure/display', { inventoryItemId, slot }),

  // 取下展示物品
  removeTreasure: (slot: number) => api.post('/cave/treasure/remove', { slot }),

  // ========== 景观系统 ==========
  // 获取景观画廊
  getSceneryGallery: () => api.get('/cave/scenery'),

  // 布置/取消布置景观
  toggleScenery: (sceneryId: string) => api.post('/cave/scenery/toggle', { sceneryId }),

  // ========== 访客系统 ==========
  // 获取当前访客
  getCurrentVisitor: () => api.get('/cave/visitor'),

  // 接待访客
  receiveVisitor: () => api.post('/cave/visitor/receive'),

  // 驱逐访客
  expelVisitor: () => api.post('/cave/visitor/expel'),

  // 获取访客记录
  getVisitorLogs: (page?: number) => api.get('/cave/visitor/logs', { params: { page } }),

  // ========== 社交系统 ==========
  // 拜访他人洞府
  visitCave: (targetName: string) => api.get('/cave/visit', { params: { targetName } }),

  // 留言
  leaveMessage: (targetName: string, content: string) => api.post('/cave/message', { targetName, content }),

  // 获取留言列表
  getMessages: (page?: number) => api.get('/cave/messages', { params: { page } }),

  // 标记留言已读
  markMessageRead: (messageId: string) => api.post('/cave/message/read', { messageId })
}

// 风雷翅装备系统 API
export const fengxiApi = {
  // 获取风雷翅状态
  getStatus: () => api.get('/fengxi/status'),

  // 炼化风雷翅
  refine: () => api.post('/fengxi/refine'),

  // 装备风雷翅
  equip: () => api.post('/fengxi/equip'),

  // 卸下风雷翅
  unequip: () => api.post('/fengxi/unequip'),

  // ========== 风雷降世 · 主动技能 ==========

  // 第一式：奇袭夺宝 - 无相劫掠
  usePlunder: (targetId: string) => api.post('/fengxi/skill/plunder', { targetId }),

  // 第二式：奇袭破阵 - 寂灭神雷
  useFormationBreak: (targetId: string) => api.post('/fengxi/skill/formation-break', { targetId }),

  // 第三式：奇袭瞬杀 - 血色惊雷
  useBloodThunder: (targetId: string) => api.post('/fengxi/skill/blood-thunder', { targetId })
}

// 外交系统 API
export const diplomacyApi = {
  // 获取外交状态
  getStatus: () => api.get('/diplomacy/status'),

  // 获取本宗掌门信息
  getMaster: () => api.get('/diplomacy/master'),

  // 获取所有宗门掌门列表
  getAllMasters: () => api.get('/diplomacy/masters'),

  // 获取天下大势
  getWorldSituation: () => api.get('/diplomacy/world'),

  // 设置友好关系
  setFriendly: (targetSectId: string) => api.post('/diplomacy/friendly', { targetSectId }),

  // 设置敌对关系
  setHostile: (targetSectId: string) => api.post('/diplomacy/hostile', { targetSectId }),

  // 发起结盟请求
  proposeAlliance: (targetSectId: string) => api.post('/diplomacy/alliance/propose', { targetSectId }),

  // 接受结盟请求
  acceptAlliance: (fromSectId: string) => api.post('/diplomacy/alliance/accept', { fromSectId }),

  // 解除关系（设为中立）
  cancelRelation: (targetSectId: string) => api.post('/diplomacy/cancel', { targetSectId })
}

// 副本系统 API
export const dungeonApi = {
  // ========== 房间管理 ==========
  // 获取房间列表
  getRooms: () => api.get('/dungeon/rooms'),

  // 创建房间
  createRoom: (dungeonType: string) => api.post('/dungeon/rooms', { dungeonType }),

  // 获取房间详情
  getRoomDetail: (roomId: string) => api.get(`/dungeon/rooms/${roomId}`),

  // 加入房间
  joinRoom: (roomId: string) => api.post(`/dungeon/rooms/${roomId}/join`),

  // 离开房间
  leaveRoom: (roomId: string) => api.post(`/dungeon/rooms/${roomId}/leave`),

  // 踢出成员（队长）
  kickMember: (roomId: string, characterId: string) => api.post(`/dungeon/rooms/${roomId}/kick`, { characterId }),

  // 解散房间（队长）
  disbandRoom: (roomId: string) => api.post(`/dungeon/rooms/${roomId}/disband`),

  // ========== 副本流程 ==========
  // 开始副本
  startDungeon: (roomId: string) => api.post(`/dungeon/rooms/${roomId}/start`),

  // 推进下一关
  nextStage: (roomId: string) => api.post(`/dungeon/rooms/${roomId}/next`),

  // 选择道路（第二关冰/火）
  selectPath: (roomId: string, path: 'ice' | 'fire') => api.post(`/dungeon/rooms/${roomId}/path`, { path }),

  // ========== 玩家状态 ==========
  // 获取玩家副本状态
  getStatus: () => api.get('/dungeon/status'),

  // 获取副本历史
  getHistory: (limit?: number) => api.get('/dungeon/history', { params: { limit } })
}

// 七焰扇系统 API
export const flameFanApi = {
  // 获取七焰扇状态
  getStatus: () => api.get('/flame-fan/status'),

  // 炼制火焰扇
  craft: (type: 'three_flame_fan' | 'seven_flame_fan') => api.post('/flame-fan/craft', { type }),

  // 装备火焰扇
  equip: (type: 'three_flame_fan' | 'seven_flame_fan') => api.post('/flame-fan/equip', { type }),

  // 卸下火焰扇
  unequip: () => api.post('/flame-fan/unequip')
}

export default api
