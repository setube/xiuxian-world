import { Request, Response } from 'express'
import { windThunderWingsService } from '../services/fengxi.service'

class WindThunderWingsController {
  /**
   * 获取风雷翅状态
   */
  async getStatus(req: Request, res: Response) {
    try {
      const characterId = req.characterId
      if (!characterId) {
        return res.status(400).json({ message: '未选择角色' })
      }

      const status = await windThunderWingsService.getStatus(characterId)
      return res.json({ data: status })
    } catch (error) {
      const message = error instanceof Error ? error.message : '获取状态失败'
      return res.status(500).json({ message })
    }
  }

  /**
   * 炼化风雷翅
   */
  async refine(req: Request, res: Response) {
    try {
      const characterId = req.characterId
      if (!characterId) {
        return res.status(400).json({ message: '未选择角色' })
      }

      const result = await windThunderWingsService.refine(characterId)
      return res.json({ data: result })
    } catch (error) {
      const message = error instanceof Error ? error.message : '炼化失败'
      return res.status(400).json({ message })
    }
  }

  /**
   * 装备风雷翅
   */
  async equip(req: Request, res: Response) {
    try {
      const characterId = req.characterId
      if (!characterId) {
        return res.status(400).json({ message: '未选择角色' })
      }

      const result = await windThunderWingsService.equip(characterId)
      return res.json({ data: result })
    } catch (error) {
      const message = error instanceof Error ? error.message : '装备失败'
      return res.status(400).json({ message })
    }
  }

  /**
   * 卸下风雷翅
   */
  async unequip(req: Request, res: Response) {
    try {
      const characterId = req.characterId
      if (!characterId) {
        return res.status(400).json({ message: '未选择角色' })
      }

      const result = await windThunderWingsService.unequip(characterId)
      return res.json({ data: result })
    } catch (error) {
      const message = error instanceof Error ? error.message : '卸下失败'
      return res.status(400).json({ message })
    }
  }

  /**
   * 第一式：奇袭夺宝 - 无相劫掠
   */
  async usePlunder(req: Request, res: Response) {
    try {
      const characterId = req.characterId
      if (!characterId) {
        return res.status(400).json({ message: '未选择角色' })
      }

      const { targetId } = req.body
      if (!targetId) {
        return res.status(400).json({ message: '请指定目标' })
      }

      const result = await windThunderWingsService.usePlunder(characterId, targetId)
      return res.json({ data: result })
    } catch (error) {
      const message = error instanceof Error ? error.message : '技能施展失败'
      return res.status(400).json({ message })
    }
  }

  /**
   * 第二式：奇袭破阵 - 寂灭神雷
   */
  async useFormationBreak(req: Request, res: Response) {
    try {
      const characterId = req.characterId
      if (!characterId) {
        return res.status(400).json({ message: '未选择角色' })
      }

      const { targetId } = req.body
      if (!targetId) {
        return res.status(400).json({ message: '请指定目标' })
      }

      const result = await windThunderWingsService.useFormationBreak(characterId, targetId)
      return res.json({ data: result })
    } catch (error) {
      const message = error instanceof Error ? error.message : '技能施展失败'
      return res.status(400).json({ message })
    }
  }

  /**
   * 第三式：奇袭瞬杀 - 血色惊雷
   */
  async useBloodThunder(req: Request, res: Response) {
    try {
      const characterId = req.characterId
      if (!characterId) {
        return res.status(400).json({ message: '未选择角色' })
      }

      const { targetId } = req.body
      if (!targetId) {
        return res.status(400).json({ message: '请指定目标' })
      }

      const result = await windThunderWingsService.useBloodThunder(characterId, targetId)
      return res.json({ data: result })
    } catch (error) {
      const message = error instanceof Error ? error.message : '技能施展失败'
      return res.status(400).json({ message })
    }
  }
}

export const windThunderWingsController = new WindThunderWingsController()
