const router = require('koa-router')()
const Menu = require('../models/menuSchema')
const util = require('../utils/util')

router.prefix('/menu')

router.post('/operate', async (ctx) => {
  const { _id, action, ...params } = ctx.request.body
  try {
    let info = ''
    if (action === 'add') {
      await Menu.create(params)
      info = '创建成功'
    } else if (action === 'edit') {
      await Menu.findByIdAndUpdate(_id, params)
      info = '编辑成功'
    } else {
      await Menu.findByIdAndDelete(_id)
      await Menu.deleteMany({ parentId: { $all: [_id] } })
      info = '删除成功'
    }
    ctx.body = util.success('', info)
  } catch (error) {
    ctx.body = util.fail(error.stack)
  }
})

module.exports = router
