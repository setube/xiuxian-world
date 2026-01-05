/**
 * 宗门掌门服务
 * 负责掌门选举和查询
 */
import { AppDataSource } from '../config/database'
import { Character } from '../models/Character'
import { SectMaster } from '../models/SectMaster'
import { SECTS } from '../game/constants/sects'
import { DIPLOMACY_CONFIG, type MasterInfo } from '../game/constants/diplomacy'
import { MoreThanOrEqual, And, Or, LessThan, Not, IsNull } from 'typeorm'

const characterRepository = AppDataSource.getRepository(Character)
const sectMasterRepository = AppDataSource.getRepository(SectMaster)

export class SectMasterService {
  /**
   * 获取宗门掌门信息
   */
  async getMaster(sectId: string): Promise<MasterInfo | null> {
    const sect = SECTS[sectId]
    if (!sect) {
      return null
    }

    // 查找或创建掌门记录
    let master = await sectMasterRepository.findOne({
      where: { sectId }
    })

    if (!master) {
      // 初始化掌门记录
      master = sectMasterRepository.create({
        sectId,
        masterId: null,
        masterName: null,
        masterExperience: null,
        masterRealmTier: null,
        masterRealmSubTier: null,
        updatedAt: Date.now(),
        alliancePenaltyUntil: null
      })
      await sectMasterRepository.save(master)
    }

    return {
      sectId: master.sectId,
      sectName: sect.name,
      masterId: master.masterId,
      masterName: master.masterName,
      masterExperience: master.masterExperience,
      masterRealmTier: master.masterRealmTier,
      masterRealmSubTier: master.masterRealmSubTier,
      updatedAt: master.updatedAt
    }
  }

  /**
   * 检查角色是否是指定宗门的掌门
   */
  async isMaster(characterId: string, sectId?: string): Promise<boolean> {
    // 如果提供了sectId，检查特定宗门
    if (sectId) {
      const master = await sectMasterRepository.findOne({
        where: { sectId, masterId: characterId }
      })
      return !!master
    }

    // 否则检查是否是任意宗门的掌门
    const master = await sectMasterRepository.findOne({
      where: { masterId: characterId }
    })
    return !!master
  }

  /**
   * 获取角色所属宗门的掌门信息
   */
  async getMasterByCharacter(characterId: string): Promise<MasterInfo | null> {
    const character = await characterRepository.findOne({
      where: { id: characterId }
    })

    if (!character || !character.sectId) {
      return null
    }

    return this.getMaster(character.sectId)
  }

  /**
   * 获取所有宗门的掌门列表
   */
  async getAllMasters(): Promise<MasterInfo[]> {
    const sectIds = Object.keys(SECTS)
    const masters: MasterInfo[] = []

    for (const sectId of sectIds) {
      const masterInfo = await this.getMaster(sectId)
      if (masterInfo) {
        masters.push(masterInfo)
      }
    }

    return masters
  }

  /**
   * 检查角色是否满足掌门条件
   * 结丹后期及以上: (tier > 3) OR (tier == 3 AND subTier >= 3)
   */
  private isEligibleForMaster(realmTier: number, realmSubTier: number): boolean {
    const minTier = DIPLOMACY_CONFIG.masterMinRealmTier
    const minSubTier = DIPLOMACY_CONFIG.masterMinRealmSubTier

    if (realmTier > minTier) {
      return true
    }
    if (realmTier === minTier && realmSubTier >= minSubTier) {
      return true
    }
    return false
  }

  /**
   * 选举单个宗门的掌门
   * 规则：从满足条件的成员中选择修为最高者
   */
  async electMaster(sectId: string): Promise<{
    success: boolean
    previousMasterId: string | null
    newMasterId: string | null
    newMasterName: string | null
    changed: boolean
  }> {
    const sect = SECTS[sectId]
    if (!sect) {
      return {
        success: false,
        previousMasterId: null,
        newMasterId: null,
        newMasterName: null,
        changed: false
      }
    }

    // 获取当前掌门记录
    let masterRecord = await sectMasterRepository.findOne({
      where: { sectId }
    })

    const previousMasterId = masterRecord?.masterId || null

    // 查询所有满足条件的宗门成员
    // 条件: (tier > 3) OR (tier == 3 AND subTier >= 3)
    const minTier = DIPLOMACY_CONFIG.masterMinRealmTier
    const minSubTier = DIPLOMACY_CONFIG.masterMinRealmSubTier

    // 使用QueryBuilder进行复杂查询
    const eligibleMembers = await characterRepository
      .createQueryBuilder('character')
      .leftJoinAndSelect('character.realm', 'realm')
      .where('character.sectId = :sectId', { sectId })
      .andWhere('(realm.tier > :minTier OR (realm.tier = :minTier AND realm.subTier >= :minSubTier))', { minTier, minSubTier })
      .orderBy('character.experience', 'DESC')
      .limit(1)
      .getMany()

    const newMaster = eligibleMembers[0] || null
    const now = Date.now()

    if (!masterRecord) {
      // 创建新记录
      masterRecord = sectMasterRepository.create({
        sectId,
        masterId: newMaster?.id || null,
        masterName: newMaster?.name || null,
        masterExperience: newMaster ? Number(newMaster.experience) : null,
        masterRealmTier: newMaster?.realm?.tier || null,
        masterRealmSubTier: newMaster?.realm?.subTier || null,
        updatedAt: now,
        alliancePenaltyUntil: null
      })
    } else {
      // 更新记录
      masterRecord.masterId = newMaster?.id || null
      masterRecord.masterName = newMaster?.name || null
      masterRecord.masterExperience = newMaster ? Number(newMaster.experience) : null
      masterRecord.masterRealmTier = newMaster?.realm?.tier || null
      masterRecord.masterRealmSubTier = newMaster?.realm?.subTier || null
      masterRecord.updatedAt = now
    }

    await sectMasterRepository.save(masterRecord)

    const changed = previousMasterId !== masterRecord.masterId

    return {
      success: true,
      previousMasterId,
      newMasterId: masterRecord.masterId,
      newMasterName: masterRecord.masterName,
      changed
    }
  }

  /**
   * 选举所有宗门的掌门（定时任务调用）
   */
  async electAllMasters(): Promise<{
    total: number
    changed: number
    results: Array<{
      sectId: string
      sectName: string
      previousMasterId: string | null
      newMasterId: string | null
      newMasterName: string | null
      changed: boolean
    }>
  }> {
    const sectIds = Object.keys(SECTS)
    const results: Array<{
      sectId: string
      sectName: string
      previousMasterId: string | null
      newMasterId: string | null
      newMasterName: string | null
      changed: boolean
    }> = []

    let changedCount = 0

    for (const sectId of sectIds) {
      const result = await this.electMaster(sectId)
      const sect = SECTS[sectId]

      results.push({
        sectId,
        sectName: sect?.name || sectId,
        previousMasterId: result.previousMasterId,
        newMasterId: result.newMasterId,
        newMasterName: result.newMasterName,
        changed: result.changed
      })

      if (result.changed) {
        changedCount++
      }
    }

    console.log(`[SectMaster] 掌门选举完成: ${changedCount}/${sectIds.length} 个宗门掌门变更`)

    return {
      total: sectIds.length,
      changed: changedCount,
      results
    }
  }

  /**
   * 设置背盟惩罚
   */
  async setAlliancePenalty(sectId: string): Promise<void> {
    const masterRecord = await sectMasterRepository.findOne({
      where: { sectId }
    })

    if (masterRecord) {
      masterRecord.alliancePenaltyUntil = Date.now() + DIPLOMACY_CONFIG.alliancePenaltyMs
      await sectMasterRepository.save(masterRecord)
    }
  }

  /**
   * 检查是否在背盟惩罚期间
   */
  async hasAlliancePenalty(sectId: string): Promise<boolean> {
    const masterRecord = await sectMasterRepository.findOne({
      where: { sectId }
    })

    if (!masterRecord || !masterRecord.alliancePenaltyUntil) {
      return false
    }

    return Date.now() < masterRecord.alliancePenaltyUntil
  }

  /**
   * 获取背盟惩罚截止时间
   */
  async getAlliancePenaltyUntil(sectId: string): Promise<number | null> {
    const masterRecord = await sectMasterRepository.findOne({
      where: { sectId }
    })

    if (!masterRecord || !masterRecord.alliancePenaltyUntil) {
      return null
    }

    if (Date.now() >= masterRecord.alliancePenaltyUntil) {
      return null
    }

    return masterRecord.alliancePenaltyUntil
  }

  /**
   * 初始化所有宗门的掌门记录
   * 在服务器启动时调用
   */
  async initializeAllMasters(): Promise<void> {
    const sectIds = Object.keys(SECTS)

    for (const sectId of sectIds) {
      const existing = await sectMasterRepository.findOne({
        where: { sectId }
      })

      if (!existing) {
        const master = sectMasterRepository.create({
          sectId,
          masterId: null,
          masterName: null,
          masterExperience: null,
          masterRealmTier: null,
          masterRealmSubTier: null,
          updatedAt: Date.now(),
          alliancePenaltyUntil: null
        })
        await sectMasterRepository.save(master)
      }
    }

    console.log(`[SectMaster] 初始化完成: ${sectIds.length} 个宗门掌门记录`)
  }

  /**
   * 更新掌门信息缓存（当角色信息变更时调用）
   */
  async refreshMasterCache(characterId: string): Promise<void> {
    // 查找该角色是否是某个宗门的掌门
    const masterRecord = await sectMasterRepository.findOne({
      where: { masterId: characterId }
    })

    if (!masterRecord) {
      return
    }

    // 获取角色最新信息
    const character = await characterRepository.findOne({
      where: { id: characterId },
      relations: ['realm']
    })

    if (!character) {
      return
    }

    // 更新缓存
    masterRecord.masterName = character.name
    masterRecord.masterExperience = Number(character.experience)
    masterRecord.masterRealmTier = character.realm?.tier || null
    masterRecord.masterRealmSubTier = character.realm?.subTier || null
    masterRecord.updatedAt = Date.now()

    await sectMasterRepository.save(masterRecord)
  }
}

export const sectMasterService = new SectMasterService()
