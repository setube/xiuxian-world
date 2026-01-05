/**
 * 虚空裂缝探索控制器
 */
import { Request, Response, NextFunction } from 'express'
import { riftExploreService } from '../services/riftExplore.service'

/**
 * 获取裂缝探索状态
 */
export async function getStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const characterId = req.characterId
    if (!characterId) {
      return res.status(400).json({ code: 'NO_CHARACTER', message: '未选择角色' })
    }

    const status = await riftExploreService.getStatus(characterId)
    res.json({ code: 'SUCCESS', data: status })
  } catch (error) {
    next(error)
  }
}

/**
 * 进行裂缝探索
 */
export async function explore(req: Request, res: Response, next: NextFunction) {
  try {
    const characterId = req.characterId
    if (!characterId) {
      return res.status(400).json({ code: 'NO_CHARACTER', message: '未选择角色' })
    }

    const result = await riftExploreService.explore(characterId)
    res.json({ code: 'SUCCESS', data: result })
  } catch (error) {
    next(error)
  }
}
