import axios from "axios";

const baseURL = import.meta.env.VITE_BACKEND_BASE_API
const axiosInstance = axios.create({
    baseURL: baseURL,
    headers: {
        'Content-Type': 'application/json',
    }
})

// Перехоплювач запитів для додавання токену авторизації
axiosInstance.interceptors.request.use(
    function(config){
        const accessToken = localStorage.getItem('accessToken')
        if(accessToken){
            config.headers['Authorization'] = `Bearer ${accessToken}`
        }
        return config;
    },
    function(error){
        return Promise.reject(error);
    }
)

// Перехоплювач відповідей для обробки помилок авторизації
axiosInstance.interceptors.response.use(
    function(response){
        return response;
    },
    // Handle failed responses
    async function(error){
        const originalRequest = error.config;
        if(error.response?.status === 401 && !originalRequest._retry){
            originalRequest._retry = true;
            const refreshToken = localStorage.getItem('refreshToken')
            try{
                // FIX: Use correct refresh URL that matches your backend
                const response = await axios.post(`${baseURL}/login/refresh/`, {refresh: refreshToken})
                localStorage.setItem('accessToken', response.data.access)
                originalRequest.headers['Authorization'] = `Bearer ${response.data.access}`
                return axiosInstance(originalRequest)
            }catch(error){
                localStorage.removeItem('accessToken')
                localStorage.removeItem('refreshToken')
                window.location.href = '/login'
            }
        }
        return Promise.reject(error);
    }
)

export default axiosInstance;