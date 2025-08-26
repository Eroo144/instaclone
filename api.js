// API bağlantıları ve veri çekme işlevleri
class API {
    constructor() {
        this.baseURL = 'http://localhost:5000/api'; // Backend URL'niz
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
                return;
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
    
    // Kullanıcı işlemleri
    async login(email, password) {
        const data = await this.request('/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
        
        if (data.token) {
            this.setToken(data.token);
        }
        
        return data;
    }
    
    async register(username, email, password) {
        const data = await this.request('/register', {
            method: 'POST',
            body: JSON.stringify({ username, email, password }),
        });
        
        if (data.token) {
            this.setToken(data.token);
        }
        
        return data;
    }
    
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
    
    // Gönderi işlemleri
    async getPosts() {
        return await this.request('/posts');
    }
    
    async createPost(formData) {
        return await this.request('/posts', {
            method: 'POST',
            body: formData,
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
    
    // Mesaj işlemleri
    async getMessages(userId) {
        return await this.request(`/messages/${userId}`);
    }
    
    // Bildirim işlemleri
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