import io from 'socket.io-client';

class SocketManager {
    constructor() {
        this.socket = null;
        this.isConnected = false;
    }
    
    connect(token) {
        this.socket = io('http://localhost:5000', {
            auth: {
                token
            }
        });
        
        this.socket.on('connect', () => {
            this.isConnected = true;
            console.log('Socket bağlantısı kuruldu');
        });
        
        this.socket.on('disconnect', () => {
            this.isConnected = false;
            console.log('Socket bağlantısı kesildi');
        });
        
        return this.socket;
    }
    
    joinUser(userId) {
        if (this.socket && this.isConnected) {
            this.socket.emit('joinUser', userId);
        }
    }
    
    sendMessage(data) {
        if (this.socket && this.isConnected) {
            this.socket.emit('sendMessage', data);
        }
    }
    
    onNewPost(callback) {
        if (this.socket) {
            this.socket.on('newPost', callback);
        }
    }
    
    onNewMessage(callback) {
        if (this.socket) {
            this.socket.on('newMessage', callback);
        }
    }
    
    onNewNotification(callback) {
        if (this.socket) {
            this.socket.on('newNotification', callback);
        }
    }
    
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.isConnected = false;
        }
    }
}

export default new SocketManager();