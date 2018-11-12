// 自己的配置复制一份命名为api.config.local.js即可

//域名换成你自己的

//java 的路径
//http://192.168.50.210:8080/sisjava/v2/api-docs
//.net 的路径
//http://localhost:1234/swagger/docs/v1

module.exports = {
    //  替换你的域名再 npm run create:api
    // targetUrl: 'http://192.168.50.210:1380/swagger/docs/All',
    targetUrl: 'http://192.168.50.210:1380/swagger/docs/v1_8_12',

    // targetUrl: 'http://192.168.50.210:8080/sisjava/v2/api-docs',
}