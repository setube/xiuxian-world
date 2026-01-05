import { AppDataSource } from '../config/database'
import { Character } from '../models/Character'
import { SPIRIT_ROOTS } from '../game/constants/spiritRoots'

const characterRepository = AppDataSource.getRepository(Character)

export type RankingType = 'cultivation' | 'evil' | 'power' | 'pvpKills' | 'loot'

export interface RankingEntry {
  rank: number
  characterId: string
  name: string
  value: number
  sectId: string | null
  sectName: string | null
  realmTier: number
  realmSubTier: number
  realmName: string
}

export interface PlayerRanking {
  type: RankingType
  rank: number
  value: number
  total: number
}

/**
 * 排行榜服务
 * 提供修为榜、恶人榜、战力榜等排行功能
 */
class RankingService {
  /**
   * 获取修为榜（按经验值排序）
   */
  async getCultivationRanking(limit: number = 50, offset: number = 0): Promise<RankingEntry[]> {
    const characters = await characterRepository
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.realm', 'realm')
      .orderBy('c.experience', 'DESC')
      .skip(offset)
      .take(limit)
      .getMany()

    return this.buildRankingEntries(characters, 'cultivation', offset)
  }

  /**
   * 获取恶人榜（按恶人值排序）
   */
  async getEvilRanking(limit: number = 50, offset: number = 0): Promise<RankingEntry[]> {
    const characters = await characterRepository
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.realm', 'realm')
      .where('c.evilPoints > 0')
      .orderBy('c.evilPoints', 'DESC')
      .skip(offset)
      .take(limit)
      .getMany()

    return this.buildRankingEntries(characters, 'evil', offset)
  }

  /**
   * 获取战力榜
   * 注意：战力需要计算，无法直接SQL排序
   * 优化方案：只获取近30天活跃的玩家，减少计算量
   * TODO: 未来可添加 combatPower 字段到 Character 模型，在属性变化时更新
   */
  async getPowerRanking(limit: number = 50, offset: number = 0): Promise<RankingEntry[]> {
    // 只获取近30天活跃的角色以优化性能
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const activeCharacters = await characterRepository
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.realm', 'realm')
      .where('c.updatedAt >= :thirtyDaysAgo', { thirtyDaysAgo })
      .getMany()

    // 计算每个角色的战力
    const charactersWithPower = activeCharacters.map(c => ({
      character: c,
      power: this.calculateCombatPower(c)
    }))

    // 按战力排序
    charactersWithPower.sort((a, b) => b.power - a.power)

    // 分页
    const paged = charactersWithPower.slice(offset, offset + limit)

    return paged.map((item, index) => ({
      rank: offset + index + 1,
      characterId: item.character.id,
      name: item.character.name,
      value: item.power,
      sectId: item.character.sectId,
      sectName: this.getSectName(item.character.sectId),
      realmTier: item.character.realm?.tier || 1,
      realmSubTier: item.character.realm?.subTier || 1,
      realmName: this.getRealmDisplayName(item.character.realm?.tier, item.character.realm?.subTier)
    }))
  }

  /**
   * 获取PvP击杀榜
   */
  async getPvpKillsRanking(limit: number = 50, offset: number = 0): Promise<RankingEntry[]> {
    const characters = await characterRepository
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.realm', 'realm')
      .where('c.pvpKills > 0')
      .orderBy('c.pvpKills', 'DESC')
      .skip(offset)
      .take(limit)
      .getMany()

    return this.buildRankingEntries(characters, 'pvpKills', offset)
  }

  /**
   * 获取掠夺榜（总掠夺灵石）
   */
  async getLootRanking(limit: number = 50, offset: number = 0): Promise<RankingEntry[]> {
    const characters = await characterRepository
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.realm', 'realm')
      .where('c.totalLootedSpiritStones > 0')
      .orderBy('c.totalLootedSpiritStones', 'DESC')
      .skip(offset)
      .take(limit)
      .getMany()

    return this.buildRankingEntries(characters, 'loot', offset)
  }

  /**
   * 获取玩家在指定榜单的排名
   */
  async getPlayerRank(characterId: string, type: RankingType): Promise<PlayerRanking> {
    const character = await characterRepository.findOne({
      where: { id: characterId },
      relations: ['realm']
    })

    if (!character) {
      throw new Error('角色不存在')
    }

    let rank = 0
    let value = 0
    let total = 0

    switch (type) {
      case 'cultivation': {
        value = Number(character.experience)
        const higher = await characterRepository
          .createQueryBuilder('c')
          .where('c.experience > :exp', { exp: character.experience })
          .getCount()
        rank = higher + 1
        total = await characterRepository.count()
        break
      }

      case 'evil': {
        value = character.evilPoints
        if (value > 0) {
          const higher = await characterRepository
            .createQueryBuilder('c')
            .where('c.evilPoints > :points', { points: character.evilPoints })
            .getCount()
          rank = higher + 1
        } else {
          rank = 0 // 未上榜
        }
        total = await characterRepository
          .createQueryBuilder('c')
          .where('c.evilPoints > 0')
          .getCount()
        break
      }

      case 'power': {
        value = this.calculateCombatPower(character)
        // 只获取近30天活跃的角色以优化性能
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        const activeCharacters = await characterRepository
          .createQueryBuilder('c')
          .where('c.updatedAt >= :thirtyDaysAgo', { thirtyDaysAgo })
          .getMany()
        const powers = activeCharacters.map(c => this.calculateCombatPower(c))
        rank = powers.filter(p => p > value).length + 1
        total = activeCharacters.length
        break
      }

      case 'pvpKills': {
        value = character.pvpKills
        if (value > 0) {
          const higher = await characterRepository
            .createQueryBuilder('c')
            .where('c.pvpKills > :kills', { kills: character.pvpKills })
            .getCount()
          rank = higher + 1
        } else {
          rank = 0
        }
        total = await characterRepository
          .createQueryBuilder('c')
          .where('c.pvpKills > 0')
          .getCount()
        break
      }

      case 'loot': {
        value = Number(character.totalLootedSpiritStones)
        if (value > 0) {
          const higher = await characterRepository
            .createQueryBuilder('c')
            .where('c.totalLootedSpiritStones > :loot', { loot: character.totalLootedSpiritStones })
            .getCount()
          rank = higher + 1
        } else {
          rank = 0
        }
        total = await characterRepository
          .createQueryBuilder('c')
          .where('c.totalLootedSpiritStones > 0')
          .getCount()
        break
      }
    }

    return { type, rank, value, total }
  }

  /**
   * 更新恶人值
   */
  async updateEvilPoints(characterId: string, points: number): Promise<void> {
    await characterRepository
      .createQueryBuilder()
      .update(Character)
      .set({
        evilPoints: () => `"evilPoints" + ${points}`
      })
      .where('id = :id', { id: characterId })
      .execute()
  }

  /**
   * 更新PvP击杀数
   */
  async updatePvpKills(characterId: string, kills: number = 1): Promise<void> {
    await characterRepository
      .createQueryBuilder()
      .update(Character)
      .set({
        pvpKills: () => `"pvpKills" + ${kills}`
      })
      .where('id = :id', { id: characterId })
      .execute()
  }

  /**
   * 更新掠夺灵石数
   */
  async updateLootedSpiritStones(characterId: string, amount: number): Promise<void> {
    await characterRepository
      .createQueryBuilder()
      .update(Character)
      .set({
        totalLootedSpiritStones: () => `"totalLootedSpiritStones" + ${amount}`
      })
      .where('id = :id', { id: characterId })
      .execute()
  }

  /**
   * 计算战力值
   */
  private calculateCombatPower(character: Character): number {
    // 获取灵根加成
    const spiritRoot = SPIRIT_ROOTS[character.spiritRootId]
    const combatBonus = spiritRoot?.combatPowerBonus || 0

    // 基础战力
    const basePower =
      character.maxHp * 0.5 +
      character.attack * 3 +
      character.defense * 2 +
      character.speed * 1.5 +
      character.luck * 0.5

    // 境界加成
    const realmTier = character.realm?.tier || 1
    const realmSubTier = character.realm?.subTier || 1
    const realmBonus = (realmTier - 1) * 100 + (realmSubTier - 1) * 20

    // 总战力 = 基础战力 * (1 + 灵根加成%) + 境界加成
    return Math.floor(basePower * (1 + combatBonus / 100) + realmBonus)
  }

  /**
   * 构建排行榜条目
   */
  private buildRankingEntries(
    characters: Character[],
    type: RankingType,
    offset: number
  ): RankingEntry[] {
    return characters.map((c, index) => {
      let value = 0
      switch (type) {
        case 'cultivation':
          value = Number(c.experience)
          break
        case 'evil':
          value = c.evilPoints
          break
        case 'pvpKills':
          value = c.pvpKills
          break
        case 'loot':
          value = Number(c.totalLootedSpiritStones)
          break
        case 'power':
          value = this.calculateCombatPower(c)
          break
      }

      return {
        rank: offset + index + 1,
        characterId: c.id,
        name: c.name,
        value,
        sectId: c.sectId,
        sectName: this.getSectName(c.sectId),
        realmTier: c.realm?.tier || 1,
        realmSubTier: c.realm?.subTier || 1,
        realmName: this.getRealmDisplayName(c.realm?.tier, c.realm?.subTier)
      }
    })
  }

  /**
   * 获取宗门名称
   */
  private getSectName(sectId: string | null): string | null {
    if (!sectId) return null

    const sectNames: Record<string, string> = {
      huangfeng: '黄枫谷',
      taiyi: '太一门',
      starpalace: '星宫',
      heisha: '黑煞教',
      wanling: '万灵宗',
      luoyun: '落云宗',
      yuanying: '元婴宗'
    }

    return sectNames[sectId] || null
  }

  /**
   * 获取境界显示名称
   */
  private getRealmDisplayName(tier?: number, subTier?: number): string {
    const tierNames = ['炼气', '筑基', '结丹', '元婴', '化神', '炼虚', '合体', '大乘', '渡劫']
    const subTierNames = ['初期', '中期', '后期', '圆满']

    const tierName = tierNames[(tier || 1) - 1] || '炼气'
    const subTierName = subTierNames[(subTier || 1) - 1] || '初期'

    return `${tierName}${subTierName}`
  }
}

export const rankingService = new RankingService()
