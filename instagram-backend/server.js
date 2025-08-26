const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Uploads dizini yoksa oluştur
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}
app.use('/uploads', express.static('uploads'));

// Kök endpoint - API durumunu kontrol
app.get('/', (req, res) => {
  res.json({ 
    message: 'Instagram Clone API çalışıyor!',
    endpoints: {
      auth: ['POST /api/register', 'POST /api/login'],
      posts: ['GET /api/posts', 'POST /api/posts', 'POST /api/posts/:id/like', 'POST /api/posts/:id/comment'],
      users: ['GET /api/users', 'GET /api/users/:id', 'POST /api/users/:id/follow'],
      messages: ['GET /api/messages/:userId'],
      notifications: ['GET /api/notifications', 'PUT /api/notifications/:id/read']
    }
  });
});

// Basit bellek içi "veritabanı"
let users = [];
let posts = [];
let messages = [];
let notifications = [];

// Dosya yükleme ayarları
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname)
  }
});

const upload = multer({ storage: storage });

// JWT token doğrulama middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Erişim tokenı gerekli' });
  }

  try {
    const decoded = jwt.verify(token, 'gizli_anahtar');
    req.user = users.find(u => u.id === decoded.userId);
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Geçersiz token' });
  }
};

// ===== AUTH ROUTES =====
app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validasyon
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Tüm alanlar zorunludur' });
    }

    // Kullanıcı var mı kontrol et
    const existingUser = users.find(u => u.email === email || u.username === username);
    if (existingUser) {
      return res.status(400).json({ message: 'Kullanıcı zaten mevcut' });
    }

    // Şifreyi hashle
    const hashedPassword = await bcrypt.hash(password, 10);

    // Yeni kullanıcı oluştur
    const user = {
      id: Date.now().toString(),
      username,
      email,
      password: hashedPassword,
      avatar: '',
      bio: '',
      followers: [],
      following: [],
      createdAt: new Date()
    };

    users.push(user);

    // Token oluştur
    const token = jwt.sign(
      { userId: user.id },
      'gizli_anahtar',
      { expiresIn: '24h' }
    );

    // Şifreyi response'tan çıkar
    const { password: _, ...userWithoutPassword } = user;

    res.status(201).json({
      token,
      user: userWithoutPassword
    });
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası', error: error.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validasyon
    if (!email || !password) {
      return res.status(400).json({ message: 'Email ve şifre zorunludur' });
    }

    // Kullanıcıyı bul
    const user = users.find(u => u.email === email);
    if (!user) {
      return res.status(400).json({ message: 'Geçersiz kimlik bilgileri' });
    }

    // Şifreyi kontrol et
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Geçersiz kimlik bilgileri' });
    }

    // Token oluştur
    const token = jwt.sign(
      { userId: user.id },
      'gizli_anahtar',
      { expiresIn: '24h' }
    );

    // Şifreyi response'tan çıkar
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      token,
      user: userWithoutPassword
    });
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası', error: error.message });
  }
});

// ===== POST ROUTES =====
app.post('/api/posts', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const { caption } = req.body;
    const image = req.file ? req.file.filename : '';

    const post = {
      id: Date.now().toString(),
      userId: req.user.id,
      username: req.user.username,
      image,
      caption,
      likes: [],
      comments: [],
      createdAt: new Date()
    };

    posts.push(post);
    
    // Takipçilere bildirim gönder
    io.emit('newPost', post);
    
    res.status(201).json(post);
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası', error: error.message });
  }
});

app.get('/api/posts', authenticateToken, async (req, res) => {
  try {
    // Takip edilen kullanıcıların gönderilerini getir
    const userPosts = posts.filter(post => 
      post.userId === req.user.id || req.user.following.includes(post.userId)
    );
    
    // Tarihe göre sırala (yeniden eskiye)
    userPosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json(userPosts);
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası', error: error.message });
  }
});

app.post('/api/posts/:id/like', authenticateToken, async (req, res) => {
  try {
    const post = posts.find(p => p.id === req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Gönderi bulunamadı' });
    }

    const likeIndex = post.likes.indexOf(req.user.id);
    if (likeIndex > -1) {
      // Beğeniyi kaldır
      post.likes.splice(likeIndex, 1);
    } else {
      // Beğeni ekle
      post.likes.push(req.user.id);
      
      // Bildirim oluştur (kendi gönderini beğenmeme)
      if (post.userId !== req.user.id) {
        const notification = {
          id: Date.now().toString(),
          userId: post.userId,
          type: 'like',
          fromUser: req.user.id,
          fromUsername: req.user.username,
          postId: post.id,
          read: false,
          createdAt: new Date()
        };
        
        notifications.push(notification);
        
        // Gerçek zamanlı bildirim gönder
        io.to(post.userId).emit('newNotification', notification);
      }
    }

    res.json(post);
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası', error: error.message });
  }
});

app.post('/api/posts/:id/comment', authenticateToken, async (req, res) => {
  try {
    const { text } = req.body;
    const post = posts.find(p => p.id === req.params.id);
    
    if (!post) {
      return res.status(404).json({ message: 'Gönderi bulunamadı' });
    }

    post.comments.push({
      id: Date.now().toString(),
      userId: req.user.id,
      username: req.user.username,
      text,
      createdAt: new Date()
    });

    // Bildirim oluştur (kendi gönderine yorum yapmama)
    if (post.userId !== req.user.id) {
      const notification = {
        id: Date.now().toString(),
        userId: post.userId,
        type: 'comment',
        fromUser: req.user.id,
        fromUsername: req.user.username,
        postId: post.id,
        read: false,
        createdAt: new Date()
      };
      
      notifications.push(notification);
      
      // Gerçek zamanlı bildirim gönder
      io.to(post.userId).emit('newNotification', notification);
    }

    res.json(post);
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası', error: error.message });
  }
});

// ===== USER ROUTES =====
app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    // Şifreleri göstermeden kullanıcıları döndür
    const usersWithoutPasswords = users.map(user => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
    
    // Mevcut kullanıcıyı listeden çıkar
    res.json(usersWithoutPasswords.filter(u => u.id !== req.user.id));
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası', error: error.message });
  }
});

app.get('/api/users/:id', authenticateToken, async (req, res) => {
  try {
    const user = users.find(u => u.id === req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    }
    
    // Şifreyi gösterme
    const { password, ...userWithoutPassword } = user;
    
    res.json(userWithoutPassword);
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası', error: error.message });
  }
});

app.post('/api/users/:id/follow', authenticateToken, async (req, res) => {
  try {
    const userToFollow = users.find(u => u.id === req.params.id);
    if (!userToFollow) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    }

    const isFollowing = req.user.following.includes(req.params.id);
    
    if (isFollowing) {
      // Takibi bırak
      req.user.following = req.user.following.filter(id => id !== req.params.id);
      userToFollow.followers = userToFollow.followers.filter(id => id !== req.user.id);
    } else {
      // Takip et
      req.user.following.push(req.params.id);
      userToFollow.followers.push(req.user.id);
      
      // Bildirim oluştur
      const notification = {
        id: Date.now().toString(),
        userId: userToFollow.id,
        type: 'follow',
        fromUser: req.user.id,
        fromUsername: req.user.username,
        read: false,
        createdAt: new Date()
      };
      
      notifications.push(notification);
      
      // Gerçek zamanlı bildirim gönder
      io.to(userToFollow.id).emit('newNotification', notification);
    }

    res.json({ 
      following: !isFollowing,
      followersCount: userToFollow.followers.length 
    });
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası', error: error.message });
  }
});

// ===== MESSAGE ROUTES =====
app.get('/api/messages/:userId', authenticateToken, async (req, res) => {
  try {
    const userMessages = messages.filter(message =>
      (message.sender === req.user.id && message.receiver === req.params.userId) ||
      (message.sender === req.params.userId && message.receiver === req.user.id)
    );
    
    // Tarihe göre sırala
    userMessages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    
    res.json(userMessages);
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası', error: error.message });
  }
});

// ===== NOTIFICATION ROUTES =====
app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const userNotifications = notifications
      .filter(n => n.userId === req.user.id)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    res.json(userNotifications);
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası', error: error.message });
  }
});

app.put('/api/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    const notification = notifications.find(n => n.id === req.params.id);
    
    if (notification) {
      notification.read = true;
    }
    
    res.json(notification);
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası', error: error.message });
  }
});

// ===== SOCKET.IO HANDLERS =====
io.on('connection', (socket) => {
  console.log('Kullanıcı bağlandı:', socket.id);

  // Kullanıcıyı kendi odasına kat
  socket.on('joinUser', (userId) => {
    socket.join(userId);
    console.log(`Kullanıcı ${userId} kendi odasına katıldı`);
  });

  // Mesaj gönderme
  socket.on('sendMessage', async (data) => {
    try {
      const { senderId, receiverId, text } = data;
      
      const message = {
        id: Date.now().toString(),
        sender: senderId,
        receiver: receiverId,
        text,
        createdAt: new Date()
      };

      messages.push(message);
      
      // Alıcıya mesajı gönder
      io.to(receiverId).emit('newMessage', message);
      
      // Bildirim oluştur
      const notification = {
        id: Date.now().toString(),
        userId: receiverId,
        type: 'message',
        fromUser: senderId,
        fromUsername: users.find(u => u.id === senderId)?.username || 'Unknown',
        read: false,
        createdAt: new Date()
      };
      
      notifications.push(notification);
      
      // Gerçek zamanlı bildirim gönder
      io.to(receiverId).emit('newNotification', notification);
    } catch (error) {
      console.error('Mesaj gönderme hatası:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('Kullanıcı ayrıldı:', socket.id);
  });
});

// ===== ERROR HANDLING =====
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Bir hata oluştu!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Endpoint bulunamadı' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`✅ Sunucu http://localhost:${PORT} adresinde çalışıyor`);
  console.log(`📝 API dokümantasyonu: http://localhost:${PORT}`);
});