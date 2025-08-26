// Kimlik doğrulama işlevleri
class Auth {
    constructor() {
        this.currentUser = null;
        this.init();
    }
    
    init() {
        // localStorage'dan kullanıcı bilgilerini yükle
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
            this.currentUser = JSON.parse(savedUser);
        }
    }
    
    async login(email, password) {
        const result = await api.login(email, password);
        
        if (result.success) {
            this.currentUser = result.user;
            localStorage.setItem('currentUser', JSON.stringify(result.user));
            return true;
        }
        
        return false;
    }
    
    async register(username, email, password) {
        const userData = {
            username,
            email,
            password, // Gerçek uygulamada şifreyi hash'lemelisiniz
            name: username,
        };
        
        const result = await api.register(userData);
        
        if (result.success) {
            this.currentUser = result.user;
            localStorage.setItem('currentUser', JSON.stringify(result.user));
            return true;
        }
        
        return false;
    }
    
    logout() {
        this.currentUser = null;
        localStorage.removeItem('currentUser');
    }
    
    isAuthenticated() {
        return this.currentUser !== null;
    }
}

const auth = new Auth();