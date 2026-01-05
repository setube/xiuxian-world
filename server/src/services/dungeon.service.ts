/**
 * 虚天殿·降魔 - 5人团队副本服务
 */
import { AppDataSource } from '../config/database'
import { In } from 'typeorm'
import { Character } from '../models/Character'
import { DungeonRoom, DungeonMember, DungeonRoomStatus, PathChoice } from '../models/DungeonRoom'
import { DungeonRecord, PlayerDungeonRecord, DungeonReward } from '../models/DungeonRecord'
import { InventoryService } from './inventory.service'
import {
  DUNGEON_CONFIG,
  DUNGEON_ROLES,
  DUNGEON_STAGES,
  DUNGEON_REWARDS,
  getRoleFromSpiritRoot,
  simulateStage,
  calculateRewards,
  rollRareDrops,
  checkTeamComposition,
  getCurrentWeek,
  type TeamComposition,
  type DungeonRole
} from '../game/constants/dungeon'

const characterRepository = AppDataSource.getRepository(Character)
const dungeonRoomRepository = AppDataSource.getRepository(DungeonRoom)
const dungeonRecordRepository = AppDataSource.getRepository(DungeonRecord)
const playerDungeonRecordRepository = AppDataSource.getRepository(PlayerDungeonRecord)
const inventoryService = new InventoryService()

// ==================== 接口定义 ====================

export interface RoomListItem {
  id: string
  leaderName: string
  memberCount: number
  maxMembers: number
  status: DungeonRoomStatus
  dungeonName: string
  hasPassword: boolean
  minRealmRequired: number
  roles: { role: DungeonRole; count: number }[]
}

export interface RoomDetail {
  id: string
  leaderId: string
  leaderName: string
  dungeonType: string
  dungeonName: string
  status: DungeonRoomStatus
  currentStage: number
  members: (DungeonMember & { roleName: string })[]
  selectedPath: PathChoice | null
  stageResults: { stage: number; stageName: string; success: boolean; events: string[] }[]
  teamWarnings: string[]
  createdAt: Date
  startedAt: Date | null
}

export interface CreateRoomResult {
  success: boolean
  roomId?: string
  message: string
}

export interface JoinRoomResult {
  success: boolean
  message: string
}

export interface StageResultOutput {
  success: boolean
  stage: number
  stageName: string
  events: string[]
  bonuses: string[]
  penalties: string[]
  rate: number
  dungeonEnded: boolean
  finalResult?: 'success' | 'failed'
  rewards?: DungeonReward[]
}

export interface PlayerDungeonStatus {
  inRoom: boolean
  currentRoomId: string | null
  isLeader: boolean
  canCreateRoom: boolean
  hasEntryItem: boolean
  xutianMapCount: number
  lastDungeonTime: number | null
  xutianDingFragments: number
  hasFirstClearThisWeek: boolean
}

// ==================== 服务类 ====================

class DungeonService {
  /**
   * 获取玩家副本状态
   */
  async getPlayerStatus(characterId: string): Promise<PlayerDungeonStatus> {
    const character = await characterRepository.findOne({
      where: { id: characterId }
    })

    if (!character) {
      throw new Error('角色不存在')
    }

    // 检查是否有虚天残图
    const xutianMapCount = await inventoryService.getItemQuantity(characterId, DUNGEON_CONFIG.xutian_demon.entryItemId)

    // 检查本周是否已首通
    const currentWeek = getCurrentWeek()
    const hasFirstClearThisWeek = character.lastDungeonFirstClearWeek === currentWeek

    return {
      inRoom: !!character.currentDungeonRoomId,
      currentRoomId: character.currentDungeonRoomId,
      isLeader: false, // 后续更新
      canCreateRoom: !character.currentDungeonRoomId && character.realmId >= DUNGEON_CONFIG.xutian_demon.minRealmId,
      hasEntryItem: xutianMapCount >= DUNGEON_CONFIG.xutian_demon.entryItemCount,
      xutianMapCount,
      lastDungeonTime: character.lastDungeonTime ? Number(character.lastDungeonTime) : null,
      xutianDingFragments: character.xutianDingFragments || 0,
      hasFirstClearThisWeek
    }
  }

  /**
   * 获取房间列表
   */
  async getRoomList(): Promise<RoomListItem[]> {
    const rooms = await dungeonRoomRepository.find({
      where: { status: 'waiting' },
      order: { createdAt: 'DESC' }
    })

    return rooms.map(room => {
      const members = room.members
      const roleCount: Record<DungeonRole, number> = { pj: 0, ys: 0, ly: 0, zs: 0, yr: 0 }
      members.forEach(m => {
        roleCount[m.role as DungeonRole]++
      })

      return {
        id: room.id,
        leaderName: room.leaderName,
        memberCount: members.length,
        maxMembers: DUNGEON_CONFIG.xutian_demon.maxPlayers,
        status: room.status,
        dungeonName: DUNGEON_CONFIG.xutian_demon.name,
        hasPassword: !!room.password,
        minRealmRequired: room.minRealmRequired,
        roles: Object.entries(roleCount)
          .filter(([, count]) => count > 0)
          .map(([role, count]) => ({ role: role as DungeonRole, count }))
      }
    })
  }

  /**
   * 获取房间详情
   */
  async getRoomDetail(roomId: string): Promise<RoomDetail | null> {
    const room = await dungeonRoomRepository.findOne({
      where: { id: roomId }
    })

    if (!room) return null

    const members = room.members.map(m => ({
      ...m,
      roleName: DUNGEON_ROLES[m.role as DungeonRole]?.name || '未知'
    }))

    const team: TeamComposition = {
      members: room.members.map(m => ({
        characterId: m.characterId,
        name: m.name,
        role: m.role as DungeonRole,
        power: m.power,
        spiritRoot: m.spiritRoot,
        realmId: m.realmId
      })),
      totalPower: room.members.reduce((sum, m) => sum + m.power, 0),
      selectedPath: room.selectedPath || undefined
    }

    const { warnings } = checkTeamComposition(team)

    return {
      id: room.id,
      leaderId: room.leaderId,
      leaderName: room.leaderName,
      dungeonType: room.dungeonType,
      dungeonName: DUNGEON_CONFIG.xutian_demon.name,
      status: room.status,
      currentStage: room.currentStage,
      members,
      selectedPath: room.selectedPath,
      stageResults: room.stageResults.map(r => ({
        stage: r.stage,
        stageName: r.stageName,
        success: r.success,
        events: r.events
      })),
      teamWarnings: warnings,
      createdAt: room.createdAt,
      startedAt: room.startedAt
    }
  }

  /**
   * 创建房间
   */
  async createRoom(characterId: string, password?: string): Promise<CreateRoomResult> {
    const character = await characterRepository.findOne({
      where: { id: characterId }
    })

    if (!character) {
      return { success: false, message: '角色不存在' }
    }

    // 检查是否已在副本中
    if (character.currentDungeonRoomId) {
      return { success: false, message: '你已在副本房间中' }
    }

    // 检查境界
    if (character.realmId < DUNGEON_CONFIG.xutian_demon.minRealmId) {
      return { success: false, message: `需要达到金丹初期（境界${DUNGEON_CONFIG.xutian_demon.minRealmId}）才能参与副本` }
    }

    // 检查虚天残图
    const entryItemCount = await inventoryService.getItemQuantity(characterId, DUNGEON_CONFIG.xutian_demon.entryItemId)
    if (entryItemCount < DUNGEON_CONFIG.xutian_demon.entryItemCount) {
      return { success: false, message: '缺少虚天残图，无法开启副本' }
    }

    // 计算战力
    const power = this.calculateCharacterPower(character)
    const role = getRoleFromSpiritRoot(character.spiritRootId)

    // 创建房间
    const room = new DungeonRoom()
    room.leaderId = characterId
    room.leaderName = character.name
    room.dungeonType = 'xutian_demon'
    room.status = 'waiting'
    room.currentStage = 0
    room.password = password || null
    room.minRealmRequired = DUNGEON_CONFIG.xutian_demon.minRealmId
    room.members = [
      {
        characterId,
        name: character.name,
        role,
        power,
        spiritRoot: character.spiritRootId,
        realmId: character.realmId,
        joinedAt: Date.now()
      }
    ]

    await dungeonRoomRepository.save(room)

    // 更新角色状态
    character.currentDungeonRoomId = room.id
    await characterRepository.save(character)

    return { success: true, roomId: room.id, message: '房间创建成功' }
  }

  /**
   * 加入房间
   */
  async joinRoom(characterId: string, roomId: string, password?: string): Promise<JoinRoomResult> {
    const character = await characterRepository.findOne({
      where: { id: characterId }
    })

    if (!character) {
      return { success: false, message: '角色不存在' }
    }

    // 检查是否已在副本中
    if (character.currentDungeonRoomId) {
      return { success: false, message: '你已在其他副本房间中' }
    }

    const room = await dungeonRoomRepository.findOne({
      where: { id: roomId }
    })

    if (!room) {
      return { success: false, message: '房间不存在' }
    }

    // 检查房间状态
    if (room.status !== 'waiting') {
      return { success: false, message: '该房间已开始或已结束' }
    }

    // 检查密码
    if (room.password && room.password !== password) {
      return { success: false, message: '房间密码错误' }
    }

    // 检查境界
    if (character.realmId < room.minRealmRequired) {
      return { success: false, message: `需要达到境界${room.minRealmRequired}才能加入该房间` }
    }

    // 检查人数
    const members = room.members
    if (members.length >= DUNGEON_CONFIG.xutian_demon.maxPlayers) {
      return { success: false, message: '房间已满' }
    }

    // 检查是否已在房间中
    if (members.some(m => m.characterId === characterId)) {
      return { success: false, message: '你已在该房间中' }
    }

    // 计算战力和职业
    const power = this.calculateCharacterPower(character)
    const role = getRoleFromSpiritRoot(character.spiritRootId)

    // 添加成员
    members.push({
      characterId,
      name: character.name,
      role,
      power,
      spiritRoot: character.spiritRootId,
      realmId: character.realmId,
      joinedAt: Date.now()
    })
    room.members = members

    await dungeonRoomRepository.save(room)

    // 更新角色状态
    character.currentDungeonRoomId = room.id
    await characterRepository.save(character)

    return { success: true, message: '成功加入房间' }
  }

  /**
   * 离开房间
   */
  async leaveRoom(characterId: string): Promise<{ success: boolean; message: string }> {
    const character = await characterRepository.findOne({
      where: { id: characterId }
    })

    if (!character || !character.currentDungeonRoomId) {
      return { success: false, message: '你不在任何房间中' }
    }

    const room = await dungeonRoomRepository.findOne({
      where: { id: character.currentDungeonRoomId }
    })

    if (!room) {
      // 房间不存在，直接清除状态
      character.currentDungeonRoomId = null
      await characterRepository.save(character)
      return { success: true, message: '已离开房间' }
    }

    // 检查副本状态
    if (room.status === 'in_progress') {
      return { success: false, message: '副本进行中无法离开' }
    }

    // 如果是队长且还有其他成员，转移队长
    const members = room.members.filter(m => m.characterId !== characterId)

    if (room.leaderId === characterId) {
      if (members.length > 0) {
        // 转移队长给第一个成员
        room.leaderId = members[0].characterId
        room.leaderName = members[0].name
        room.members = members
        await dungeonRoomRepository.save(room)
      } else {
        // 房间没有其他成员，解散
        room.status = 'disbanded'
        room.members = []
        await dungeonRoomRepository.save(room)
      }
    } else {
      room.members = members
      await dungeonRoomRepository.save(room)
    }

    // 清除角色状态
    character.currentDungeonRoomId = null
    await characterRepository.save(character)

    return { success: true, message: '已离开房间' }
  }

  /**
   * 踢出成员（队长专用）
   */
  async kickMember(leaderId: string, targetId: string): Promise<{ success: boolean; message: string }> {
    const leader = await characterRepository.findOne({
      where: { id: leaderId }
    })

    if (!leader || !leader.currentDungeonRoomId) {
      return { success: false, message: '你不在任何房间中' }
    }

    const room = await dungeonRoomRepository.findOne({
      where: { id: leader.currentDungeonRoomId }
    })

    if (!room) {
      return { success: false, message: '房间不存在' }
    }

    // 检查是否是队长
    if (room.leaderId !== leaderId) {
      return { success: false, message: '只有队长可以踢人' }
    }

    // 检查状态
    if (room.status !== 'waiting') {
      return { success: false, message: '副本已开始，无法踢人' }
    }

    // 不能踢自己
    if (targetId === leaderId) {
      return { success: false, message: '不能踢出自己' }
    }

    // 检查目标是否在房间中
    const members = room.members
    const targetIndex = members.findIndex(m => m.characterId === targetId)
    if (targetIndex === -1) {
      return { success: false, message: '该玩家不在房间中' }
    }

    // 移除成员
    members.splice(targetIndex, 1)
    room.members = members
    await dungeonRoomRepository.save(room)

    // 清除被踢玩家的状态
    const target = await characterRepository.findOne({ where: { id: targetId } })
    if (target) {
      target.currentDungeonRoomId = null
      await characterRepository.save(target)
    }

    return { success: true, message: '已踢出该玩家' }
  }

  /**
   * 解散房间（队长专用）
   */
  async disbandRoom(leaderId: string): Promise<{ success: boolean; message: string }> {
    const leader = await characterRepository.findOne({
      where: { id: leaderId }
    })

    if (!leader || !leader.currentDungeonRoomId) {
      return { success: false, message: '你不在任何房间中' }
    }

    const room = await dungeonRoomRepository.findOne({
      where: { id: leader.currentDungeonRoomId }
    })

    if (!room) {
      return { success: false, message: '房间不存在' }
    }

    // 检查是否是队长
    if (room.leaderId !== leaderId) {
      return { success: false, message: '只有队长可以解散房间' }
    }

    // 检查状态
    if (room.status === 'in_progress') {
      return { success: false, message: '副本进行中无法解散' }
    }

    // 清除所有成员状态
    const memberIds = room.members.map(m => m.characterId)
    await characterRepository.update({ id: In(memberIds) as any }, { currentDungeonRoomId: null })

    // 标记房间为解散
    room.status = 'disbanded'
    await dungeonRoomRepository.save(room)

    return { success: true, message: '房间已解散' }
  }

  /**
   * 开始副本（队长专用）
   */
  async startDungeon(leaderId: string): Promise<{ success: boolean; message: string }> {
    const leader = await characterRepository.findOne({
      where: { id: leaderId }
    })

    if (!leader || !leader.currentDungeonRoomId) {
      return { success: false, message: '你不在任何房间中' }
    }

    const room = await dungeonRoomRepository.findOne({
      where: { id: leader.currentDungeonRoomId }
    })

    if (!room) {
      return { success: false, message: '房间不存在' }
    }

    // 检查是否是队长
    if (room.leaderId !== leaderId) {
      return { success: false, message: '只有队长可以开始副本' }
    }

    // 检查状态
    if (room.status !== 'waiting') {
      return { success: false, message: '副本已经开始或已结束' }
    }

    // 检查人数
    const members = room.members
    if (members.length < DUNGEON_CONFIG.xutian_demon.minPlayers) {
      return { success: false, message: `需要至少${DUNGEON_CONFIG.xutian_demon.minPlayers}人才能开始` }
    }

    // 消耗队长的虚天残图
    const consumeResult = await inventoryService.removeItemByItemId(
      leaderId,
      DUNGEON_CONFIG.xutian_demon.entryItemId,
      DUNGEON_CONFIG.xutian_demon.entryItemCount
    )
    if (consumeResult.removed < DUNGEON_CONFIG.xutian_demon.entryItemCount) {
      return { success: false, message: '队长缺少虚天残图' }
    }

    // 更新房间状态
    room.status = 'in_progress'
    room.currentStage = 1
    room.startedAt = new Date()
    await dungeonRoomRepository.save(room)

    return { success: true, message: '副本开始！进入第一关：灵渊之地' }
  }

  /**
   * 选择道路（第二关专用）
   */
  async selectPath(leaderId: string, path: PathChoice): Promise<{ success: boolean; message: string }> {
    const leader = await characterRepository.findOne({
      where: { id: leaderId }
    })

    if (!leader || !leader.currentDungeonRoomId) {
      return { success: false, message: '你不在任何房间中' }
    }

    const room = await dungeonRoomRepository.findOne({
      where: { id: leader.currentDungeonRoomId }
    })

    if (!room) {
      return { success: false, message: '房间不存在' }
    }

    // 检查是否是队长
    if (room.leaderId !== leaderId) {
      return { success: false, message: '只有队长可以选择道路' }
    }

    // 检查状态和关卡
    if (room.status !== 'in_progress' || room.currentStage !== 2) {
      return { success: false, message: '当前不是第二关或副本未开始' }
    }

    // 检查是否已选择
    if (room.selectedPath) {
      return { success: false, message: '已经选择过道路' }
    }

    room.selectedPath = path
    await dungeonRoomRepository.save(room)

    return { success: true, message: `已选择${path === 'ice' ? '冰' : '火'}之道` }
  }

  /**
   * 挑战当前关卡
   */
  async challengeStage(leaderId: string): Promise<StageResultOutput> {
    const leader = await characterRepository.findOne({
      where: { id: leaderId }
    })

    if (!leader || !leader.currentDungeonRoomId) {
      throw new Error('你不在任何房间中')
    }

    const room = await dungeonRoomRepository.findOne({
      where: { id: leader.currentDungeonRoomId }
    })

    if (!room) {
      throw new Error('房间不存在')
    }

    // 检查是否是队长
    if (room.leaderId !== leaderId) {
      throw new Error('只有队长可以发起挑战')
    }

    // 检查状态
    if (room.status !== 'in_progress') {
      throw new Error('副本未开始')
    }

    const currentStage = room.currentStage
    if (currentStage < 1 || currentStage > 3) {
      throw new Error('无效的关卡')
    }

    // 第二关需要先选择道路
    if (currentStage === 2 && !room.selectedPath) {
      throw new Error('请先选择冰道或火道')
    }

    const stageConfig = DUNGEON_STAGES[currentStage]
    if (!stageConfig) {
      throw new Error('关卡配置不存在')
    }

    // 构建团队组成
    const team: TeamComposition = {
      members: room.members.map(m => ({
        characterId: m.characterId,
        name: m.name,
        role: m.role as DungeonRole,
        power: m.power,
        spiritRoot: m.spiritRoot,
        realmId: m.realmId
      })),
      totalPower: room.members.reduce((sum, m) => sum + m.power, 0),
      selectedPath: room.selectedPath || undefined
    }

    // 模拟战斗
    const result = simulateStage(stageConfig, team)

    // 记录关卡结果
    const stageResults = room.stageResults
    stageResults.push({
      stage: currentStage,
      stageName: stageConfig.name,
      success: result.success,
      events: result.events,
      bonuses: result.bonuses,
      timestamp: Date.now()
    })
    room.stageResults = stageResults

    let dungeonEnded = false
    let finalResult: 'success' | 'failed' | undefined
    let rewards: DungeonReward[] | undefined

    if (result.success) {
      if (currentStage < 3) {
        // 进入下一关
        room.currentStage = (currentStage + 1) as 1 | 2 | 3
      } else {
        // 通关
        dungeonEnded = true
        finalResult = 'success'
        room.status = 'completed'
        room.completedAt = new Date()
        rewards = await this.distributeRewards(room, 3)
      }
    } else {
      // 失败
      dungeonEnded = true
      finalResult = 'failed'
      room.status = 'failed'
      room.completedAt = new Date()
      // 根据已通关关数分配奖励
      rewards = await this.distributeRewards(room, currentStage - 1)
    }

    await dungeonRoomRepository.save(room)

    // 如果副本结束，创建记录并清理
    if (dungeonEnded) {
      await this.createDungeonRecord(room, finalResult!, currentStage - (result.success ? 0 : 1), rewards!)
      await this.cleanupRoom(room)
    }

    return {
      success: result.success,
      stage: currentStage,
      stageName: stageConfig.name,
      events: result.events,
      bonuses: result.bonuses,
      penalties: result.penalties,
      rate: result.rate,
      dungeonEnded,
      finalResult,
      rewards
    }
  }

  /**
   * 获取副本历史记录
   */
  async getHistory(characterId: string, limit = 10): Promise<PlayerDungeonRecord[]> {
    return await playerDungeonRecordRepository.find({
      where: { characterId },
      order: { recordedAt: 'DESC' },
      take: limit
    })
  }

  // ==================== 私有方法 ====================

  /**
   * 计算角色战力
   */
  private calculateCharacterPower(character: Character): number {
    // 基础战力 = 攻击 + 防御 + 速度 + 境界加成
    const base = character.attack + character.defense + character.speed
    const realmBonus = character.realmId * 1000
    return base + realmBonus
  }

  /**
   * 分配奖励
   */
  private async distributeRewards(room: DungeonRoom, clearedStages: number): Promise<DungeonReward[]> {
    const rewards: DungeonReward[] = []
    const members = room.members
    const currentWeek = getCurrentWeek()

    // 随机选择一个成员获得虚天鼎残片
    const fragmentReceiver = clearedStages === 3 ? members[Math.floor(Math.random() * members.length)] : null

    // 稀有掉落（全队共享）
    const rareDrops = clearedStages === 3 ? rollRareDrops() : []

    for (const member of members) {
      const character = await characterRepository.findOne({
        where: { id: member.characterId }
      })

      if (!character) continue

      // 检查是否首通
      const isFirstClear = character.lastDungeonFirstClearWeek !== currentWeek && clearedStages === 3

      // 计算基础奖励
      const baseRewards = calculateRewards(clearedStages, isFirstClear)

      const reward: DungeonReward = {
        characterId: member.characterId,
        characterName: member.name,
        spiritStones: baseRewards.spiritStones,
        cultivation: baseRewards.cultivation,
        sectContribution: baseRewards.sectContribution,
        items: [],
        xutianDingFragment: fragmentReceiver?.characterId === member.characterId,
        isFirstClear
      }

      // 发放灵石
      if (reward.spiritStones > 0) {
        character.spiritStones = Number(character.spiritStones) + reward.spiritStones
      }

      // 发放修为
      if (reward.cultivation > 0) {
        character.experience = Number(character.experience) + reward.cultivation
      }

      // 发放宗门贡献
      if (reward.sectContribution > 0 && character.sectId) {
        character.sectContribution = (character.sectContribution || 0) + reward.sectContribution
      }

      // 发放虚天鼎残片
      if (reward.xutianDingFragment) {
        character.xutianDingFragments = (character.xutianDingFragments || 0) + baseRewards.xutianFragments
        reward.items.push({
          itemId: 'xutian_ding_fragment',
          name: '虚天鼎残片',
          quantity: baseRewards.xutianFragments
        })
      }

      // 稀有掉落（随机分配给某人）
      for (const drop of rareDrops) {
        // 随机分配
        if (Math.random() < 1 / members.length) {
          await inventoryService.addItem(member.characterId, drop.itemId, 1)
          reward.items.push({ itemId: drop.itemId, name: drop.name, quantity: 1 })
        }
      }

      // 更新首通记录
      if (isFirstClear) {
        character.lastDungeonFirstClearWeek = currentWeek
      }

      // 更新副本完成时间
      character.lastDungeonTime = Date.now()

      await characterRepository.save(character)
      rewards.push(reward)
    }

    return rewards
  }

  /**
   * 创建副本记录
   */
  private async createDungeonRecord(
    room: DungeonRoom,
    result: 'success' | 'failed',
    clearedStages: number,
    rewards: DungeonReward[]
  ): Promise<void> {
    // 创建主记录
    const record = new DungeonRecord()
    record.roomId = room.id
    record.dungeonType = room.dungeonType
    record.result = result
    record.failedAtStage = result === 'failed' ? room.currentStage : null
    record.clearedStages = clearedStages
    record.teamSnapshot = room.members
    record.rewards = rewards
    record.duration = room.completedAt && room.startedAt ? room.completedAt.getTime() - room.startedAt.getTime() : 0
    record.leaderId = room.leaderId
    record.leaderName = room.leaderName

    await dungeonRecordRepository.save(record)

    // 创建个人记录
    for (const member of room.members) {
      const playerRecord = new PlayerDungeonRecord()
      playerRecord.characterId = member.characterId
      playerRecord.dungeonRecordId = record.id
      playerRecord.dungeonType = room.dungeonType
      playerRecord.result = result
      playerRecord.clearedStages = clearedStages
      playerRecord.role = member.role
      playerRecord.reward = rewards.find(r => r.characterId === member.characterId) || null
      playerRecord.isFirstClear = rewards.find(r => r.characterId === member.characterId)?.isFirstClear || false
      playerRecord.wasLeader = member.characterId === room.leaderId

      await playerDungeonRecordRepository.save(playerRecord)
    }
  }

  /**
   * 清理房间（副本结束后）
   */
  private async cleanupRoom(room: DungeonRoom): Promise<void> {
    // 清除所有成员的房间状态
    const memberIds = room.members.map(m => m.characterId)
    await characterRepository.update({ id: In(memberIds) as any }, { currentDungeonRoomId: null })
  }
}

export const dungeonService = new DungeonService()
