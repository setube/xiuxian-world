import { AppDataSource } from '../config/database'
import { Character } from '../models/Character'
import { User } from '../models/User'
import { SPIRIT_ROOTS, randomSpiritRoot, type SpiritRoot } from '../game/constants/spiritRoots'
import { SECTS, getSectRankInfo, type SectRank } from '../game/constants/sects'

const characterRepository = AppDataSource.getRepository(Character)
const userRepository = AppDataSource.getRepository(User)

export interface CreateCharacterDto {
  name: string
  userId: string
  spiritRootId?: string // 可选，不传则随机
}

export class PlayerService {
  async createCharacter(data: CreateCharacterDto): Promise<Character> {
    // 检查用户是否存在
    const user = await userRepository.findOne({ where: { id: data.userId } })
    if (!user) {
      throw new Error('用户不存在')
    }

    // 检查是否已有角色
    const existingCharacter = await characterRepository.findOne({
      where: { userId: data.userId }
    })
    if (existingCharacter) {
      throw new Error('已拥有角色，不能重复创建')
    }

    // 检查角色名是否被使用
    const nameExists = await characterRepository.findOne({
      where: { name: data.name }
    })
    if (nameExists) {
      throw new Error('角色名已被使用')
    }

    // 确定灵根
    let spiritRootId = data.spiritRootId
    if (!spiritRootId || !SPIRIT_ROOTS[spiritRootId]) {
      spiritRootId = randomSpiritRoot().id
    }

    const spiritRoot = SPIRIT_ROOTS[spiritRootId]
    const rootAttrs = spiritRoot.attributes || {}

    // 创建角色
    const character = characterRepository.create({
      userId: data.userId,
      name: data.name,
      spiritRootId,
      realmId: 1, // 默认炼气期初期
      // 根据灵根属性设置初始属性
      attack: 10 + (rootAttrs.attack || 0),
      defense: 5 + (rootAttrs.defense || 0),
      speed: 10 + (rootAttrs.speed || 0),
      luck: 1 + (rootAttrs.luck || 0)
    })

    const savedCharacter = await characterRepository.save(character)

    // 重新加载以获取关联的 realm
    return (await characterRepository.findOne({
      where: { id: savedCharacter.id },
      relations: ['realm']
    })) as Character
  }

  async getCharacter(characterId: string): Promise<Character | null> {
    return await characterRepository.findOne({
      where: { id: characterId },
      relations: ['realm', 'user']
    })
  }

  async getCharacterByUserId(userId: string): Promise<Character | null> {
    return await characterRepository.findOne({
      where: { userId },
      relations: ['realm']
    })
  }

  async updateCharacter(characterId: string, data: Partial<Character>): Promise<Character> {
    const character = await characterRepository.findOne({
      where: { id: characterId }
    })

    if (!character) {
      throw new Error('角色不存在')
    }

    Object.assign(character, data)
    return await characterRepository.save(character)
  }

  async getCharacterStats(characterId: string) {
    const character = await characterRepository.findOne({
      where: { id: characterId },
      relations: ['realm']
    })

    if (!character) {
      throw new Error('角色不存在')
    }

    // 获取灵根信息
    const spiritRoot = SPIRIT_ROOTS[character.spiritRootId]

    // 计算最终属性（基础属性 + 境界加成）
    const realm = character.realm

    // 获取宗门信息
    let sectInfo = null
    if (character.sectId && SECTS[character.sectId]) {
      const sect = SECTS[character.sectId]
      const rankInfo = getSectRankInfo(character.sectRank as SectRank)
      sectInfo = {
        id: character.sectId,
        name: sect.name,
        rank: character.sectRank,
        rankName: rankInfo?.name || '外门弟子',
        contribution: character.sectContribution
      }
    }

    return {
      id: character.id,
      name: character.name,
      spiritRootId: character.spiritRootId,
      spiritRoot: spiritRoot || null,
      level: character.level,
      experience: character.experience,
      spiritStones: character.spiritStones,
      realm: realm
        ? {
            id: realm.id,
            name: realm.name,
            tier: realm.tier,
            subTier: realm.subTier
          }
        : null,
      // 实时计算境界进度，而非使用存储值
      realmProgress: realm
        ? Math.min(100, Math.floor((Number(character.experience) / Number(realm.requiredExperience)) * 100))
        : 0,
      stats: {
        hp: character.hp,
        maxHp: character.maxHp + (realm?.hpBonus || 0),
        mp: character.mp,
        maxMp: character.maxMp + (realm?.mpBonus || 0),
        attack: character.attack + (realm?.attackBonus || 0),
        defense: character.defense + (realm?.defenseBonus || 0),
        speed: character.speed,
        luck: character.luck
      },
      cultivation: {
        isCultivating: character.isCultivating,
        startedAt: character.cultivationStartedAt,
        currentSkillId: character.currentSkillId,
        activityPoints: character.activityPoints,
        peaceMode: character.peaceMode
      },
      sect: sectInfo,
      // 丹魔之咒状态
      curse:
        character.curseType && character.curseExpiresAt && Number(character.curseExpiresAt) > Date.now()
          ? {
              type: character.curseType,
              casterName: character.curseCasterName,
              expiresAt: Number(character.curseExpiresAt),
              remainingTime: Number(character.curseExpiresAt) - Date.now()
            }
          : null
    }
  }

  // 保存待确认的角色名
  async setPendingName(userId: string, name: string): Promise<void> {
    const user = await userRepository.findOne({ where: { id: userId } })
    if (!user) {
      throw new Error('用户不存在')
    }

    // 检查是否已有角色
    const existingCharacter = await characterRepository.findOne({
      where: { userId }
    })
    if (existingCharacter) {
      throw new Error('已拥有角色，不能重复创建')
    }

    // 检查角色名是否被使用
    const nameExists = await characterRepository.findOne({
      where: { name }
    })
    if (nameExists) {
      throw new Error('角色名已被使用')
    }

    // 保存待确认的角色名
    user.pendingCharacterName = name
    await userRepository.save(user)
  }

  // 获取待确认的角色名
  async getPendingName(userId: string): Promise<string | null> {
    const user = await userRepository.findOne({ where: { id: userId } })
    return user?.pendingCharacterName || null
  }

  // 灵根检测并创建角色
  async detectSpiritRootAndCreateCharacter(userId: string): Promise<{
    character: Character
    spiritRoot: SpiritRoot
  }> {
    const user = await userRepository.findOne({ where: { id: userId } })
    if (!user) {
      throw new Error('用户不存在')
    }

    if (!user.pendingCharacterName) {
      throw new Error('请先设置角色名')
    }

    // 检查是否已有角色
    const existingCharacter = await characterRepository.findOne({
      where: { userId }
    })
    if (existingCharacter) {
      throw new Error('已拥有角色，不能重复创建')
    }

    // 再次检查角色名是否被使用（防止并发）
    const nameExists = await characterRepository.findOne({
      where: { name: user.pendingCharacterName }
    })
    if (nameExists) {
      throw new Error('角色名已被使用')
    }

    // 随机灵根
    const spiritRoot = randomSpiritRoot()
    const rootAttrs = spiritRoot.attributes || {}

    // 创建角色
    const character = characterRepository.create({
      userId,
      name: user.pendingCharacterName,
      spiritRootId: spiritRoot.id,
      realmId: 1,
      attack: 10 + (rootAttrs.attack || 0),
      defense: 5 + (rootAttrs.defense || 0),
      speed: 10 + (rootAttrs.speed || 0),
      luck: 1 + (rootAttrs.luck || 0)
    })

    const savedCharacter = await characterRepository.save(character)

    // 清除待确认的角色名
    user.pendingCharacterName = null
    await userRepository.save(user)

    // 重新加载以获取关联的 realm
    const fullCharacter = await characterRepository.findOne({
      where: { id: savedCharacter.id },
      relations: ['realm']
    })

    return {
      character: fullCharacter as Character,
      spiritRoot
    }
  }
}

export const playerService = new PlayerService()
