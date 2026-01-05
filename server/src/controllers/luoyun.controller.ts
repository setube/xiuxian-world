/**
 * 落云宗控制器 - 灵眼之树系统
 */
import { Request, Response } from 'express'
import { luoyunService } from '../services/luoyun.service'

/**
 * 获取落云宗状态（灵树状态 + 个人贡献 + 排名）
 */
export const getStatus = async (req: Request, res: Response) => {
  try {
    const characterId = req.characterId!
    const status = await luoyunService.getStatus(characterId)
    res.json({ success: true, data: status })
  } catch (error: any) {
    res.status(400).json({
      success: false,
      code: error.code || 500,
      message: error.message || '获取状态失败'
    })
  }
}

/**
 * 浇灌灵树
 */
export const waterTree = async (req: Request, res: Response) => {
  try {
    const characterId = req.characterId!
    const result = await luoyunService.waterTree(characterId)
    res.json({ success: true, data: result })
  } catch (error: any) {
    res.status(400).json({
      success: false,
      code: error.code || 500,
      message: error.message || '浇灌失败'
    })
  }
}

/**
 * 献祭妖丹
 */
export const offerPill = async (req: Request, res: Response) => {
  try {
    const characterId = req.characterId!
    const { tier, count } = req.body

    if (!tier || !count || count < 1) {
      return res.status(400).json({
        success: false,
        code: 400,
        message: '请指定妖丹等级和数量'
      })
    }

    const result = await luoyunService.offerPill(characterId, tier, count)
    res.json({ success: true, data: result })
  } catch (error: any) {
    res.status(400).json({
      success: false,
      code: error.code || 500,
      message: error.message || '献祭失败'
    })
  }
}

/**
 * 参与防御入侵
 */
export const defend = async (req: Request, res: Response) => {
  try {
    const characterId = req.characterId!
    const result = await luoyunService.defend(characterId)
    res.json({ success: true, data: result })
  } catch (error: any) {
    res.status(400).json({
      success: false,
      code: error.code || 500,
      message: error.message || '参与防御失败'
    })
  }
}

/**
 * 领取收获奖励
 */
export const claimHarvest = async (req: Request, res: Response) => {
  try {
    const characterId = req.characterId!
    const result = await luoyunService.claimHarvest(characterId)
    res.json({ success: true, data: result })
  } catch (error: any) {
    res.status(400).json({
      success: false,
      code: error.code || 500,
      message: error.message || '领取奖励失败'
    })
  }
}

/**
 * 获取贡献排行榜
 */
export const getRankings = async (req: Request, res: Response) => {
  try {
    const characterId = req.characterId!
    const limit = parseInt(req.query.limit as string) || 20
    const rankings = await luoyunService.getRankingList(characterId, limit)
    res.json({ success: true, data: rankings })
  } catch (error: any) {
    res.status(400).json({
      success: false,
      code: error.code || 500,
      message: error.message || '获取排行榜失败'
    })
  }
}

/**
 * 使用灵眼之液
 */
export const useLiquid = async (req: Request, res: Response) => {
  try {
    const characterId = req.characterId!
    const { effect } = req.body

    if (!effect || !['root', 'herb'].includes(effect)) {
      return res.status(400).json({
        success: false,
        code: 400,
        message: '请指定使用效果：root（升级灵根）或 herb（催熟灵草）'
      })
    }

    const result = await luoyunService.useLiquid(characterId, effect)
    res.json({ success: true, data: result })
  } catch (error: any) {
    res.status(400).json({
      success: false,
      code: error.code || 500,
      message: error.message || '使用灵眼之液失败'
    })
  }
}

/**
 * 满足当前环境需求
 */
export const satisfyEnvironment = async (req: Request, res: Response) => {
  try {
    const characterId = req.characterId!
    const result = await luoyunService.satisfyEnvironment(characterId)
    res.json({ success: true, data: result })
  } catch (error: any) {
    res.status(400).json({
      success: false,
      code: error.code || 500,
      message: error.message || '满足环境失败'
    })
  }
}
