/**
 * 宗门外交服务
 * 处理宗门间外交关系管理
 */
import { AppDataSource } from '../config/database'
import { Character } from '../models/Character'
import { SectDiplomacy, type DiplomacyStatus } from '../models/SectDiplomacy'
import { SectMaster } from '../models/SectMaster'
import { SECTS } from '../game/constants/sects'
import {
  DIPLOMACY_CONFIG,
  DIPLOMACY_STATUS_CONFIG,
  type DiplomacyRelation,
  type DiplomacyStatusResponse,
  type PendingAllianceRequest,
  type WorldSituationItem,
  type WorldSituationResponse,
  type SetDiplomacyResult
} from '../game/constants/diplomacy'
import { sectMasterService } from './sectMaster.service'
import { ERROR_CODES } from '../utils/errorCodes'
import { emitAllianceRequest, emitDiplomacyAnnouncement } from '../socket'

const characterRepository = AppDataSource.getRepository(Character)
const diplomacyRepository = AppDataSource.getRepository(SectDiplomacy)
const sectMasterRepository = AppDataSource.getRepository(SectMaster)

export class DiplomacyService {
  /**
   * 获取外交状态
   */
  async getDiplomacyStatus(characterId: string): Promise<DiplomacyStatusResponse> {
    const character = await characterRepository.findOne({
      where: { id: characterId }
    })

    if (!character) {
      throw { code: ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, message: '角色不存在' }
    }

    if (!character.sectId) {
      throw { code: ERROR_CODES.DIPLOMACY_NOT_IN_SECT, message: '你还未加入任何宗门' }
    }

    const sectId = character.sectId
    const sect = SECTS[sectId]

    // 检查是否是掌门
    const isMaster = await sectMasterService.isMaster(characterId, sectId)

    // 获取掌门信息
    const masterInfo = await sectMasterService.getMaster(sectId)

    // 获取背盟惩罚
    const alliancePenaltyUntil = await sectMasterService.getAlliancePenaltyUntil(sectId)

    // 获取我方对各宗门的态度
    const relations = await this.getRelationsFrom(sectId)

    // 获取各宗门对我方的态度
    const incomingRelations = await this.getRelationsTo(sectId)

    // 获取待处理的结盟请求
    const pendingAllianceRequests = await this.getPendingAllianceRequests(sectId)

    // 检查是否有盟友
    const hasAnyAlliance = await this.hasAnyAlliance(sectId)

    return {
      isMaster,
      masterId: masterInfo?.masterId || null,
      masterName: masterInfo?.masterName || null,
      sectId,
      sectName: sect?.name || null,
      hasAnyAlliance,
      alliancePenaltyUntil,
      relations,
      incomingRelations,
      pendingAllianceRequests
    }
  }

  /**
   * 获取我方对各宗门的态度
   */
  private async getRelationsFrom(sectId: string): Promise<DiplomacyRelation[]> {
    const now = Date.now()
    const relations: DiplomacyRelation[] = []

    for (const targetSectId of Object.keys(SECTS)) {
      if (targetSectId === sectId) continue

      const targetSect = SECTS[targetSectId]
      const record = await diplomacyRepository.findOne({
        where: { sourceSectId: sectId, targetSectId }
      })

      const status = record?.status || 'neutral'
      const lastChangedAt = record?.lastChangedAt ? Number(record.lastChangedAt) : null

      // 计算是否可以变更（24小时冷却）
      let canChange = true
      let cooldownRemainingMs: number | null = null

      if (lastChangedAt) {
        const cooldownEnd = lastChangedAt + DIPLOMACY_CONFIG.statusChangeCooldownMs
        if (now < cooldownEnd) {
          canChange = false
          cooldownRemainingMs = cooldownEnd - now
        }
      }

      relations.push({
        sectId: targetSectId,
        sectName: targetSect.name,
        status,
        lastChangedAt,
        canChange,
        cooldownRemainingMs
      })
    }

    return relations
  }

  /**
   * 获取各宗门对我方的态度
   */
  private async getRelationsTo(sectId: string): Promise<DiplomacyRelation[]> {
    const now = Date.now()
    const relations: DiplomacyRelation[] = []

    for (const sourceSectId of Object.keys(SECTS)) {
      if (sourceSectId === sectId) continue

      const sourceSect = SECTS[sourceSectId]
      const record = await diplomacyRepository.findOne({
        where: { sourceSectId, targetSectId: sectId }
      })

      const status = record?.status || 'neutral'
      const lastChangedAt = record?.lastChangedAt ? Number(record.lastChangedAt) : null

      relations.push({
        sectId: sourceSectId,
        sectName: sourceSect.name,
        status,
        lastChangedAt,
        canChange: false, // 对方态度我方无法直接改变
        cooldownRemainingMs: null
      })
    }

    return relations
  }

  /**
   * 获取待处理的结盟请求
   */
  private async getPendingAllianceRequests(sectId: string): Promise<PendingAllianceRequest[]> {
    const now = Date.now()
    const requests: PendingAllianceRequest[] = []

    // 查找所有向本宗门发起结盟请求的记录
    const records = await diplomacyRepository.find({
      where: { targetSectId: sectId, status: 'friendly' }
    })

    for (const record of records) {
      // 检查是否有有效的结盟请求
      if (!record.allianceProposedAt) continue

      const proposedAt = Number(record.allianceProposedAt)
      const expiresAt = proposedAt + DIPLOMACY_CONFIG.allianceProposalExpiryMs

      // 已过期的跳过
      if (now >= expiresAt) continue

      const fromSect = SECTS[record.sourceSectId]
      if (!fromSect) continue

      requests.push({
        fromSectId: record.sourceSectId,
        fromSectName: fromSect.name,
        proposedAt,
        expiresAt,
        remainingMs: expiresAt - now
      })
    }

    return requests
  }

  /**
   * 检查宗门是否有盟友
   */
  async hasAnyAlliance(sectId: string): Promise<boolean> {
    // 我方对他方是盟友，且他方对我方也是盟友
    const myAlliances = await diplomacyRepository.find({
      where: { sourceSectId: sectId, status: 'allied' }
    })

    for (const alliance of myAlliances) {
      const theirRelation = await diplomacyRepository.findOne({
        where: { sourceSectId: alliance.targetSectId, targetSectId: sectId, status: 'allied' }
      })
      if (theirRelation) {
        return true
      }
    }

    return false
  }

  /**
   * 获取两个宗门之间的关系
   */
  async getRelation(
    sectId1: string,
    sectId2: string
  ): Promise<{
    ourStatus: DiplomacyStatus
    theirStatus: DiplomacyStatus
    isMutualAlliance: boolean
    isMutualHostile: boolean
    isMutualFriendly: boolean
  }> {
    const ourRecord = await diplomacyRepository.findOne({
      where: { sourceSectId: sectId1, targetSectId: sectId2 }
    })

    const theirRecord = await diplomacyRepository.findOne({
      where: { sourceSectId: sectId2, targetSectId: sectId1 }
    })

    const ourStatus: DiplomacyStatus = ourRecord?.status || 'neutral'
    const theirStatus: DiplomacyStatus = theirRecord?.status || 'neutral'

    return {
      ourStatus,
      theirStatus,
      isMutualAlliance: ourStatus === 'allied' && theirStatus === 'allied',
      isMutualHostile: ourStatus === 'hostile' || theirStatus === 'hostile',
      isMutualFriendly: ourStatus === 'friendly' && theirStatus === 'friendly'
    }
  }

  /**
   * 设置友好关系
   */
  async setFriendly(characterId: string, targetSectId: string): Promise<SetDiplomacyResult> {
    return this.setDiplomacyStatus(characterId, targetSectId, 'friendly')
  }

  /**
   * 设置敌对关系
   */
  async setHostile(characterId: string, targetSectId: string): Promise<SetDiplomacyResult> {
    return this.setDiplomacyStatus(characterId, targetSectId, 'hostile')
  }

  /**
   * 设置中立关系
   */
  async setNeutral(characterId: string, targetSectId: string): Promise<SetDiplomacyResult> {
    return this.setDiplomacyStatus(characterId, targetSectId, 'neutral')
  }

  /**
   * 设置外交状态（内部方法）
   */
  private async setDiplomacyStatus(characterId: string, targetSectId: string, newStatus: DiplomacyStatus): Promise<SetDiplomacyResult> {
    const character = await characterRepository.findOne({
      where: { id: characterId }
    })

    if (!character) {
      throw { code: ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, message: '角色不存在' }
    }

    if (!character.sectId) {
      throw { code: ERROR_CODES.DIPLOMACY_NOT_IN_SECT, message: '你还未加入任何宗门' }
    }

    const sectId = character.sectId

    // 不能对自己宗门操作
    if (sectId === targetSectId) {
      throw { code: ERROR_CODES.DIPLOMACY_SAME_SECT, message: '不能对自己宗门进行外交操作' }
    }

    // 检查目标宗门是否存在
    if (!SECTS[targetSectId]) {
      throw { code: ERROR_CODES.DIPLOMACY_TARGET_SECT_NOT_FOUND, message: '目标宗门不存在' }
    }

    // 检查是否是掌门
    const isMaster = await sectMasterService.isMaster(characterId, sectId)
    if (!isMaster) {
      throw { code: ERROR_CODES.DIPLOMACY_NOT_MASTER, message: '只有掌门才能进行外交操作' }
    }

    const now = Date.now()

    // 获取或创建外交记录
    let record = await diplomacyRepository.findOne({
      where: { sourceSectId: sectId, targetSectId }
    })

    // 检查24小时冷却
    if (record?.lastChangedAt) {
      const cooldownEnd = Number(record.lastChangedAt) + DIPLOMACY_CONFIG.statusChangeCooldownMs
      if (now < cooldownEnd) {
        const remainingHours = Math.ceil((cooldownEnd - now) / (60 * 60 * 1000))
        throw { code: ERROR_CODES.DIPLOMACY_COOLDOWN, message: `外交状态冷却中，还需等待${remainingHours}小时` }
      }
    }

    const oldStatus = record?.status || 'neutral'

    // 如果状态没有变化
    if (oldStatus === newStatus) {
      return {
        success: true,
        message: '外交状态未变',
        newStatus
      }
    }

    // 特殊处理：如果原来是结盟，解除结盟需要设置背盟惩罚
    if (oldStatus === 'allied' && newStatus !== 'allied') {
      await sectMasterService.setAlliancePenalty(sectId)
    }

    if (!record) {
      record = diplomacyRepository.create({
        sourceSectId: sectId,
        targetSectId,
        status: newStatus,
        createdAt: now,
        lastChangedAt: now,
        allianceProposedAt: null,
        allianceProposedBy: null
      })
    } else {
      record.status = newStatus
      record.lastChangedAt = now
      // 清除结盟请求
      record.allianceProposedAt = null
      record.allianceProposedBy = null
    }

    await diplomacyRepository.save(record)

    const targetSect = SECTS[targetSectId]
    const mySect = SECTS[sectId]
    const statusName = DIPLOMACY_STATUS_CONFIG[newStatus].name

    // 生成公告（敌对时需要全服公告）
    let announcement: string | undefined
    if (newStatus === 'hostile') {
      announcement = `【天机变】${mySect.name}向${targetSect.name}宣布敌对！`
      // 发送Socket全服公告
      emitDiplomacyAnnouncement({
        type: 'war_declared',
        message: announcement,
        sectIds: [sectId, targetSectId],
        timestamp: now
      })
    }

    // 背盟公告
    if (oldStatus === 'allied' && newStatus !== 'allied') {
      const breakAnnouncement = `【天机变】${mySect.name}背弃盟约，与${targetSect.name}解除同盟！`
      emitDiplomacyAnnouncement({
        type: 'alliance_broken',
        message: breakAnnouncement,
        sectIds: [sectId, targetSectId],
        timestamp: now
      })
      if (!announcement) {
        announcement = breakAnnouncement
      }
    }

    return {
      success: true,
      message: `已将与${targetSect.name}的关系设为${statusName}`,
      newStatus,
      announcement
    }
  }

  /**
   * 发起结盟请求
   */
  async proposeAlliance(characterId: string, targetSectId: string): Promise<SetDiplomacyResult> {
    const character = await characterRepository.findOne({
      where: { id: characterId }
    })

    if (!character) {
      throw { code: ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, message: '角色不存在' }
    }

    if (!character.sectId) {
      throw { code: ERROR_CODES.DIPLOMACY_NOT_IN_SECT, message: '你还未加入任何宗门' }
    }

    const sectId = character.sectId

    // 不能对自己宗门操作
    if (sectId === targetSectId) {
      throw { code: ERROR_CODES.DIPLOMACY_SAME_SECT, message: '不能对自己宗门进行外交操作' }
    }

    // 检查目标宗门是否存在
    if (!SECTS[targetSectId]) {
      throw { code: ERROR_CODES.DIPLOMACY_TARGET_SECT_NOT_FOUND, message: '目标宗门不存在' }
    }

    // 检查是否是掌门
    const isMaster = await sectMasterService.isMaster(characterId, sectId)
    if (!isMaster) {
      throw { code: ERROR_CODES.DIPLOMACY_NOT_MASTER, message: '只有掌门才能进行外交操作' }
    }

    // 检查背盟惩罚
    const hasPenalty = await sectMasterService.hasAlliancePenalty(sectId)
    if (hasPenalty) {
      throw { code: ERROR_CODES.DIPLOMACY_ALLIANCE_PENALTY, message: '背盟惩罚期间不能结盟' }
    }

    const now = Date.now()

    // 获取我方对目标的关系
    let ourRecord = await diplomacyRepository.findOne({
      where: { sourceSectId: sectId, targetSectId }
    })

    // 检查24小时冷却
    if (ourRecord?.lastChangedAt) {
      const cooldownEnd = Number(ourRecord.lastChangedAt) + DIPLOMACY_CONFIG.statusChangeCooldownMs
      if (now < cooldownEnd) {
        const remainingHours = Math.ceil((cooldownEnd - now) / (60 * 60 * 1000))
        throw { code: ERROR_CODES.DIPLOMACY_COOLDOWN, message: `外交状态冷却中，还需等待${remainingHours}小时` }
      }
    }

    // 检查是否已经是盟友
    if (ourRecord?.status === 'allied') {
      throw { code: ERROR_CODES.DIPLOMACY_ALREADY_ALLIED, message: '已经是盟友关系' }
    }

    // 必须先是友好关系才能发起结盟
    if (!ourRecord || ourRecord.status !== 'friendly') {
      throw { code: ERROR_CODES.DIPLOMACY_TARGET_NOT_FRIENDLY, message: '必须先设为友好关系才能发起结盟' }
    }

    // 检查对方是否也对我方友好
    const theirRecord = await diplomacyRepository.findOne({
      where: { sourceSectId: targetSectId, targetSectId: sectId }
    })

    if (!theirRecord || theirRecord.status !== 'friendly') {
      throw { code: ERROR_CODES.DIPLOMACY_TARGET_NOT_FRIENDLY, message: '对方尚未对我方示好，无法结盟' }
    }

    // 设置结盟请求
    ourRecord.allianceProposedAt = now
    ourRecord.allianceProposedBy = characterId

    await diplomacyRepository.save(ourRecord)

    const targetSect = SECTS[targetSectId]
    const mySect = SECTS[sectId]

    // 发送Socket通知给目标掌门
    const targetMasterId = await this.getMasterCharacterId(targetSectId)
    if (targetMasterId) {
      emitAllianceRequest(targetMasterId, {
        fromSectId: sectId,
        fromSectName: mySect.name,
        expiresAt: now + DIPLOMACY_CONFIG.allianceProposalExpiryMs
      })
    }

    return {
      success: true,
      message: `已向${targetSect.name}发起结盟请求，等待对方掌门接受（1小时有效）`
    }
  }

  /**
   * 接受结盟请求
   */
  async acceptAlliance(characterId: string, fromSectId: string): Promise<SetDiplomacyResult> {
    const character = await characterRepository.findOne({
      where: { id: characterId }
    })

    if (!character) {
      throw { code: ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, message: '角色不存在' }
    }

    if (!character.sectId) {
      throw { code: ERROR_CODES.DIPLOMACY_NOT_IN_SECT, message: '你还未加入任何宗门' }
    }

    const sectId = character.sectId

    // 不能对自己宗门操作
    if (sectId === fromSectId) {
      throw { code: ERROR_CODES.DIPLOMACY_SAME_SECT, message: '不能对自己宗门进行外交操作' }
    }

    // 检查发起宗门是否存在
    if (!SECTS[fromSectId]) {
      throw { code: ERROR_CODES.DIPLOMACY_TARGET_SECT_NOT_FOUND, message: '发起宗门不存在' }
    }

    // 检查是否是掌门
    const isMaster = await sectMasterService.isMaster(characterId, sectId)
    if (!isMaster) {
      throw { code: ERROR_CODES.DIPLOMACY_NOT_MASTER, message: '只有掌门才能进行外交操作' }
    }

    // 检查背盟惩罚
    const hasPenalty = await sectMasterService.hasAlliancePenalty(sectId)
    if (hasPenalty) {
      throw { code: ERROR_CODES.DIPLOMACY_ALLIANCE_PENALTY, message: '背盟惩罚期间不能结盟' }
    }

    const now = Date.now()

    // 检查对方是否有发起结盟请求
    const theirRecord = await diplomacyRepository.findOne({
      where: { sourceSectId: fromSectId, targetSectId: sectId }
    })

    if (!theirRecord || !theirRecord.allianceProposedAt) {
      throw { code: ERROR_CODES.DIPLOMACY_NO_PENDING_REQUEST, message: '没有待处理的结盟请求' }
    }

    // 检查请求是否过期
    const proposedAt = Number(theirRecord.allianceProposedAt)
    const expiresAt = proposedAt + DIPLOMACY_CONFIG.allianceProposalExpiryMs
    if (now >= expiresAt) {
      // 清除过期请求
      theirRecord.allianceProposedAt = null
      theirRecord.allianceProposedBy = null
      await diplomacyRepository.save(theirRecord)
      throw { code: ERROR_CODES.DIPLOMACY_PROPOSAL_EXPIRED, message: '结盟请求已过期' }
    }

    // 获取或创建我方对对方的记录
    let ourRecord = await diplomacyRepository.findOne({
      where: { sourceSectId: sectId, targetSectId: fromSectId }
    })

    if (!ourRecord) {
      ourRecord = diplomacyRepository.create({
        sourceSectId: sectId,
        targetSectId: fromSectId,
        status: 'allied',
        createdAt: now,
        lastChangedAt: now,
        allianceProposedAt: null,
        allianceProposedBy: null
      })
    } else {
      ourRecord.status = 'allied'
      ourRecord.lastChangedAt = now
      ourRecord.allianceProposedAt = null
      ourRecord.allianceProposedBy = null
    }

    // 更新双方状态为结盟
    theirRecord.status = 'allied'
    theirRecord.lastChangedAt = now
    theirRecord.allianceProposedAt = null
    theirRecord.allianceProposedBy = null

    await diplomacyRepository.save(ourRecord)
    await diplomacyRepository.save(theirRecord)

    const fromSect = SECTS[fromSectId]
    const mySect = SECTS[sectId]

    // 全服公告
    const announcement = `【天机变】${mySect.name}与${fromSect.name}正式缔结同盟！`

    // 发送Socket全服公告
    emitDiplomacyAnnouncement({
      type: 'alliance_formed',
      message: announcement,
      sectIds: [sectId, fromSectId],
      timestamp: now
    })

    return {
      success: true,
      message: `与${fromSect.name}结盟成功！`,
      newStatus: 'allied',
      announcement
    }
  }

  /**
   * 解除关系（设为中立）
   */
  async cancelRelation(characterId: string, targetSectId: string): Promise<SetDiplomacyResult> {
    return this.setDiplomacyStatus(characterId, targetSectId, 'neutral')
  }

  /**
   * 获取天下大势（公开查询）
   */
  async getWorldSituation(): Promise<WorldSituationResponse> {
    const alliances: WorldSituationItem[] = []
    const hostilities: WorldSituationItem[] = []

    // 获取所有结盟关系（双向确认的）
    const allRecords = await diplomacyRepository.find()

    // 用于去重（A-B和B-A是同一个同盟）
    const processedAlliances = new Set<string>()
    const processedHostilities = new Set<string>()

    for (const record of allRecords) {
      const sourceSect = SECTS[record.sourceSectId]
      const targetSect = SECTS[record.targetSectId]
      if (!sourceSect || !targetSect) continue

      if (record.status === 'allied') {
        // 检查是否是双向同盟
        const reverseRecord = await diplomacyRepository.findOne({
          where: { sourceSectId: record.targetSectId, targetSectId: record.sourceSectId, status: 'allied' }
        })

        if (reverseRecord) {
          // 去重：只记录一次
          const key = [record.sourceSectId, record.targetSectId].sort().join('-')
          if (!processedAlliances.has(key)) {
            processedAlliances.add(key)
            alliances.push({
              sourceSectId: record.sourceSectId,
              sourceSectName: sourceSect.name,
              targetSectId: record.targetSectId,
              targetSectName: targetSect.name,
              status: 'allied',
              createdAt: Number(record.lastChangedAt || record.createdAt)
            })
          }
        }
      } else if (record.status === 'hostile') {
        // 敌对是单向的，但也去重显示
        const key = [record.sourceSectId, record.targetSectId].sort().join('-')
        if (!processedHostilities.has(key)) {
          processedHostilities.add(key)
          hostilities.push({
            sourceSectId: record.sourceSectId,
            sourceSectName: sourceSect.name,
            targetSectId: record.targetSectId,
            targetSectName: targetSect.name,
            status: 'hostile',
            createdAt: Number(record.lastChangedAt || record.createdAt)
          })
        }
      }
    }

    return {
      alliances,
      hostilities,
      lastUpdated: Date.now()
    }
  }

  /**
   * 获取外交加成信息
   * 用于战斗系统调用
   */
  async getDiplomacyBonus(
    attackerSectId: string | null,
    defenderSectId: string | null
  ): Promise<{
    attackerPowerBonus: number // 攻击方战力加成
    defenderPowerBonus: number // 防御方战力加成
    cultivationBonus: number // 修为加成（敌对时）
    contributionBonus: number // 贡献加成（敌对时）
    lootPenalty: number // 掠夺惩罚（友好时）
    isHostile: boolean
    isFriendly: boolean
    isAllied: boolean
  }> {
    const result = {
      attackerPowerBonus: 0,
      defenderPowerBonus: 0,
      cultivationBonus: 0,
      contributionBonus: 0,
      lootPenalty: 0,
      isHostile: false,
      isFriendly: false,
      isAllied: false
    }

    // 任一方没有宗门则无加成
    if (!attackerSectId || !defenderSectId) {
      return result
    }

    // 同宗门无外交加成
    if (attackerSectId === defenderSectId) {
      return result
    }

    // 获取双方关系
    const relation = await this.getRelation(attackerSectId, defenderSectId)

    // 检查攻击方是否有盟友（结盟战力加成）
    const attackerHasAlliance = await this.hasAnyAlliance(attackerSectId)
    if (attackerHasAlliance) {
      result.attackerPowerBonus = DIPLOMACY_CONFIG.alliancePowerBonus
    }

    // 检查防御方是否有盟友
    const defenderHasAlliance = await this.hasAnyAlliance(defenderSectId)
    if (defenderHasAlliance) {
      result.defenderPowerBonus = DIPLOMACY_CONFIG.alliancePowerBonus
    }

    // 敌对关系加成（任一方敌对即生效）
    if (relation.isMutualHostile) {
      result.isHostile = true
      result.cultivationBonus = DIPLOMACY_CONFIG.hostileCultivationBonus
      result.contributionBonus = DIPLOMACY_CONFIG.hostileContributionBonus
    }

    // 友好关系惩罚（双方都友好）
    if (relation.isMutualFriendly) {
      result.isFriendly = true
      result.lootPenalty = DIPLOMACY_CONFIG.friendlyLootPenalty
    }

    // 结盟关系
    if (relation.isMutualAlliance) {
      result.isAllied = true
    }

    return result
  }

  /**
   * 初始化外交关系表（服务器启动时调用）
   */
  async initializeDiplomacy(): Promise<void> {
    const sectIds = Object.keys(SECTS)
    const now = Date.now()

    for (const sourceSectId of sectIds) {
      for (const targetSectId of sectIds) {
        if (sourceSectId === targetSectId) continue

        const existing = await diplomacyRepository.findOne({
          where: { sourceSectId, targetSectId }
        })

        if (!existing) {
          const record = diplomacyRepository.create({
            sourceSectId,
            targetSectId,
            status: 'neutral',
            createdAt: now,
            lastChangedAt: null,
            allianceProposedAt: null,
            allianceProposedBy: null
          })
          await diplomacyRepository.save(record)
        }
      }
    }

    console.log(`[Diplomacy] 外交关系初始化完成`)
  }

  /**
   * 获取指定宗门掌门的角色ID
   */
  async getMasterCharacterId(sectId: string): Promise<string | null> {
    const masterInfo = await sectMasterService.getMaster(sectId)
    return masterInfo?.masterId || null
  }

  /**
   * 获取指定宗门掌门的用户ID（用于Socket通知）
   */
  async getMasterUserId(sectId: string): Promise<string | null> {
    const masterId = await this.getMasterCharacterId(sectId)
    if (!masterId) return null

    const character = await characterRepository.findOne({
      where: { id: masterId }
    })

    return character?.userId || null
  }
}

export const diplomacyService = new DiplomacyService()
