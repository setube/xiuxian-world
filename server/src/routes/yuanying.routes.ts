/**
 * 元婴宗专属系统路由 - 元婴密卷系统
 */
import { Router, type IRouter } from 'express'
import * as yuanyingController from '../controllers/yuanying.controller'
import { authMiddleware, characterMiddleware } from '../middlewares/auth.middleware'

const router: IRouter = Router()

// 所有元婴宗相关路由都需要登录并有角色
router.use(authMiddleware)
router.use(characterMiddleware)

// 获取元婴宗系统完整状态
router.get('/status', yuanyingController.getStatus)

// 元神出窍（开始寻宝，需元婴期境界）
router.post('/project', yuanyingController.startProjection)

// 元婴闭关（开始修炼，宗门专属）
router.post('/cultivate', yuanyingController.startCultivation)

// 元婴归窍（召回并结算奖励）
router.post('/recall', yuanyingController.recallSoul)

// 问道寻真（宗门专属，消耗修为换取随机奖励）
router.post('/seek-truth', yuanyingController.seekTruth)

// 获取青元剑诀残篇状态
router.get('/fragments', yuanyingController.getFragments)

// 领悟青元剑诀
router.post('/master-sword', yuanyingController.masterGreenSword)

export default router
