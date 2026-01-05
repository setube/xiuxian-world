import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { usePlayerStore } from './player'
import { sectApi, extractErrorMessage } from '@/api'
import {
  SECTS,
  SECT_RANKS,
  SECT_LEAVE_PENALTY,
  checkSectRequirements,
  getSectRankInfo,
  getNextRank,
  getSectTreasuryItems,
  canPurchaseTreasuryItem,
  getQualityColor,
  getQualityName,
  getItemTypeName,
  getSectBounties,
  canAcceptBounty,
  getBountyDifficultyColor,
  getBountyDifficultyName,
  getBountyTypeName,
  type Sect,
  type SectRank,
  type SectRankInfo,
  type TreasuryItem,
  type SectBounty
} from '@/game/constants/sects'

export interface SectMember {
  id: string
  name: string
  rank: SectRank
  contribution: number
  joinedAt: number
  realmTier: number
  isOnline: boolean
}

export interface MySectInfo {
  sectId: string
  rank: SectRank
  contribution: number
  joinedAt: number
  lastSalaryTime: number | null
  // 点卯系统
  lastCheckInTime: number | null
  checkInStreak: number // 连续签到天数
  // 传功系统
  lastTeachTime: number | null
  teachCountToday: number // 今日传功次数
  specialData?: Record<string, unknown> // 宗门专属数据
}

export const useSectStore = defineStore('sect', () => {
  const playerStore = usePlayerStore()

  // ==================== 状态 ====================
  const mySect = ref<MySectInfo | null>(null)
  const sectMembers = ref<SectMember[]>([])
  const totalMembers = ref(0) // 同门总数
  const leaveCooldownEnd = ref<number | null>(null)
  const loading = ref(false)

  // ==================== 计算属性 ====================

  // 当前宗门信息
  const currentSect = computed<Sect | null>(() => {
    if (!mySect.value) return null
    return SECTS[mySect.value.sectId] || null
  })

  // 当前职位信息
  const currentRankInfo = computed<SectRankInfo | null>(() => {
    if (!mySect.value) return null
    return getSectRankInfo(mySect.value.rank) || null
  })

  // 下一职位
  const nextRankInfo = computed<SectRankInfo | null>(() => {
    if (!mySect.value) return null
    return getNextRank(mySect.value.rank)
  })

  // 是否可以晋升
  const canPromote = computed(() => {
    if (!mySect.value || !nextRankInfo.value) return false
    const realmTier = playerStore.character?.realm?.tier || 1
    return mySect.value.contribution >= nextRankInfo.value.contributionRequired && realmTier >= nextRankInfo.value.realmRequired
  })

  // 是否有宗门
  const hasSect = computed(() => mySect.value !== null)

  // 是否在叛门冷却中
  const isInLeaveCooldown = computed(() => {
    if (!leaveCooldownEnd.value) return false
    return Date.now() < leaveCooldownEnd.value
  })

  // 叛门冷却剩余时间
  const leaveCooldownRemaining = computed(() => {
    if (!leaveCooldownEnd.value) return null
    const remaining = leaveCooldownEnd.value - Date.now()
    if (remaining <= 0) return null

    const hours = Math.floor(remaining / 3600000)
    const minutes = Math.floor((remaining % 3600000) / 60000)
    return `${hours}小时${minutes}分钟`
  })

  // 每日俸禄
  const dailySalary = computed(() => {
    if (!currentSect.value || !currentRankInfo.value) return 0
    let salary = currentSect.value.baseSalary * currentRankInfo.value.salaryMultiplier

    // 星宫俸禄翻倍特性
    if (currentSect.value.id === 'xinggong') {
      const salaryFeature = currentSect.value.features.find(f => f.type === 'salary')
      if (salaryFeature?.value) {
        salary *= salaryFeature.value
      }
    }

    return Math.floor(salary)
  })

  // 是否可以领取俸禄
  const canClaimSalary = computed(() => {
    if (!mySect.value) return false
    if (!mySect.value.lastSalaryTime) return true

    const lastClaim = new Date(mySect.value.lastSalaryTime)
    const now = new Date()

    // 检查是否是新的一天
    return lastClaim.getDate() !== now.getDate() || lastClaim.getMonth() !== now.getMonth() || lastClaim.getFullYear() !== now.getFullYear()
  })

  // 是否可以点卯
  const canCheckIn = computed(() => {
    if (!mySect.value) return false
    if (!mySect.value.lastCheckInTime) return true

    const lastCheckIn = new Date(mySect.value.lastCheckInTime)
    const now = new Date()

    return lastCheckIn.getDate() !== now.getDate() || lastCheckIn.getMonth() !== now.getMonth() || lastCheckIn.getFullYear() !== now.getFullYear()
  })

  // 点卯奖励计算（基于连续天数）
  const checkInReward = computed(() => {
    if (!mySect.value) return { contribution: 0, bonus: null }

    const streak = mySect.value.checkInStreak
    const realmTier = playerStore.character?.realm?.tier || 1
    // 基础贡献 = 10 + 境界*5
    let contribution = 10 + realmTier * 5

    let bonus: { type: string; description: string; value: number } | null = null

    // 连续3天奖励
    if ((streak + 1) % 3 === 0) {
      bonus = { type: 'contribution', description: '连续3天奖励', value: 50 }
    }
    // 连续7天大奖
    if ((streak + 1) % 7 === 0) {
      bonus = { type: 'spirit_stones', description: '连续7天大奖', value: 100 }
    }

    return { contribution, bonus }
  })

  // 是否可以传功（每日3次）
  const canTeach = computed(() => {
    if (!mySect.value) return false

    // 检查是否是新的一天，重置次数
    if (mySect.value.lastTeachTime) {
      const lastTeach = new Date(mySect.value.lastTeachTime)
      const now = new Date()
      const isNewDay = lastTeach.getDate() !== now.getDate() || lastTeach.getMonth() !== now.getMonth() || lastTeach.getFullYear() !== now.getFullYear()
      if (isNewDay) {
        return true // 新的一天，可以传功
      }
    }

    return mySect.value.teachCountToday < 3
  })

  // 剩余传功次数
  const remainingTeachCount = computed(() => {
    if (!mySect.value) return 0

    // 检查是否是新的一天
    if (mySect.value.lastTeachTime) {
      const lastTeach = new Date(mySect.value.lastTeachTime)
      const now = new Date()
      const isNewDay = lastTeach.getDate() !== now.getDate() || lastTeach.getMonth() !== now.getMonth() || lastTeach.getFullYear() !== now.getFullYear()
      if (isNewDay) {
        return 3
      }
    } else {
      return 3
    }

    return Math.max(0, 3 - mySect.value.teachCountToday)
  })

  // ==================== 方法 ====================

  // 获取所有宗门列表
  const getAllSects = (): Sect[] => {
    return Object.values(SECTS)
  }

  // 检查是否可以加入某宗门
  const canJoinSect = (sectId: string): { canJoin: boolean; reason?: string } => {
    const sect = SECTS[sectId]
    if (!sect) {
      return { canJoin: false, reason: '宗门不存在' }
    }

    if (hasSect.value) {
      return { canJoin: false, reason: '你已有宗门，需先叛出' }
    }

    if (isInLeaveCooldown.value) {
      return { canJoin: false, reason: `叛门冷却中，${leaveCooldownRemaining.value}后可拜入新宗门` }
    }

    const realmTier = playerStore.character?.realm?.tier || 1
    const spiritRootType = playerStore.spiritRoot?.rootType || 'waste'

    return checkSectRequirements(sect, realmTier, spiritRootType)
  }

  // 拜入宗门
  const joinSect = async (sectId: string): Promise<{ success: boolean; message: string }> => {
    const check = canJoinSect(sectId)
    if (!check.canJoin) {
      return { success: false, message: check.reason || '无法拜入' }
    }

    loading.value = true

    try {
      const { data } = await sectApi.join(sectId)

      // 更新本地状态
      mySect.value = {
        sectId,
        rank: 'outer',
        contribution: 0,
        joinedAt: Date.now(),
        lastSalaryTime: null,
        lastCheckInTime: null,
        checkInStreak: 0,
        lastTeachTime: null,
        teachCountToday: 0
      }

      leaveCooldownEnd.value = null

      return { success: true, message: `成功拜入${data.sect?.name || '宗门'}！` }
    } catch (error: unknown) {
      console.error('拜入宗门失败:', error)
      return { success: false, message: extractErrorMessage(error, '拜入失败，请稍后再试') }
    } finally {
      loading.value = false
    }
  }

  // 叛出宗门
  const leaveSect = async (): Promise<{ success: boolean; message: string; penalties?: string[] }> => {
    if (!mySect.value) {
      return { success: false, message: '你尚无宗门' }
    }

    loading.value = true

    try {
      const { data } = await sectApi.leave()

      // 设置冷却时间
      leaveCooldownEnd.value = Date.now() + SECT_LEAVE_PENALTY.cooldownHours * 3600000
      saveCooldown()

      // 清空宗门数据
      mySect.value = null
      sectMembers.value = []

      return {
        success: true,
        message: data.penalty || '已叛出宗门',
        penalties: [data.penalty]
      }
    } catch (error: unknown) {
      console.error('叛出宗门失败:', error)
      return { success: false, message: extractErrorMessage(error, '叛出失败，请稍后再试') }
    } finally {
      loading.value = false
    }
  }

  // 领取俸禄
  const claimSalary = async (): Promise<{ success: boolean; amount: number; message: string }> => {
    if (!canClaimSalary.value) {
      return { success: false, amount: 0, message: '今日已领取俸禄' }
    }

    loading.value = true

    try {
      const { data } = await sectApi.claimSalary()

      if (mySect.value) {
        mySect.value.lastSalaryTime = Date.now()
        mySect.value.contribution += 10 // 签到增加贡献
      }

      // 刷新玩家数据以更新灵石
      await playerStore.fetchStats()

      return { success: true, amount: data.amount, message: `领取俸禄 ${data.amount} 灵石` }
    } catch (error: unknown) {
      console.error('领取俸禄失败:', error)
      return { success: false, amount: 0, message: extractErrorMessage(error, '领取失败，请稍后再试') }
    } finally {
      loading.value = false
    }
  }

  // 宗门点卯
  const checkIn = async (): Promise<{ success: boolean; message: string; contribution: number; bonus?: { type: string; description: string; value: number } }> => {
    if (!canCheckIn.value) {
      return { success: false, message: '今日已点卯', contribution: 0 }
    }

    loading.value = true

    try {
      const { data } = await sectApi.checkIn()

      if (mySect.value) {
        // 使用展开运算符确保响应式更新
        mySect.value = {
          ...mySect.value,
          lastCheckInTime: Date.now(),
          checkInStreak: data.streak,
          contribution: mySect.value.contribution + data.contribution + (data.bonus?.type === 'contribution' ? data.bonus.value : 0)
        }
      }

      // 如果有灵石奖励，刷新玩家数据
      if (data.bonus?.type === 'spirit_stones') {
        await playerStore.fetchStats()
      }

      let message = `点卯成功！获得 ${data.contribution} 贡献`
      if (data.bonus) {
        message += `，${data.bonus.description}！`
      }

      return {
        success: true,
        message,
        contribution: data.contribution,
        bonus: data.bonus
      }
    } catch (error: unknown) {
      console.error('点卯失败:', error)
      return { success: false, message: extractErrorMessage(error, '点卯失败，请稍后再试'), contribution: 0 }
    } finally {
      loading.value = false
    }
  }

  // 宗门传功
  const teach = async (): Promise<{ success: boolean; message: string; contribution: number }> => {
    if (!canTeach.value) {
      return { success: false, message: '今日传功次数已用完', contribution: 0 }
    }

    loading.value = true

    try {
      const { data } = await sectApi.teach()

      if (mySect.value) {
        mySect.value.lastTeachTime = Date.now()
        mySect.value.teachCountToday = data.teachCount
        mySect.value.contribution += data.contribution
      }

      return {
        success: true,
        message: `传功成功！获得 ${data.contribution} 贡献，今日剩余 ${3 - data.teachCount} 次`,
        contribution: data.contribution
      }
    } catch (error: unknown) {
      console.error('传功失败:', error)
      return { success: false, message: extractErrorMessage(error, '传功失败，请稍后再试'), contribution: 0 }
    } finally {
      loading.value = false
    }
  }

  // 增加贡献
  const addContribution = (amount: number) => {
    if (mySect.value) {
      mySect.value.contribution += amount
    }
  }

  // 晋升职位
  const promote = async (): Promise<{ success: boolean; message: string }> => {
    if (!canPromote.value || !nextRankInfo.value) {
      return { success: false, message: '不满足晋升条件' }
    }

    loading.value = true

    try {
      const { data } = await sectApi.promote()

      if (mySect.value && nextRankInfo.value) {
        mySect.value.rank = data.newRank as SectRank
        mySect.value.contribution -= nextRankInfo.value.contributionRequired
      }

      return { success: true, message: `晋升为${data.newRankName}！` }
    } catch (error: unknown) {
      console.error('晋升失败:', error)
      return { success: false, message: extractErrorMessage(error, '晋升失败，请稍后再试') }
    } finally {
      loading.value = false
    }
  }

  // 加载宗门同门（分页）
  const loadSectMembers = async (page: number = 1, pageSize: number = 10) => {
    if (!mySect.value) return

    loading.value = true

    try {
      const { data } = await sectApi.getMembers(page, pageSize)

      sectMembers.value = data.members.map(
        (m: { id: string; name: string; rank: string; contribution: number; joinedAt: number; realmName: string }) => ({
          id: m.id,
          name: m.name,
          rank: m.rank as SectRank,
          contribution: m.contribution,
          joinedAt: m.joinedAt,
          realmTier: 1, // 从realmName解析或默认值
          isOnline: false // TODO: 后续实现在线状态
        })
      )
      totalMembers.value = data.total || 0
    } catch (error) {
      console.error('加载同门失败:', error)
    } finally {
      loading.value = false
    }
  }

  // 初始化
  const init = async () => {
    loading.value = true

    try {
      const { data } = await sectApi.getStatus()

      if (data.hasSect && data.sect) {
        mySect.value = {
          sectId: data.sect.id,
          rank: data.rank as SectRank,
          contribution: data.contribution,
          joinedAt: data.joinedAt,
          lastSalaryTime: data.lastSalaryTime,
          lastCheckInTime: data.lastCheckInTime || null,
          checkInStreak: data.checkInStreak || 0,
          lastTeachTime: data.lastTeachTime || null,
          teachCountToday: data.teachCountToday || 0
        }
      } else {
        mySect.value = null
      }

      // 更新冷却时间
      if (data.leaveCooldownEnd) {
        leaveCooldownEnd.value = data.leaveCooldownEnd
        saveCooldown()
      } else {
        leaveCooldownEnd.value = null
        localStorage.removeItem('sectLeaveCooldown')
      }
    } catch (error) {
      console.error('加载宗门数据失败:', error)

      // 从 localStorage 恢复冷却时间作为后备
      const savedCooldown = localStorage.getItem('sectLeaveCooldown')
      if (savedCooldown) {
        const cooldownEnd = parseInt(savedCooldown)
        if (cooldownEnd > Date.now()) {
          leaveCooldownEnd.value = cooldownEnd
        } else {
          localStorage.removeItem('sectLeaveCooldown')
        }
      }
    } finally {
      loading.value = false
    }
  }

  // 保存冷却时间到 localStorage
  const saveCooldown = () => {
    if (leaveCooldownEnd.value) {
      localStorage.setItem('sectLeaveCooldown', leaveCooldownEnd.value.toString())
    }
  }

  // ==================== 宝库系统 ====================

  // 宝库物品购买记录（用于限购检查）
  const treasuryPurchaseRecord = ref<Record<string, { daily: number; total: number; lastDate: string }>>({})

  // 获取宝库物品列表
  const getTreasuryItems = (): TreasuryItem[] => {
    if (!mySect.value) return []
    return getSectTreasuryItems(mySect.value.sectId)
  }

  // 检查物品是否可购买
  const canBuyItem = (item: TreasuryItem): { canBuy: boolean; reason?: string } => {
    if (!mySect.value) return { canBuy: false, reason: '未加入宗门' }

    const realmTier = playerStore.character?.realm?.tier || 1
    const result = canPurchaseTreasuryItem(item, mySect.value.rank, realmTier, mySect.value.contribution)

    if (!result.canBuy) return result

    // 检查每日限购
    const record = treasuryPurchaseRecord.value[item.id]
    const today = new Date().toDateString()

    if (item.limitPerDay) {
      const dailyCount = record?.lastDate === today ? record.daily : 0
      if (dailyCount >= item.limitPerDay) {
        return { canBuy: false, reason: `今日已达购买上限(${item.limitPerDay})` }
      }
    }

    // 检查总限购
    if (item.limitTotal) {
      const totalCount = record?.total || 0
      if (totalCount >= item.limitTotal) {
        return { canBuy: false, reason: `已达总购买上限(${item.limitTotal})` }
      }
    }

    return { canBuy: true }
  }

  // 购买宝库物品
  const purchaseTreasuryItem = async (itemId: string, quantity: number = 1): Promise<{ success: boolean; message: string }> => {
    const items = getTreasuryItems()
    const item = items.find(i => i.id === itemId)

    if (!item) {
      return { success: false, message: '物品不存在' }
    }

    const check = canBuyItem(item)
    if (!check.canBuy) {
      return { success: false, message: check.reason || '无法购买' }
    }

    loading.value = true

    try {
      const { data } = await sectApi.purchaseTreasuryItem(itemId, quantity)

      // 更新贡献度
      if (mySect.value) {
        mySect.value.contribution -= item.contributionCost * quantity
      }

      // 更新购买记录
      const today = new Date().toDateString()
      const record = treasuryPurchaseRecord.value[itemId] || { daily: 0, total: 0, lastDate: '' }

      treasuryPurchaseRecord.value[itemId] = {
        daily: record.lastDate === today ? record.daily + quantity : quantity,
        total: record.total + quantity,
        lastDate: today
      }

      // 刷新玩家数据（物品可能影响灵石、经验等）
      await playerStore.fetchStats()

      return { success: true, message: data.message || `成功购买 ${item.name} x${quantity}` }
    } catch (error: unknown) {
      console.error('购买物品失败:', error)
      return { success: false, message: extractErrorMessage(error, '购买失败，请稍后再试') }
    } finally {
      loading.value = false
    }
  }

  // ==================== 捐献系统 ====================

  // 捐献灵石
  const donate = async (amount: number): Promise<{ success: boolean; message: string; contributionGained?: number }> => {
    if (!mySect.value) {
      return { success: false, message: '未加入宗门' }
    }

    if (amount <= 0) {
      return { success: false, message: '捐献数量必须大于0' }
    }

    const spiritStones = Number(playerStore.character?.spiritStones || 0)
    if (spiritStones < amount) {
      return { success: false, message: '灵石不足' }
    }

    loading.value = true

    try {
      const { data } = await sectApi.donate(amount)

      // 更新贡献度
      if (mySect.value && data.contributionGained) {
        mySect.value.contribution += data.contributionGained
      }

      // 刷新玩家数据
      await playerStore.fetchStats()

      return {
        success: true,
        message: data.message || `捐献 ${amount} 灵石，获得 ${data.contributionGained} 贡献`,
        contributionGained: data.contributionGained
      }
    } catch (error: unknown) {
      console.error('捐献失败:', error)
      return { success: false, message: extractErrorMessage(error, '捐献失败，请稍后再试') }
    } finally {
      loading.value = false
    }
  }

  // 计算捐献获得的贡献（10灵石 = 1贡献）
  const calculateDonationContribution = (amount: number): number => {
    return Math.floor(amount / 10)
  }

  // ==================== 悬赏系统 ====================

  // 悬赏状态接口
  interface BountyProgress {
    bountyId: string
    progress: number // 当前进度
    acceptedAt: number // 接受时间
    status: 'active' | 'completed' | 'expired'
  }

  // 活跃悬赏列表
  const activeBounties = ref<BountyProgress[]>([])

  // 已完成悬赏（今日/本周）
  const completedBountyIds = ref<string[]>([])

  // 获取可用悬赏列表
  const getAvailableBounties = (): (SectBounty & { canAccept: boolean; reason?: string; isActive: boolean; isCompleted: boolean })[] => {
    if (!mySect.value) return []

    const bounties = getSectBounties(mySect.value.sectId)
    const realmTier = playerStore.character?.realm?.tier || 1

    return bounties.map(bounty => {
      const check = canAcceptBounty(bounty, mySect.value!.rank, realmTier)
      const isActive = activeBounties.value.some(b => b.bountyId === bounty.id)
      const isCompleted = completedBountyIds.value.includes(bounty.id)

      return {
        ...bounty,
        canAccept: check.canAccept && !isActive && !isCompleted,
        reason: isActive ? '任务进行中' : isCompleted ? '已完成' : check.reason,
        isActive,
        isCompleted
      }
    })
  }

  // 获取活跃悬赏
  const getActiveBounties = (): (SectBounty & BountyProgress)[] => {
    if (!mySect.value) return []

    const bounties = getSectBounties(mySect.value.sectId)

    return activeBounties.value.map(progress => {
      const bounty = bounties.find(b => b.id === progress.bountyId)
      if (!bounty) return null
      return { ...bounty, ...progress }
    }).filter(Boolean) as (SectBounty & BountyProgress)[]
  }

  // 接受悬赏
  const acceptBounty = async (bountyId: string): Promise<{ success: boolean; message: string }> => {
    if (!mySect.value) {
      return { success: false, message: '未加入宗门' }
    }

    // 检查是否已接受
    if (activeBounties.value.some(b => b.bountyId === bountyId)) {
      return { success: false, message: '已接受此悬赏' }
    }

    // 检查是否已完成
    if (completedBountyIds.value.includes(bountyId)) {
      return { success: false, message: '今日已完成此悬赏' }
    }

    loading.value = true

    try {
      const { data } = await sectApi.acceptBounty(bountyId)

      // 添加到活跃列表
      activeBounties.value.push({
        bountyId,
        progress: 0,
        acceptedAt: Date.now(),
        status: 'active'
      })

      return { success: true, message: data.message || '成功接受悬赏' }
    } catch (error: unknown) {
      console.error('接受悬赏失败:', error)
      return { success: false, message: extractErrorMessage(error, '接受失败，请稍后再试') }
    } finally {
      loading.value = false
    }
  }

  // 提交悬赏
  const submitBounty = async (bountyId: string): Promise<{ success: boolean; message: string; rewards?: { contribution: number; spiritStones?: number; experience?: number } }> => {
    if (!mySect.value) {
      return { success: false, message: '未加入宗门' }
    }

    loading.value = true

    try {
      const { data } = await sectApi.submitBounty(bountyId)

      // 从活跃列表移除
      activeBounties.value = activeBounties.value.filter(b => b.bountyId !== bountyId)

      // 添加到已完成列表
      completedBountyIds.value.push(bountyId)

      // 更新贡献
      if (mySect.value && data.rewards?.contribution) {
        mySect.value.contribution += data.rewards.contribution
      }

      // 刷新玩家数据
      await playerStore.fetchStats()

      return {
        success: true,
        message: data.message || '悬赏完成！',
        rewards: data.rewards
      }
    } catch (error: unknown) {
      console.error('提交悬赏失败:', error)
      return { success: false, message: extractErrorMessage(error, '提交失败，请稍后再试') }
    } finally {
      loading.value = false
    }
  }

  // 放弃悬赏
  const abandonBounty = async (bountyId: string): Promise<{ success: boolean; message: string }> => {
    if (!mySect.value) {
      return { success: false, message: '未加入宗门' }
    }

    loading.value = true

    try {
      const { data } = await sectApi.abandonBounty(bountyId)

      // 从活跃列表移除
      activeBounties.value = activeBounties.value.filter(b => b.bountyId !== bountyId)

      return { success: true, message: data.message || '已放弃悬赏' }
    } catch (error: unknown) {
      console.error('放弃悬赏失败:', error)
      return { success: false, message: extractErrorMessage(error, '放弃失败，请稍后再试') }
    } finally {
      loading.value = false
    }
  }

  // 更新悬赏进度（由其他系统调用）
  const updateBountyProgress = (bountyId: string, progress: number) => {
    const bounty = activeBounties.value.find(b => b.bountyId === bountyId)
    if (bounty) {
      bounty.progress = progress
    }
  }

  // 加载悬赏数据
  const loadBounties = async () => {
    if (!mySect.value) return

    loading.value = true

    try {
      const { data } = await sectApi.getBounties()

      if (data.activeBounties) {
        activeBounties.value = data.activeBounties
      }

      if (data.completedBountyIds) {
        completedBountyIds.value = data.completedBountyIds
      }
    } catch (error) {
      console.error('加载悬赏数据失败:', error)
    } finally {
      loading.value = false
    }
  }

  return {
    // 状态
    mySect,
    sectMembers,
    totalMembers,
    leaveCooldownEnd,
    loading,

    // 计算属性
    currentSect,
    currentRankInfo,
    nextRankInfo,
    canPromote,
    hasSect,
    isInLeaveCooldown,
    leaveCooldownRemaining,
    dailySalary,
    canClaimSalary,
    canCheckIn,
    checkInReward,
    canTeach,
    remainingTeachCount,

    // 常量
    SECT_RANKS,

    // 方法
    getAllSects,
    canJoinSect,
    joinSect,
    leaveSect,
    claimSalary,
    checkIn,
    teach,
    addContribution,
    promote,
    loadSectMembers,
    init,
    saveCooldown,

    // 宝库系统
    getTreasuryItems,
    canBuyItem,
    purchaseTreasuryItem,
    getQualityColor,
    getQualityName,
    getItemTypeName,

    // 捐献系统
    donate,
    calculateDonationContribution,

    // 悬赏系统
    activeBounties,
    completedBountyIds,
    getAvailableBounties,
    getActiveBounties,
    acceptBounty,
    submitBounty,
    abandonBounty,
    updateBountyProgress,
    loadBounties,
    getBountyDifficultyColor,
    getBountyDifficultyName,
    getBountyTypeName
  }
})
