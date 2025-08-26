// Gönderi işlevleri
class Posts {
    constructor() {
        this.posts = [];
    }
    
    async loadPosts(userId = null) {
        try {
            this.posts = await api.getPosts(userId);
            return this.posts;
        } catch (error) {
            console.error('Gönderiler yüklenemedi:', error);
            return [];
        }
    }
    
    async createPost(content) {
        try {
            const postData = {
                title: content.substring(0, 30), // API için başlık
                body: content,
                userId: auth.currentUser.id,
            };
            
            const newPost = await api.createPost(postData);
            this.posts.unshift(newPost);
            return newPost;
        } catch (error) {
            console.error('Gönderi oluşturulamadı:', error);
            throw error;
        }
    }
    
    async likePost(postId) {
        try {
            const success = await api.likePost(postId);
            if (success) {
                const post = this.posts.find(p => p.id === postId);
                if (post) {
                    // Gerçek uygulamada API'den güncellenmiş veriyi almalısınız
                    if (!post.likes) post.likes = [];
                    post.likes.push(auth.currentUser.id);
                }
            }
            return success;
        } catch (error) {
            console.error('Beğeni işlemi hatası:', error);
            return false;
        }
    }
    
    async addComment(postId, comment) {
        try {
            const commentData = {
                postId,
                body: comment,
                name: auth.currentUser.name,
                email: auth.currentUser.email,
            };
            
            const newComment = await api.addComment(postId, commentData);
            
            const post = this.posts.find(p => p.id === postId);
            if (post) {
                if (!post.comments) post.comments = [];
                post.comments.push(newComment);
            }
            
            return newComment;
        } catch (error) {
            console.error('Yorum ekleme hatası:', error);
            throw error;
        }
    }
    
    getPosts() {
        return this.posts;
    }
    
    getPost(postId) {
        return this.posts.find(p => p.id === postId);
    }
}

const postsManager = new Posts();