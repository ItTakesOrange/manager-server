const router = require('koa-router')()
const Leave = require('../models/leaveSchema')
const util = require('../utils/util')

router.prefix('/leave')

router.get('/list', async (ctx) => {
  try {
    const { applyState } = ctx.request.query
    const { page, skipIndex } = util.pager(ctx.request.query)
    const authorization = ctx.request.headers.authorization
    let { data } = util.decoded(authorization)
    let params = {
      'applyUser.userId': data.userId
    }
    if (applyState) params.applyState = applyState
    const query = Leave.find(params)
    const list = await query.skip(skipIndex).limit(page.pageSize)
    const total = await Leave.countDocuments(params)
    ctx.body = util.success({
      page: {
        ...page,
        total
      },
      list
    })
  } catch (error) {
    ctx.body = util.fail(`查询失败: ${error.stack}`)
  }
})

module.exports = router
