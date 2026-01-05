import { Router, type IRouter } from 'express'
import { rankingController } from '../controllers/ranking.controller'
import { authMiddleware } from '../middlewares/auth.middleware'

const router: IRouter = Router()

/**
 * 获取修为榜
 * GET /api/ranking/cultivation
 * Query: { limit?: number, offset?: number }
 */
router.get('/cultivation', rankingController.getCultivationRanking.bind(rankingController))

/**
 * 获取恶人榜
 * GET /api/ranking/evil
 * Query: { limit?: number, offset?: number }
 */
router.get('/evil', rankingController.getEvilRanking.bind(rankingController))

/**
 * 获取战力榜
 * GET /api/ranking/power
 * Query: { limit?: number, offset?: number }
 */
router.get('/power', rankingController.getPowerRanking.bind(rankingController))

/**
 * 获取PvP击杀榜
 * GET /api/ranking/pvp-kills
 * Query: { limit?: number, offset?: number }
 */
router.get('/pvp-kills', rankingController.getPvpKillsRanking.bind(rankingController))

/**
 * 获取掠夺榜
 * GET /api/ranking/loot
 * Query: { limit?: number, offset?: number }
 */
router.get('/loot', rankingController.getLootRanking.bind(rankingController))

// 以下路由需要认证
router.use(authMiddleware)

/**
 * 获取我的排名
 * GET /api/ranking/my-rank
 * Query: { type: RankingType }
 */
router.get('/my-rank', rankingController.getMyRank.bind(rankingController))

/**
 * 获取我的所有排名
 * GET /api/ranking/my-ranks
 */
router.get('/my-ranks', rankingController.getAllMyRanks.bind(rankingController))

export default router
