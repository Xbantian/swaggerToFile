const swaggerParser = require('swagger-parser-mock');
const path = require('path');
const fs = require('fs');
const mkdirp = require('mkdirp');

let stringFilter = (str) => str.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n');


// let configFile = require('./config.js');
let { targetUrl, spliceBy = 'tags', functionNameIdx = 3, fileName = 'sis', moduleName = 'sis', fileSuffix = true } = require('./config.js');
console.log(`配置 => from`, targetUrl);

let isJava = false;
let errorUrl = '';//用于全局报错
console.log('get data from swagger...');
swaggerParser(targetUrl).then(data => {
    // if (data.basePath == '/sisjava') {
    //     isJava = true;
    // }
    let dir = path.resolve(__dirname, '');//生成至项目根目录相同位置
    // let verson = '';
    // try {
    //     dir = exec('echo %userprofile%\\desktop').toString().trim();//如果能生成成到桌面最好了
    // } catch (error) {
    //     console.log(error);
    // }
    // try {
    //     verson = exec('git symbolic-ref --short -q HEAD').toString().trim();
    // } catch (error) {
    //     console.log(error);
    // }
    // verson = 'Auto_Api_' + verson;

    dir += '\\apiDoc_' + (fileSuffix ? (new Date()).toLocaleString().replace(/\s/g, '-').replace(/\:/g, '') : '');
    mkdirp(dir, (err) => {
        err && console.log(err);
        console.log('apiDoc should create at ' + dir);

        let modules = {};//函数体集合
        // let funNames = {};//函数名称集合
        for (let url in data.paths) {
            if (Object.prototype.hasOwnProperty.call(data.paths, url)) {
                errorUrl = url;
                let api = data.paths[url];
                // let useUrl = url;
                // if (url.match(/\}/)) {
                //     // if (url.endWith('}')) {  //node版本不支持该语法
                //     useUrl = url.replace(/\/\{.*\}/, '');
                // }
                let urlList = url.split('/');

                let theModuleName = api.get ? api.get.tags[0] : api.post.tags[0];
                //不切割文件
                if (spliceBy == 'never') {
                    theModuleName = moduleName;
                }
                let funName = urlList[functionNameIdx];

                addList(theModuleName, modules, parserNet(api, url, funName));
            }
        }
        for (const name in modules) {
            if (Object.prototype.hasOwnProperty.call(modules, name)) {
                let fileConfig = {
                    list: modules[name],
                };
                let fileStr = '# ' + name + fileConfig.list.join('');
                //统一处理字符串
                fileStr = stringFilter(fileStr);

                let theFileName = toCamelCase(name) + '-api';
                if (theFileName[0] == '-') {
                    theFileName = theFileName.substr(1);
                }
                if (spliceBy == 'never') {
                    theFileName = fileName;
                }
                // 写文件
                fs.writeFile(path.join(dir, theFileName + '.md'), fileStr, function (error) {
                    error && console.log(error);
                });
            }
        }
    });
}).catch(e => {
    console.log(e);
    console.log('该路径获取不到swagger数据');
});

function addList(key, obj, val) {
    if (obj[key]) {
        obj[key].push(val);
    } else {
        obj[key] = [val];
    }
}

let toCamelCase = (str) => str.replace(/[A-Z]/g, (s) => '-' + s.toLowerCase());


function parserNet(api, url, funName) {
    let config = {
        name: funName,
        url: url,
        method: api.get ? 'GET' : 'POST',//方法
        summary: '',
        params: [],
        paramEX: null,
        res: [],
        resEX: null,
    };
    if (!(api.get ? api.get : api.post)) {
        console.log('不支持的接口定义', api);
        return;
    }
    api = api.get ? api.get : api.post;

    config.summary = api.summary;
    let isFile = api.summary ? api.summary.match(/^\s*\[Files\]/) : false;//要求后端以[Files]注释上传文件的api
    //处理请求参数
    config.params = getParams(api);
    if (isFile) {
        config.params.push({
            in: 'body',
            desc: '上传文件',
            name: 'file',
            type: 'FormData',
        })
    }
    config.params.forEach(item => {
        if (item.desc) {
            item.desc = item.desc.replace(/\r\n/, '');
            item.desc = item.desc.replace(/\n/, '');
        } else {
            item.desc = '';
        }
    })
    config.params = config.params.map(pa => '|' + pa.name + '|' + pa.type + '|' + pa.place + '|' + pa.desc + '|').join('\r\n');

    let parameters = api.parameters;
    if (parameters && parameters[0]) {
        config.paramEX = parameters[0].example;
        config.paramEX = config.paramEX.replace(/^/mg, '    ');
    }
    config.res = getResponses(api);
    config.res = config.res.map(pa => '|' + pa.name + '|' + pa.type + '|' + pa.desc + '|').join('\r\n');
    config.resEX = api.responses[200].example;
    config.resEX = config.resEX.replace(/^/mg, '    ');

    return getApi(config);
}

let getResponses = (api) => {
    let params = {};
    params = api.responses['200'].schema;
    let list = [];
    if (params.properties) {
        for (const paramName in params.properties) {
            if (Object.prototype.hasOwnProperty.call(params.properties, paramName)) {
                if (paramName == 'state') {
                    params.properties[paramName].type = 'number';
                    params.properties[paramName].description = '出错时的错误码';
                }
                params.properties[paramName].name = paramName;
                procRes(list, params.properties[paramName], paramName);
            }
        }
    }
    list.forEach(item => {
        if (item.desc) {
            item.desc = item.desc.replace(/\r\n/, '');
            item.desc = item.desc.replace(/\n/, '');
        } else {
            item.desc = '';
        }
    })
    return list;
}
let procRes = (list, param, parentPath) => {
    param.path = param.name ? (parentPath + '.' + param.name) : parentPath;
    if (param.type == 'object') {
        list.push({
            name: param.path,
            type: getType(param.type, param.items ? param.items.type : null),
            desc: param.description || '',
        })
        for (const paramName in param.properties) {
            if (Object.prototype.hasOwnProperty.call(param.properties, paramName)) {
                let subParam = param.properties[paramName]
                subParam.name = paramName;
                procRes(list, subParam, param.path);
            }
        }
    } else if (param.type == 'array') {
        param.path = parentPath + '.' + param.name + '[]';
        param.arrayType = param.items.type;
        if (complex[param.items.type]) {
            //数组的话，拿上层的name
            param.items.name = '';
            procRes(list, param.items, param.path, true);
        } else {
            list.push({
                name: param.path,
                type: getType(param.type, param.items ? param.items.type : null),
                desc: param.description || '',
            })
        }
    } else {
        list.push({
            name: param.path,
            type: getType(param.type, param.items ? param.items.type : null),
            desc: param.description || '',
        })
    }

}

let getParams = (api) => {
    let parameters = api.parameters;
    if (!parameters || !parameters[0]) {
        return [];
    }
    let query = [];
    let queryObj = [];//在url上且是obj
    let body = [];
    //把参数分开
    parameters.forEach(param => {
        if (param.in == 'body') {
            body.push(param);
        } else {
            //param.in=='path';
            if (param.name.match(/\./)) {
                queryObj.push(param);
            } else {
                query.push(param);
            }
        }
    });
    let qp = [], qop = [], bp = [];
    if (query.length) {
        //处理query参数
        qp = query.map(param => ({
            name: param.name,
            place: param.in,
            type: getType(param.type, param.items ? param.items.type : null),
            desc: param.description,
        }))
    }
    if (queryObj.length) {
        //先生成必要的节点
        processParameters(queryObj);

        qop = queryObj.map(param => ({
            name: param.name,
            place: param.in,
            type: getType(param.type, param.items ? param.items.type : null),
            desc: param.description,
        }))
    }
    if (body.length) {
        //处理body参数
        body.forEach(param => {
            param.schema.name = '';
            procParam(bp, param.schema, param.name);
        });
    }
    //处理参数  end
    return qp.concat(qop, bp);
}

const complex = {
    object: true,
    array: true,
}

let procParam = (bodyParams, param, parentPath) => {
    param.path = param.name ? (parentPath + '.' + param.name) : parentPath;
    if (param.type == 'object') {
        bodyParams.push({
            name: param.path,
            place: 'body',
            type: getType(param.type, param.items ? param.items.type : null),
            desc: param.description,
        })
        for (const paramName in param.properties) {
            if (Object.prototype.hasOwnProperty.call(param.properties, paramName)) {
                let subParam = param.properties[paramName]
                subParam.name = paramName;
                procParam(bodyParams, subParam, param.path);
            }
        }
    } else if (param.type == 'array') {
        param.path = parentPath + '.' + param.name + '[]';
        param.arrayType = param.items.type;
        if (complex[param.items.type]) {
            //数组的话，拿上层的name
            param.items.name = '';
            procParam(bodyParams, param.items, param.path, true);
        } else {
            bodyParams.push({
                name: param.path,
                place: 'body',
                type: getType(param.type, param.items ? param.items.type : null),
                desc: param.description,
            })
        }
    } else {
        bodyParams.push({
            name: param.path,
            place: 'body',
            type: getType(param.type, param.items ? param.items.type : null),
            desc: param.description,
        })
    }
}
/**
 * 完整后端的参数
 * @param {arrary} parameters api的参数
 */
let processParameters = (parameters) => {
    let len = parameters.length;
    let obj = {};
    for (let i = 0; i < len; i++) {
        let param = parameters[i];
        let parStr = param.name.match(/^.*(?=\.)/);
        if (parStr && parStr[0]) {
            if (!obj[parStr[0]]) {
                obj[parStr[0]] = true;
                let paramObj = {
                    type: 'Object',
                    name: parStr[0],
                    description: '',
                    in: 'query'
                }
                parameters.splice(i, 0, paramObj);
                i++;
                len++;
            }
        }
    }
    return parameters;
}


let getType = (type, arrayType) => {

    if (type == 'array') {
        return typeMap[arrayType] + '[]';
    }
    if (!type) {
        console.log('该接口不规范----  ' + errorUrl, type);
    }
    return typeMap[type];
}
//类型映射成前端的
const typeMap = {
    string: 'string',
    integer: 'number',
    number: 'number',
    boolean: 'boolean',
    object: 'Object',
    Object: 'Object',
}
let getApi = (conf) => `
***

# ${conf.name}

### 接口说明 :

- ${conf.summary}

### URL :

- ${conf.url}

### 请求方式 :

- ${conf.method}

### 参数 :

|参数名|类型|位置|说明|
|-----|---|----|---|
${conf.params}

### 请求示例

${conf.paramEX}

### 返回参数说明

|参数名|类型|说明|
|-----|----|---|
${conf.res}

### 返回示例

${conf.resEX}
`