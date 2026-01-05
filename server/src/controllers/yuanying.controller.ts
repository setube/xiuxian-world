/**
 * 元婴宗控制器 - 元婴密卷系统
 */
import { Request, Response } from 'express'
import { yuanyingService } from '../services/yuanying.service'

/**
 * 获取元婴宗系统状态
 */
export const getStatus = async (req: Request, res: Response) => {
  try {
    const characterId = req.characterId!
    const status = await yuanyingService.getStatus(characterId)
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
 * 元神出窍（开始寻宝）
 */
export const startProjection = async (req: Request, res: Response) => {
  try {
    const characterId = req.characterId!
    const result = await yuanyingService.startProjection(characterId)
    res.json({ success: true, data: result })
  } catch (error: any) {
    res.status(400).json({
      success: false,
      code: error.code || 500,
      message: error.message || '元神出窍失败'
    })
  }
}

/**
 * 元婴闭关（开始修炼）
 */
export const startCultivation = async (req: Request, res: Response) => {
  try {
    const characterId = req.characterId!
    const result = await yuanyingService.startCultivation(characterId)
    res.json({ success: true, data: result })
  } catch (error: any) {
    res.status(400).json({
      success: false,
      code: error.code || 500,
      message: error.message || '元婴闭关失败'
    })
  }
}

/**
 * 元婴归窍（召回并结算）
 */
export const recallSoul = async (req: Request, res: Response) => {
  try {
    const characterId = req.characterId!
    const result = await yuanyingService.recallSoul(characterId)
    res.json({ success: true, data: result })
  } catch (error: any) {
    res.status(400).json({
      success: false,
      code: error.code || 500,
      message: error.message || '元婴归窍失败'
    })
  }
}

/**
 * 问道寻真
 */
export const seekTruth = async (req: Request, res: Response) => {
  try {
    const characterId = req.characterId!
    const result = await yuanyingService.seekTruth(characterId)
    res.json({ success: true, data: result })
  } catch (error: any) {
    res.status(400).json({
      success: false,
      code: error.code || 500,
      message: error.message || '问道寻真失败'
    })
  }
}

/**
 * 获取青元剑诀残篇状态
 */
export const getFragments = async (req: Request, res: Response) => {
  try {
    const characterId = req.characterId!
    const status = await yuanyingService.getFragmentStatus(characterId)
    res.json({ success: true, data: status })
  } catch (error: any) {
    res.status(400).json({
      success: false,
      code: error.code || 500,
      message: error.message || '获取残篇状态失败'
    })
  }
}

/**
 * 领悟青元剑诀
 */
export const masterGreenSword = async (req: Request, res: Response) => {
  try {
    const characterId = req.characterId!
    const result = await yuanyingService.masterGreenSword(characterId)
    res.json({ success: true, data: result })
  } catch (error: any) {
    res.status(400).json({
      success: false,
      code: error.code || 500,
      message: error.message || '领悟青元剑诀失败'
    })
  }
}
