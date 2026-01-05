import { AppDataSource } from '../config/database'
import { Character } from '../models/Character'
import {
  SECTS,
  SECT_RANKS,
  SECT_LEAVE_PENALTY,
  checkSectRequirements,
  getSectRankInfo,
  getNextRank,
  calculateDailySalary,
  getSectTreasuryItems,
  canPurchaseTreasuryItem,
  getSectBounties,
  canAcceptBounty,
  type Sect,
  type SectRank,
  type TreasuryItem,
  type SectBounty
} from '../game/constants/sects'
import { SPIRIT_ROOTS } from '../game/constants/spiritRoots'
import { inventoryService } from './inventory.service'

const characterRepository = AppDataSource.getRepository(Character)

// 一天的毫秒数
const ONE_DAY_MS = 24 * 60 * 60 * 1000

export interface SectMemberInfo {
  id: string
  name: string
  rank: string
  rankName: string
  contribution: number
  realmName: string
  joinedAt: number
}

export class SectService {
  // 获取宗门状态
  async getSectStatus(characterId: string) {
    const character = await characterRepository.findOne({
      where: { id: characterId },
      relations: ['realm']
    })

    if (!character) {
      throw new Error('角色不存在')
    }

    const spiritRoot = SPIRIT_ROOTS[character.spiritRootId]
    const realmTier = character.realm?.tier || 1

    // 如果已加入宗门
    if (character.sectId && SECTS[character.sectId]) {
      const sect = SECTS[character.sectId]
      const rankInfo = getSectRankInfo(character.sectRank as SectRank)
      const nextRank = getNextRank(character.sectRank as SectRank)
      const dailySalary = calculateDailySalary(sect, character.sectRank as SectRank)

      // 检查是否可以领取俸禄（使用日历日判断）
      const today = new Date().toDateString()
      const lastSalary = character.lastSalaryTime ? Number(character.lastSalaryTime) : 0
      const lastSalaryDate = lastSalary > 0 ? new Date(lastSalary).toDateString() : null
      const canClaimSalary = lastSalaryDate !== today

      // 检查是否可以晋升
      let canPromote = false
      let promoteReason = ''
      if (nextRank) {
        if (character.sectContribution < nextRank.contributionRequired) {
          promoteReason = `贡献不足，需要${nextRank.contributionRequired}`
        } else if (realmTier < nextRank.realmRequired) {
          promoteReason = `境界不足，需要达到对应境界`
        } else {
          canPromote = true
        }
      }

      return {
        hasSect: true,
        sect,
        rank: character.sectRank,
        rankInfo,
        contribution: character.sectContribution,
        joinedAt: character.sectJoinedAt ? Number(character.sectJoinedAt) : null,
        dailySalary,
        canClaimSalary,
        lastSalaryTime: lastSalary || null,
        nextRank,
        canPromote,
        promoteReason: canPromote ? undefined : promoteReason,
        leaveCooldownEnd: character.sectLeaveCooldownEnd ? Number(character.sectLeaveCooldownEnd) : null,
        // 点卯相关
        lastCheckInTime: character.lastCheckInTime ? Number(character.lastCheckInTime) : null,
        checkInStreak: character.checkInStreak || 0,
        // 传功相关
        lastTeachTime: character.lastTeachTime ? Number(character.lastTeachTime) : null,
        teachCountToday: character.teachCountToday || 0
      }
    }

    // 未加入宗门，返回可加入的宗门列表
    const availableSects = Object.values(SECTS).map(sect => {
      const check = checkSectRequirements(sect, realmTier, spiritRoot?.rootType || '')
      return {
        ...sect,
        canJoin: check.canJoin,
        joinReason: check.reason
      }
    })

    // 检查叛门冷却
    const now = Date.now()
    const leaveCooldownEnd = character.sectLeaveCooldownEnd ? Number(character.sectLeaveCooldownEnd) : null
    const inCooldown = leaveCooldownEnd ? now < leaveCooldownEnd : false

    return {
      hasSect: false,
      availableSects,
      inCooldown,
      leaveCooldownEnd: inCooldown ? leaveCooldownEnd : null
    }
  }

  // 加入宗门
  async joinSect(characterId: string, sectId: string): Promise<{ success: boolean; sect: Sect }> {
    const character = await characterRepository.findOne({
      where: { id: characterId },
      relations: ['realm']
    })

    if (!character) {
      throw new Error('角色不存在')
    }

    // 检查是否已有宗门
    if (character.sectId) {
      throw new Error('你已经是宗门弟子，请先叛门')
    }

    // 检查宗门是否存在
    const sect = SECTS[sectId]
    if (!sect) {
      throw new Error('宗门不存在')
    }

    // 检查叛门冷却
    const now = Date.now()
    if (character.sectLeaveCooldownEnd && now < Number(character.sectLeaveCooldownEnd)) {
      const remaining = Math.ceil((Number(character.sectLeaveCooldownEnd) - now) / (60 * 60 * 1000))
      throw new Error(`叛门冷却中，还需等待${remaining}小时`)
    }

    // 检查入门条件
    const spiritRoot = SPIRIT_ROOTS[character.spiritRootId]
    const realmTier = character.realm?.tier || 1
    const check = checkSectRequirements(sect, realmTier, spiritRoot?.rootType || '')

    if (!check.canJoin) {
      throw new Error(check.reason || '不满足入门条件')
    }

    // 加入宗门
    character.sectId = sectId
    character.sectRank = 'outer'
    character.sectContribution = 0
    character.sectJoinedAt = now
    character.sectLeaveCooldownEnd = null

    await characterRepository.save(character)

    return { success: true, sect }
  }

  // 叛门
  async leaveSect(characterId: string): Promise<{ success: boolean; penalty: string }> {
    const character = await characterRepository.findOne({
      where: { id: characterId }
    })

    if (!character) {
      throw new Error('角色不存在')
    }

    if (!character.sectId) {
      throw new Error('你还没有加入任何宗门')
    }

    const sect = SECTS[character.sectId]
    const sectName = sect?.name || '宗门'

    // 计算惩罚
    const penalties: string[] = []

    // 清空贡献
    if (character.sectContribution > 0) {
      penalties.push(`失去${character.sectContribution}贡献`)
    }

    // 特殊惩罚
    const specialPenalty = SECT_LEAVE_PENALTY.specialPenalties[character.sectId]
    if (specialPenalty) {
      penalties.push(specialPenalty)
    }

    // 设置冷却
    const cooldownMs = SECT_LEAVE_PENALTY.cooldownHours * 60 * 60 * 1000
    character.sectLeaveCooldownEnd = Date.now() + cooldownMs

    // 清除宗门数据
    character.sectId = null
    character.sectRank = 'outer'
    character.sectContribution = 0
    character.sectJoinedAt = null
    character.lastSalaryTime = null

    await characterRepository.save(character)

    const penaltyText = penalties.length > 0 ? `叛出${sectName}，${penalties.join('，')}` : `叛出${sectName}`

    return { success: true, penalty: penaltyText }
  }

  // 领取俸禄
  async claimSalary(characterId: string): Promise<{ success: boolean; amount: number }> {
    const character = await characterRepository.findOne({
      where: { id: characterId }
    })

    if (!character) {
      throw new Error('角色不存在')
    }

    if (!character.sectId) {
      throw new Error('你还没有加入任何宗门')
    }

    const sect = SECTS[character.sectId]
    if (!sect) {
      throw new Error('宗门数据异常')
    }

    // 检查是否可以领取（使用日历日判断，而不是24小时滚动窗口）
    const now = Date.now()
    const today = new Date().toDateString()
    const lastSalary = character.lastSalaryTime ? Number(character.lastSalaryTime) : 0
    const lastSalaryDate = lastSalary > 0 ? new Date(lastSalary).toDateString() : null
    if (lastSalaryDate === today) {
      throw new Error('今日俸禄已领取')
    }

    // 计算俸禄
    const salary = calculateDailySalary(sect, character.sectRank as SectRank)

    // 发放俸禄
    character.spiritStones = Number(character.spiritStones) + salary
    character.lastSalaryTime = now

    // 增加一点贡献（日常签到）
    character.sectContribution += 10

    await characterRepository.save(character)

    return { success: true, amount: salary }
  }

  // 晋升
  async promote(characterId: string): Promise<{ success: boolean; newRank: string; newRankName: string }> {
    const character = await characterRepository.findOne({
      where: { id: characterId },
      relations: ['realm']
    })

    if (!character) {
      throw new Error('角色不存在')
    }

    if (!character.sectId) {
      throw new Error('你还没有加入任何宗门')
    }

    const nextRank = getNextRank(character.sectRank as SectRank)
    if (!nextRank) {
      throw new Error('你已是最高职位')
    }

    // 检查贡献
    if (character.sectContribution < nextRank.contributionRequired) {
      throw new Error(`贡献不足，需要${nextRank.contributionRequired}`)
    }

    // 检查境界
    const realmTier = character.realm?.tier || 1
    if (realmTier < nextRank.realmRequired) {
      throw new Error('境界不足')
    }

    // 扣除贡献并晋升
    character.sectContribution -= nextRank.contributionRequired
    character.sectRank = nextRank.id

    await characterRepository.save(character)

    return {
      success: true,
      newRank: nextRank.id,
      newRankName: nextRank.name
    }
  }

  // 增加贡献（由其他系统调用，如完成任务、炼丹等）
  async addContribution(characterId: string, amount: number): Promise<number> {
    const character = await characterRepository.findOne({
      where: { id: characterId }
    })

    if (!character || !character.sectId) {
      return 0
    }

    character.sectContribution += amount
    await characterRepository.save(character)

    return character.sectContribution
  }

  // 获取宗门成员列表（分页）
  async getSectMembers(sectId: string, page: number = 1, pageSize: number = 10): Promise<SectMemberInfo[]> {
    const skip = (page - 1) * pageSize

    const members = await characterRepository.find({
      where: { sectId },
      relations: ['realm'],
      order: {
        sectContribution: 'DESC'
      },
      skip,
      take: pageSize
    })

    return members.map(member => {
      const rankInfo = getSectRankInfo(member.sectRank as SectRank)
      return {
        id: member.id,
        name: member.name,
        rank: member.sectRank,
        rankName: rankInfo?.name || '弟子',
        contribution: member.sectContribution,
        realmName: member.realm?.name || '未知',
        joinedAt: member.sectJoinedAt ? Number(member.sectJoinedAt) : 0
      }
    })
  }

  // 获取宗门人数统计
  async getSectMemberCount(sectId: string): Promise<number> {
    return await characterRepository.count({
      where: { sectId }
    })
  }

  // 检查是否为同一天
  private isSameDay(timestamp1: number, timestamp2: number): boolean {
    const date1 = new Date(timestamp1)
    const date2 = new Date(timestamp2)
    return date1.getFullYear() === date2.getFullYear() && date1.getMonth() === date2.getMonth() && date1.getDate() === date2.getDate()
  }

  // 检查是否为连续的一天（昨天）
  private isConsecutiveDay(lastTime: number, currentTime: number): boolean {
    const lastDate = new Date(lastTime)
    const currentDate = new Date(currentTime)

    // 设置为当天0点
    lastDate.setHours(0, 0, 0, 0)
    currentDate.setHours(0, 0, 0, 0)

    const diffDays = (currentDate.getTime() - lastDate.getTime()) / ONE_DAY_MS
    return diffDays === 1
  }

  // 宗门点卯
  async checkIn(characterId: string): Promise<{
    success: boolean
    contribution: number
    streak: number
    bonus?: { type: string; description: string; value: number }
  }> {
    const character = await characterRepository.findOne({
      where: { id: characterId },
      relations: ['realm']
    })

    if (!character) {
      throw new Error('角色不存在')
    }

    if (!character.sectId) {
      throw new Error('你还没有加入任何宗门')
    }

    const now = Date.now()
    const lastCheckIn = character.lastCheckInTime ? Number(character.lastCheckInTime) : 0

    // 检查今日是否已点卯
    if (lastCheckIn > 0 && this.isSameDay(lastCheckIn, now)) {
      throw new Error('今日已点卯')
    }

    // 计算连续点卯
    let newStreak = 1
    if (lastCheckIn > 0 && this.isConsecutiveDay(lastCheckIn, now)) {
      newStreak = character.checkInStreak + 1
    }

    // 计算基础贡献 = 10 + 境界*5
    const realmTier = character.realm?.tier || 1
    let contribution = 10 + realmTier * 5

    // 检查连续奖励
    let bonus: { type: string; description: string; value: number } | undefined

    // 连续7天大奖（优先检查）
    if (newStreak % 7 === 0) {
      bonus = { type: 'spirit_stones', description: '连续7天大奖', value: 100 }
      character.spiritStones = Number(character.spiritStones) + 100
    }
    // 连续3天奖励
    else if (newStreak % 3 === 0) {
      bonus = { type: 'contribution', description: '连续3天奖励', value: 50 }
      contribution += 50
    }

    // 更新角色数据
    character.lastCheckInTime = now
    character.checkInStreak = newStreak
    character.sectContribution += contribution

    await characterRepository.save(character)

    return {
      success: true,
      contribution,
      streak: newStreak,
      bonus
    }
  }

  // 宗门传功
  async teach(characterId: string): Promise<{
    success: boolean
    contribution: number
    teachCount: number
  }> {
    const character = await characterRepository.findOne({
      where: { id: characterId },
      relations: ['realm']
    })

    if (!character) {
      throw new Error('角色不存在')
    }

    if (!character.sectId) {
      throw new Error('你还没有加入任何宗门')
    }

    const now = Date.now()
    const lastTeach = character.lastTeachTime ? Number(character.lastTeachTime) : 0

    // 检查是否是新的一天，重置次数
    let todayCount = character.teachCountToday || 0
    if (lastTeach > 0 && !this.isSameDay(lastTeach, now)) {
      todayCount = 0
    }

    // 检查今日传功次数
    if (todayCount >= 3) {
      throw new Error('今日传功次数已用完')
    }

    // 计算贡献 = 15 + 境界*3
    const realmTier = character.realm?.tier || 1
    const contribution = 15 + realmTier * 3

    // 更新角色数据
    character.lastTeachTime = now
    character.teachCountToday = todayCount + 1
    character.sectContribution += contribution

    await characterRepository.save(character)

    return {
      success: true,
      contribution,
      teachCount: character.teachCountToday
    }
  }

  // 获取宝库物品列表
  async getTreasuryItems(characterId: string): Promise<{
    items: (TreasuryItem & { canBuy: boolean; reason?: string; purchasedToday: number; purchasedTotal: number })[]
    contribution: number
  }> {
    const character = await characterRepository.findOne({
      where: { id: characterId },
      relations: ['realm']
    })

    if (!character) {
      throw new Error('角色不存在')
    }

    if (!character.sectId) {
      throw new Error('你还没有加入任何宗门')
    }

    // 获取宝库物品
    const items = getSectTreasuryItems(character.sectId)
    const realmTier = character.realm?.tier || 1

    // 获取购买记录
    const purchaseRecord = character.treasuryPurchaseRecord || {}
    const today = new Date().toDateString()

    // 处理每个物品
    const itemsWithStatus = items.map(item => {
      const record = purchaseRecord[item.id] || { daily: 0, total: 0, lastDate: '' }

      // 如果日期不同，重置每日购买数
      const purchasedToday = record.lastDate === today ? record.daily : 0
      const purchasedTotal = record.total || 0

      // 检查是否可以购买
      let canBuyResult = canPurchaseTreasuryItem(item, character.sectRank as SectRank, realmTier, character.sectContribution)

      // 额外检查每日限购
      if (canBuyResult.canBuy && item.limitPerDay && purchasedToday >= item.limitPerDay) {
        canBuyResult = { canBuy: false, reason: '今日已达购买上限' }
      }

      // 额外检查总限购
      if (canBuyResult.canBuy && item.limitTotal && purchasedTotal >= item.limitTotal) {
        canBuyResult = { canBuy: false, reason: '已达总购买上限' }
      }

      return {
        ...item,
        canBuy: canBuyResult.canBuy,
        reason: canBuyResult.reason,
        purchasedToday,
        purchasedTotal
      }
    })

    return {
      items: itemsWithStatus,
      contribution: character.sectContribution
    }
  }

  // 购买宝库物品
  async purchaseTreasuryItem(
    characterId: string,
    itemId: string,
    quantity: number = 1
  ): Promise<{
    success: boolean
    item: TreasuryItem
    quantity: number
    contributionSpent: number
    remainingContribution: number
  }> {
    const character = await characterRepository.findOne({
      where: { id: characterId },
      relations: ['realm']
    })

    if (!character) {
      throw new Error('角色不存在')
    }

    if (!character.sectId) {
      throw new Error('你还没有加入任何宗门')
    }

    // 获取物品
    const items = getSectTreasuryItems(character.sectId)
    const item = items.find(i => i.id === itemId)

    if (!item) {
      throw new Error('物品不存在')
    }

    // 检查数量
    if (quantity < 1) {
      throw new Error('购买数量无效')
    }

    const realmTier = character.realm?.tier || 1

    // 检查是否可以购买
    const canBuyResult = canPurchaseTreasuryItem(item, character.sectRank as SectRank, realmTier, character.sectContribution)

    if (!canBuyResult.canBuy) {
      throw new Error(canBuyResult.reason || '无法购买')
    }

    // 获取购买记录
    const purchaseRecord = character.treasuryPurchaseRecord || {}
    const today = new Date().toDateString()
    const record = purchaseRecord[itemId] || { daily: 0, total: 0, lastDate: '' }

    // 如果日期不同，重置每日购买数
    const purchasedToday = record.lastDate === today ? record.daily : 0
    const purchasedTotal = record.total || 0

    // 检查每日限购
    if (item.limitPerDay) {
      const canBuyToday = item.limitPerDay - purchasedToday
      if (canBuyToday <= 0) {
        throw new Error('今日已达购买上限')
      }
      if (quantity > canBuyToday) {
        throw new Error(`今日最多还能购买${canBuyToday}个`)
      }
    }

    // 检查总限购
    if (item.limitTotal) {
      const canBuyTotal = item.limitTotal - purchasedTotal
      if (canBuyTotal <= 0) {
        throw new Error('已达总购买上限')
      }
      if (quantity > canBuyTotal) {
        throw new Error(`最多还能购买${canBuyTotal}个`)
      }
    }

    // 计算总花费
    const totalCost = item.contributionCost * quantity
    if (character.sectContribution < totalCost) {
      throw new Error(`贡献不足，需要${totalCost}贡献`)
    }

    // 扣除贡献
    character.sectContribution -= totalCost

    // 更新购买记录
    purchaseRecord[itemId] = {
      daily: (record.lastDate === today ? record.daily : 0) + quantity,
      total: purchasedTotal + quantity,
      lastDate: today
    }
    character.treasuryPurchaseRecord = purchaseRecord

    await characterRepository.save(character)

    // 将物品添加到背包
    await inventoryService.addItem(characterId, itemId, quantity)

    return {
      success: true,
      item,
      quantity,
      contributionSpent: totalCost,
      remainingContribution: character.sectContribution
    }
  }

  // 捐献灵石获取贡献
  async donate(
    characterId: string,
    amount: number
  ): Promise<{
    success: boolean
    spiritStonesSpent: number
    contributionGained: number
    totalContribution: number
  }> {
    const character = await characterRepository.findOne({
      where: { id: characterId }
    })

    if (!character) {
      throw new Error('角色不存在')
    }

    if (!character.sectId) {
      throw new Error('你还没有加入任何宗门')
    }

    // 验证捐献数量
    if (amount < 10) {
      throw new Error('最少捐献10灵石')
    }

    if (amount > Number(character.spiritStones)) {
      throw new Error('灵石不足')
    }

    // 计算获得的贡献（10灵石 = 1贡献）
    const contributionGained = Math.floor(amount / 10)

    if (contributionGained <= 0) {
      throw new Error('捐献数量过少')
    }

    // 实际消耗的灵石（向下取整后的10的倍数）
    const actualSpent = contributionGained * 10

    // 扣除灵石，增加贡献
    character.spiritStones = Number(character.spiritStones) - actualSpent
    character.sectContribution += contributionGained

    await characterRepository.save(character)

    return {
      success: true,
      spiritStonesSpent: actualSpent,
      contributionGained,
      totalContribution: character.sectContribution
    }
  }

  // 获取悬赏列表
  async getBounties(characterId: string): Promise<{
    activeBounties: { bountyId: string; progress: number; acceptedAt: number; status: string }[]
    completedBountyIds: string[]
    availableBounties: (SectBounty & { canAccept: boolean; reason?: string })[]
  }> {
    const character = await characterRepository.findOne({
      where: { id: characterId },
      relations: ['realm']
    })

    if (!character) {
      throw new Error('角色不存在')
    }

    if (!character.sectId) {
      throw new Error('你还没有加入任何宗门')
    }

    // 获取悬赏数据
    const bountyData = character.bountyData
    const today = new Date().toDateString()

    // 检查是否需要重置每日悬赏
    if (bountyData.lastResetDate !== today) {
      // 重置每日悬赏完成记录（保留每周的）
      const weeklyBounties = getSectBounties(character.sectId).filter(b => b.type === 'weekly')
      const weeklyIds = weeklyBounties.map(b => b.id)
      bountyData.completedBountyIds = bountyData.completedBountyIds.filter(id => weeklyIds.includes(id))
      bountyData.lastResetDate = today
      character.bountyData = bountyData
      await characterRepository.save(character)
    }

    // 获取可用悬赏
    const bounties = getSectBounties(character.sectId)
    const realmTier = character.realm?.tier || 1

    const availableBounties = bounties.map(bounty => {
      const check = canAcceptBounty(bounty, character.sectRank as SectRank, realmTier)
      return {
        ...bounty,
        canAccept: check.canAccept,
        reason: check.reason
      }
    })

    return {
      activeBounties: bountyData.activeBounties,
      completedBountyIds: bountyData.completedBountyIds,
      availableBounties
    }
  }

  // 接受悬赏
  async acceptBounty(
    characterId: string,
    bountyId: string
  ): Promise<{
    success: boolean
    message: string
  }> {
    const character = await characterRepository.findOne({
      where: { id: characterId },
      relations: ['realm']
    })

    if (!character) {
      throw new Error('角色不存在')
    }

    if (!character.sectId) {
      throw new Error('你还没有加入任何宗门')
    }

    // 获取悬赏
    const bounties = getSectBounties(character.sectId)
    const bounty = bounties.find(b => b.id === bountyId)

    if (!bounty) {
      throw new Error('悬赏不存在')
    }

    // 检查是否可以接受
    const realmTier = character.realm?.tier || 1
    const check = canAcceptBounty(bounty, character.sectRank as SectRank, realmTier)
    if (!check.canAccept) {
      throw new Error(check.reason || '无法接受此悬赏')
    }

    // 获取悬赏数据
    const bountyData = character.bountyData

    // 检查是否已接受
    if (bountyData.activeBounties.some(b => b.bountyId === bountyId)) {
      throw new Error('已接受此悬赏')
    }

    // 检查是否已完成
    if (bountyData.completedBountyIds.includes(bountyId)) {
      throw new Error('今日已完成此悬赏')
    }

    // 添加到活跃列表
    bountyData.activeBounties.push({
      bountyId,
      progress: 0,
      acceptedAt: Date.now(),
      status: 'active'
    })

    character.bountyData = bountyData
    await characterRepository.save(character)

    return {
      success: true,
      message: `成功接受悬赏：${bounty.name}`
    }
  }

  // 提交悬赏
  async submitBounty(
    characterId: string,
    bountyId: string
  ): Promise<{
    success: boolean
    message: string
    rewards?: {
      contribution: number
      spiritStones?: number
      experience?: number
    }
  }> {
    const character = await characterRepository.findOne({
      where: { id: characterId },
      relations: ['realm']
    })

    if (!character) {
      throw new Error('角色不存在')
    }

    if (!character.sectId) {
      throw new Error('你还没有加入任何宗门')
    }

    // 获取悬赏
    const bounties = getSectBounties(character.sectId)
    const bounty = bounties.find(b => b.id === bountyId)

    if (!bounty) {
      throw new Error('悬赏不存在')
    }

    // 获取悬赏数据
    const bountyData = character.bountyData

    // 检查是否在活跃列表
    const activeIndex = bountyData.activeBounties.findIndex(b => b.bountyId === bountyId)
    if (activeIndex === -1) {
      throw new Error('未接受此悬赏')
    }

    const activeBounty = bountyData.activeBounties[activeIndex]

    // 检查是否完成
    if (activeBounty.progress < bounty.requirement.amount) {
      throw new Error(`悬赏未完成：${activeBounty.progress}/${bounty.requirement.amount}`)
    }

    // 从活跃列表移除
    bountyData.activeBounties.splice(activeIndex, 1)

    // 添加到已完成列表
    bountyData.completedBountyIds.push(bountyId)

    // 发放奖励
    character.sectContribution += bounty.rewards.contribution

    if (bounty.rewards.spiritStones) {
      character.spiritStones = Number(character.spiritStones) + bounty.rewards.spiritStones
    }

    if (bounty.rewards.experience) {
      character.experience = Number(character.experience) + bounty.rewards.experience
    }

    character.bountyData = bountyData
    await characterRepository.save(character)

    return {
      success: true,
      message: `悬赏完成：${bounty.name}`,
      rewards: {
        contribution: bounty.rewards.contribution,
        spiritStones: bounty.rewards.spiritStones,
        experience: bounty.rewards.experience
      }
    }
  }

  // 放弃悬赏
  async abandonBounty(
    characterId: string,
    bountyId: string
  ): Promise<{
    success: boolean
    message: string
  }> {
    const character = await characterRepository.findOne({
      where: { id: characterId }
    })

    if (!character) {
      throw new Error('角色不存在')
    }

    if (!character.sectId) {
      throw new Error('你还没有加入任何宗门')
    }

    // 获取悬赏数据
    const bountyData = character.bountyData

    // 检查是否在活跃列表
    const activeIndex = bountyData.activeBounties.findIndex(b => b.bountyId === bountyId)
    if (activeIndex === -1) {
      throw new Error('未接受此悬赏')
    }

    // 从活跃列表移除
    bountyData.activeBounties.splice(activeIndex, 1)

    character.bountyData = bountyData
    await characterRepository.save(character)

    return {
      success: true,
      message: '已放弃悬赏'
    }
  }

  // 更新悬赏进度（由其他系统调用）
  async updateBountyProgress(characterId: string, requirementType: string, amount: number = 1, target?: string): Promise<void> {
    const character = await characterRepository.findOne({
      where: { id: characterId }
    })

    if (!character || !character.sectId) return

    const bountyData = character.bountyData
    const bounties = getSectBounties(character.sectId)
    let updated = false

    for (const activeBounty of bountyData.activeBounties) {
      const bounty = bounties.find(b => b.id === activeBounty.bountyId)
      if (!bounty) continue

      // 检查是否匹配需求类型
      if (bounty.requirement.type !== requirementType) continue

      // 检查目标是否匹配（如果有指定目标）
      if (bounty.requirement.target && bounty.requirement.target !== target) continue

      // 更新进度
      activeBounty.progress = Math.min(activeBounty.progress + amount, bounty.requirement.amount)
      updated = true
    }

    if (updated) {
      character.bountyData = bountyData
      await characterRepository.save(character)
    }
  }
}

export const sectService = new SectService()
