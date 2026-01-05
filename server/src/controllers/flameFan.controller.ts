import { Request, Response } from 'express'
import { flameFanService } from '../services/flameFan.service'

class FlameFanController {
  /**
   * 获取七焰扇状态
   */
  async getStatus(req: Request, res: Response) {
    try {
      const characterId = req.characterId
      if (!characterId) {
        return res.status(400).json({ message: '未选择角色' })
      }

      const status = await flameFanService.getStatus(characterId)
      return res.json({ data: status })
    } catch (error) {
      const message = error instanceof Error ? error.message : '获取状态失败'
      return res.status(500).json({ message })
    }
  }

  /**
   * 炼制火焰扇
   */
  async craft(req: Request, res: Response) {
    try {
      const characterId = req.characterId
      if (!characterId) {
        return res.status(400).json({ message: '未选择角色' })
      }

      const { type } = req.body
      if (!type || !['three_flame_fan', 'seven_flame_fan'].includes(type)) {
        return res.status(400).json({ message: '请指定有效的炼制类型' })
      }

      const result = await flameFanService.craftFlameFan(characterId, type)
      return res.json({ data: result })
    } catch (error) {
      const message = error instanceof Error ? error.message : '炼制失败'
      return res.status(400).json({ message })
    }
  }

  /**
   * 装备火焰扇
   */
  async equip(req: Request, res: Response) {
    try {
      const characterId = req.characterId
      if (!characterId) {
        return res.status(400).json({ message: '未选择角色' })
      }

      const { type } = req.body
      if (!type || !['three_flame_fan', 'seven_flame_fan'].includes(type)) {
        return res.status(400).json({ message: '请指定有效的装备类型' })
      }

      const result = await flameFanService.equip(characterId, type)
      return res.json({ data: result })
    } catch (error) {
      const message = error instanceof Error ? error.message : '装备失败'
      return res.status(400).json({ message })
    }
  }

  /**
   * 卸下火焰扇
   */
  async unequip(req: Request, res: Response) {
    try {
      const characterId = req.characterId
      if (!characterId) {
        return res.status(400).json({ message: '未选择角色' })
      }

      const result = await flameFanService.unequip(characterId)
      return res.json({ data: result })
    } catch (error) {
      const message = error instanceof Error ? error.message : '卸下失败'
      return res.status(400).json({ message })
    }
  }
}

export const flameFanController = new FlameFanController()
