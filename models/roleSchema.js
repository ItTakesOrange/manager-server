const mongoose = require('mongoose')
const roleSchema = mongoose.Schema({
    roleName: String,
    remark: String,
    permissionList: {
        checkedKeys: Array,
        halfCheckedKeys: Array
    },
    createTime: {
        type: Date,
        default: Date.now()
    },
    updateTime: {
        type: Date,
        default: Date.now()
    }
})

module.exports = mongoose.model('roles', roleSchema, 'roles')