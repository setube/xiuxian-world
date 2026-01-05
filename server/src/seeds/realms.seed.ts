import { AppDataSource } from '../config/database'
import { Realm } from '../models/Realm'
import { generateRealmConfigs } from '../game/constants/realms'

export async function seedRealms() {
  const realmRepository = AppDataSource.getRepository(Realm)

  const configs = generateRealmConfigs()
  let insertedCount = 0

  for (const config of configs) {
    // 检查该境界是否已存在
    const existing = await realmRepository.findOne({
      where: { tier: config.tier, subTier: config.subTier }
    })

    if (!existing) {
      const realm = realmRepository.create({
        name: config.name,
        tier: config.tier,
        subTier: config.subTier,
        requiredExperience: config.requiredExperience,
        breakthroughDifficulty: config.breakthroughDifficulty,
        hpBonus: config.hpBonus,
        mpBonus: config.mpBonus,
        attackBonus: config.attackBonus,
        defenseBonus: config.defenseBonus
      })
      await realmRepository.save(realm)
      insertedCount++
    }
  }

  if (insertedCount > 0) {
    console.log(`✅ 已补充 ${insertedCount} 个缺失的境界数据`)
  } else {
    console.log('境界数据完整，无需补充')
  }
}
