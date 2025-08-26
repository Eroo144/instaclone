// API bağlantıları ve veri çekme işlevleri
class API {
    constructor() {
        this.baseURL = 'http://localhost:5000/api';
        this.token = localStorage.getItem('token');
    }
    
    setToken(token) {
        this.token = token;
        localStorage.setItem('token', token);
    }
    
    removeToken() {
        this.token = null;
        localStorage.removeItem('token');
    }
    
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers,
        };
        
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        
        try {
            const response = await fetch(url, {
                ...options,
                headers,
            });
            
            if (response.status === 401) {
                this.removeToken();
                window.location.href = '/login';
                return null;
            }
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Bir hata oluştu');
            }
            
            return data;
        } catch (error) {
            console.error('API isteği hatası:', error);
            throw error;
        }
    }
    
    // ===== AUTH İŞLEMLERİ =====
    async login(email, password) {
        return await this.request('/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
    }
    
    async register(username, email, password) {
        return await this.request('/register', {
            method: 'POST',
            body: JSON.stringify({ username, email, password }),
        });
    }
    
    // ===== KULLANICI İŞLEMLERİ =====
    async getUsers() {
        return await this.request('/users');
    }
    
    async getUser(userId) {
        return await this.request(`/users/${userId}`);
    }
    
    async followUser(userId) {
        return await this.request(`/users/${userId}/follow`, {
            method: 'POST',
        });
    }
    
    // ===== GÖNDERİ İŞLEMLERİ =====
    async getPosts() {
        return await this.request('/posts');
    }
    
    async createPost(postData) {
        // FormData oluştur
        const formData = new FormData();
        formData.append('caption', postData.caption);
        if (postData.image) {
            formData.append('image', postData.image);
        }
        
        return await fetch(`${this.baseURL}/posts`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.token}`
            },
            body: formData
        });
    }
    
    async likePost(postId) {
        return await this.request(`/posts/${postId}/like`, {
            method: 'POST',
        });
    }
    
    async commentPost(postId, text) {
        return await this.request(`/posts/${postId}/comment`, {
            method: 'POST',
            body: JSON.stringify({ text }),
        });
    }
    
    // ===== MESAJ İŞLEMLERİ =====
    async getMessages(userId) {
        return await this.request(`/messages/${userId}`);
    }
    
    // ===== BİLDİRİM İŞLEMLERİ =====
    async getNotifications() {
        return await this.request('/notifications');
    }
    
    async markNotificationAsRead(notificationId) {
        return await this.request(`/notifications/${notificationId}/read`, {
            method: 'PUT',
        });
    }
}

const api = new API();