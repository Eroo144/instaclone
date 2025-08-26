// Ana uygulama işlevleri
class App {
    constructor() {
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.checkAuthStatus();
    }
    
    bindEvents() {
        document.getElementById('logoutLink').addEventListener('click', (e) => {
            e.preventDefault();
            auth.logout();
            this.showAuthForms();
        });
        
        document.getElementById('homeLink').addEventListener('click', (e) => {
            e.preventDefault();
            if (auth.isAuthenticated()) this.showFeed();
        });
        
        document.getElementById('profileLink').addEventListener('click', (e) => {
            e.preventDefault();
            if (auth.isAuthenticated()) this.showProfile();
        });
        
        document.getElementById('newPostLink').addEventListener('click', (e) => {
            e.preventDefault();
            this.toggleNewPostBox();
        });
    }
    
    checkAuthStatus() {
        if (auth.isAuthenticated()) {
            this.showFeed();
        } else {
            this.showAuthForms();
        }
    }
    
    showAuthForms() {
        document.getElementById('authForms').innerHTML = `
            <div id="loginForm">
                <h2>Giriş Yap</h2>
                <div class="form-group">
                    <label for="loginEmail">E-posta</label>
                    <input type="email" id="loginEmail" required>
                </div>
                <div class="form-group">
                    <label for="loginPassword">Şifre</label>
                    <input type="password" id="loginPassword" required>
                </div>
                <button type="button" id="loginButton">Giriş Yap</button>
                <div class="form-footer">
                    Hesabın yok mu? <a href="#" id="showRegister">Kaydol</a>
                </div>
            </div>
        `;
        
        document.getElementById('loginButton').addEventListener('click', async () => {
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            
            if (await auth.login(email, password)) {
                this.showFeed();
            } else {
                alert('E-posta veya şifre hatalı!');
            }
        });
        
        document.getElementById('showRegister').addEventListener('click', (e) => {
            e.preventDefault();
            this.showRegisterForm();
        });
        
        document.getElementById('feedContent').classList.add('hidden');
        document.getElementById('profileContent').classList.add('hidden');
        document.getElementById('authForms').classList.remove('hidden');
    }
    
    showRegisterForm() {
        document.getElementById('authForms').innerHTML = `
            <div id="registerForm">
                <h2>Hesap Oluştur</h2>
                <div class="form-group">
                    <label for="registerUsername">Kullanıcı Adı</label>
                    <input type="text" id="registerUsername" required>
                </div>
                <div class="form-group">
                    <label for="registerEmail">E-posta</label>
                    <input type="email" id="registerEmail" required>
                </div>
                <div class="form-group">
                    <label for="registerPassword">Şifre</label>
                    <input type="password" id="registerPassword" required>
                </div>
                <button type="button" id="registerButton">Kaydol</button>
                <div class="form-footer">
                    Zaten hesabın var mı? <a href="#" id="showLogin">Giriş Yap</a>
                </div>
            </div>
        `;
        
        document.getElementById('registerButton').addEventListener('click', async () => {
            const username = document.getElementById('registerUsername').value;
            const email = document.getElementById('registerEmail').value;
            const password = document.getElementById('registerPassword').value;
            
            if (await auth.register(username, email, password)) {
                this.showFeed();
            } else {
                alert('Kayıt işlemi başarısız. Lütfen tekrar deneyin.');
            }
        });
        
        document.getElementById('showLogin').addEventListener('click', (e) => {
            e.preventDefault();
            this.showAuthForms();
        });
    }
    
    async showFeed() {
        document.getElementById('authForms').classList.add('hidden');
        document.getElementById('profileContent').classList.add('hidden');
        document.getElementById('feedContent').classList.remove('hidden');
        
        await this.renderFeed();
        await this.renderSidebar();
    }
    
    async renderFeed() {
        // Gönderileri API'den yükle
        await postsManager.loadPosts();
        const posts = postsManager.getPosts();
        
        document.getElementById('feedContent').innerHTML = `
            <div class="stories">
                <div class="story">
                    <div class="story-avatar">
                        <div class="user-avatar"></div>
                    </div>
                    <span class="story-username">Senin Hikayen</span>
                </div>
            </div>
            
            <div id="newPostBox" class="new-post hidden">
                <h3>Yeni Gönderi</h3>
                <textarea id="postContent" placeholder="Neler oluyor?"></textarea>
                <div class="new-post-actions">
                    <div class="file-upload">
                        <label for="postImage" class="action-icon"><i class="fas fa-image"></i></label>
                        <input type="file" id="postImage" accept="image/*" class="hidden">
                    </div>
                    <button class="new-post-button" id="createPostButton">Paylaş</button>
                </div>
            </div>
            
            <div id="postsContainer">
                ${posts.length > 0 ? 
                    posts.map(post => this.renderPost(post)).join('') : 
                    '<p>Henüz gönderi yok. İlk gönderiyi sen paylaş!</p>'
                }
            </div>
        `;
        
        document.getElementById('createPostButton').addEventListener('click', async () => {
            const content = document.getElementById('postContent').value;
            if (content) {
                try {
                    await postsManager.createPost(content);
                    await this.renderFeed();
                    document.getElementById('newPostBox').classList.add('hidden');
                } catch (error) {
                    alert('Gönderi oluşturulurken hata oluştu.');
                }
            }
        });
    }
    
    renderPost(post) {
        const isLiked = post.likes && post.likes.includes(auth.currentUser.id);
        
        return `
            <div class="post" data-post-id="${post.id}">
                <div class="post-header">
                    <div class="post-user">
                        <div class="post-avatar"></div>
                        <span class="post-username">${post.userId}</span>
                    </div>
                    <span>⋯</span>
                </div>
                <div class="post-content">
                    ${post.body}
                </div>
                <div class="post-actions">
                    <div class="action-left">
                        <span class="action-icon like-button ${isLiked ? 'liked' : ''}" 
                              onclick="app.likePost(${post.id})">
                            <i class="${isLiked ? 'fas' : 'far'} fa-heart"></i>
                        </span>
                        <span class="action-icon" onclick="app.focusComment(${post.id})">
                            <i class="far fa-comment"></i>
                        </span>
                        <span class="action-icon">
                            <i class="far fa-paper-plane"></i>
                        </span>
                    </div>
                    <span class="action-icon">
                        <i class="far fa-bookmark"></i>
                    </span>
                </div>
                <div class="post-likes">
                    ${post.likes ? post.likes.length : 0} beğenme
                </div>
                <div class="post-caption">
                    <strong>${post.userId}</strong> ${post.title}
                </div>
                <div class="post-comments">
                    ${post.comments && post.comments.slice(0, 2).map(comment => `
                        <div class="comment">
                            <strong>${comment.name}</strong> ${comment.body}
                        </div>
                    `).join('')}
                    ${post.comments && post.comments.length > 2 ? 
                        `<a href="#" onclick="app.showAllComments(${post.id})">${post.comments.length - 2} yorum daha gör</a>` : ''
                    }
                </div>
                <div class="post-time">
                    Gönderi ID: ${post.id}
                </div>
                <div class="add-comment">
                    <input type="text" class="comment-input" placeholder="Yorum ekle..." 
                           data-post-id="${post.id}" onkeypress="app.addCommentOnEnter(event, ${post.id})">
                    <button class="post-button" onclick="app.addComment(${post.id})">Paylaş</button>
                </div>
            </div>
        `;
    }
    
    async renderSidebar() {
        // Kullanıcı bilgilerini API'den al
        const user = auth.currentUser;
        
        document.querySelector('.sidebar').innerHTML = `
            <div class="profile-card">
                <div class="user-avatar"></div>
                <div class="profile-info">
                    <div class="profile-username">${user.username}</div>
                    <div class="profile-name">${user.name || user.email}</div>
                </div>
            </div>
            
            <div class="suggestions">
                <div class="suggestions-header">
                    <div class="suggestions-title">Senin için öneriler</div>
                    <a href="#" class="see-all">Tümünü Gör</a>
                </div>
                <div class="suggestions-list">
                    Öneriler yükleniyor...
                </div>
            </div>
        `;
        
        // Önerileri yükle
        await this.loadSuggestions();
    }
    
    async loadSuggestions() {
        try {
            const users = await api.getUsers();
            const suggestions = users.filter(u => u.id !== auth.currentUser.id).slice(0, 5);
            
            const suggestionsHTML = suggestions.map(user => `
                <div class="suggestion">
                    <div class="suggestion-user">
                        <div class="suggestion-avatar"></div>
                        <div class="suggestion-info">
                            <div class="suggestion-username">${user.username}</div>
                            <div class="suggestion-followers">${user.name}</div>
                        </div>
                    </div>
                    <a href="#" class="suggestion-follow">Takip Et</a>
                </div>
            `).join('');
            
            document.querySelector('.suggestions-list').innerHTML = suggestionsHTML;
        } catch (error) {
            console.error('Öneriler yüklenemedi:', error);
            document.querySelector('.suggestions-list').innerHTML = 'Öneriler yüklenemedi';
        }
    }
    
    async showProfile() {
        document.getElementById('authForms').classList.add('hidden');
        document.getElementById('feedContent').classList.add('hidden');
        document.getElementById('profileContent').classList.remove('hidden');
        
        const userPosts = await postsManager.loadPosts(auth.currentUser.id);
        
        document.getElementById('profileContent').innerHTML = `
            <div class="profile-header">
                <div class="profile-avatar"></div>
                <div class="profile-info">
                    <h2>${auth.currentUser.username}</h2>
                    <div class="profile-stats">
                        <span><strong>${userPosts.length}</strong> gönderi</span>
                        <span><strong>0</strong> takipçi</span>
                        <span><strong>0</strong> takip</span>
                    </div>
                    <div class="profile-bio">
                        ${auth.currentUser.name || ''}
                    </div>
                </div>
            </div>
            
            <div class="profile-posts">
                <h3>Gönderiler</h3>
                <div class="posts-grid">
                    ${userPosts.length > 0 ? 
                        userPosts.map(post => `
                            <div class="profile-post">
                                <p>${post.title}</p>
                                <div class="post-stats">
                                    <span><i class="far fa-heart"></i> ${post.likes ? post.likes.length : 0}</span>
                                    <span><i class="far fa-comment"></i> ${post.comments ? post.comments.length : 0}</span>
                                </div>
                            </div>
                        `).join('') : 
                        '<p>Henüz gönderi paylaşmadınız.</p>'
                    }
                </div>
            </div>
        `;
    }
    
    toggleNewPostBox() {
        const newPostBox = document.getElementById('newPostBox');
        newPostBox.classList.toggle('hidden');
    }
    
    async likePost(postId) {
        const success = await postsManager.likePost(postId);
        if (success) {
            await this.renderFeed();
        }
    }
    
    addCommentOnEnter(event, postId) {
        if (event.key === 'Enter') {
            this.addComment(postId);
        }
    }
    
    async addComment(postId) {
        const commentInput = document.querySelector(`.comment-input[data-post-id="${postId}"]`);
        const comment = commentInput.value.trim();
        
        if (comment) {
            try {
                await postsManager.addComment(postId, comment);
                await this.renderFeed();
            } catch (error) {
                alert('Yorum eklenirken hata oluştu.');
            }
        }
    }
    
    focusComment(postId) {
        const commentInput = document.querySelector(`.comment-input[data-post-id="${postId}"]`);
        commentInput.focus();
    }
    
    showAllComments(postId) {
        const post = postsManager.getPost(postId);
        if (post && post.comments) {
            alert(post.comments.map(c => `${c.name}: ${c.body}`).join('\n'));
        }
    }
}

const app = new App();