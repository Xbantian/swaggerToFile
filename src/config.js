

module.exports = {
    targetUrl: 'http://192.168.50.210:1380/swagger/docs/v1_8_12',
    // functionNameIdx:3 //函数名在url的下标（url按'/'切割），默认3
    spliceBy:'never',//tags|never   通过tags分文件，或者不分文件  默认tags
    fileName: 'sis', //默认sis，该字段只在spliceBy为never时有效
    moduleName: 'sis', //默认sis，该字段只在spliceBy为never时有效
    fileSuffix: true, //默认true  文件夹名字是否要带时间后缀
}