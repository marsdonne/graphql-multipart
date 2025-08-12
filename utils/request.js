import axios from 'axios';
import { ElMessage } from 'element-plus';
import storage from '@/utils/storage';

// 创建axios实例
const service = axios.create({
    timeout: 1000 * 300,
    headers: { 
        'Accept': '*/*'
    }
})

// 请求拦截器
service.interceptors.request.use((config) => {
    if(config.requestHeader){
        config.headers = config.requestHeader;
    }
    const TOKEN = storage.get('token') || null;
    if (!config.headers.Authorization&&TOKEN) config.headers['Authorization'] = 'Bearer '+TOKEN;
    return config;
}, (error) => {
    console.error(error);
    return Promise.reject(error);
})

// 响应拦截器
service.interceptors.response.use((response) => {
    const { status, data } = response;
    if (status === 200) {
        if(data.errors && data.errors[0].message){
            ElMessage.error(data.errors[0].message);
            return Promise.reject(data.errors[0]);
        }else{
            return data;
        }
        // const code = data.code;
        // switch (code) {
        //     case 200:// 成功
        //         return data;
        //     case 400:// 错误
        //         ElMessage.error(data.msg);
        //         return data;
        //     case 401: // 校验token异常
        //         storage.loginOut();
        //         window.location.href = '/';
        //         break;
        //     case 501: // 权限不足
        //         ElMessage.error('权限不足');
        //         window.location.href = '/';
        //         break;
        //     default:
        //         ElMessage.error('请求发生错误');
        // }
    } else {
        ElMessage.error('服务器繁忙');
    }
}, (error) => {
    if(error.response.status === 401){
        storage.loginOut();
        window.location.href = '/';
    } 
    // console.error(error,'服务器响应返回');
    return Promise.reject(error);
})

export default service.request;reque
