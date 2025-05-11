const express = require('express');
const router = express.Router();
const multer = require('multer');
const { UserController, ProductController, LikeController, CommentController, CartController } = require('../controllers');
const { authenticateToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');
const MessageController = require('../controllers/message-controller');

const uploadDestination = 'uploads';

// Показываем, где хранить загружаемые файлы
const storage = multer.diskStorage({
  destination: uploadDestination,
  filename: function (req, file, cb) {
    const fileExt = file.originalname.split('.').pop();
    const uniqueName = uuidv4() + '.' + fileExt; // Генерирует что-то вроде `550e8400-e29b-41d4-a716-446655440000.jpg`
    cb(null, uniqueName);
  }
});

const upload = multer({ storage: storage });

router.get('/refresh', UserController.refresh)

router.post('/register', UserController.register)
router.post('/createadmin', UserController.createAdmin)
router.post("/login", UserController.login);
router.post("/activate/:link", UserController.activate);
router.get("/current", authenticateToken, UserController.current);
router.get("/users/:id", authenticateToken, UserController.getUserById);

router.get("/allusers", authenticateToken, UserController.allUsers);

router.put("/users/:id", authenticateToken, upload.single('avatar'), UserController.updateUser);
router.put("/updaterole", authenticateToken, upload.single('avatar'), UserController.updateRole);
router.delete("/deleteuser", authenticateToken, UserController.deleteUser);

router.post("/product", authenticateToken, upload.single('avatar'), ProductController.createProduct, upload.single('avatar'));
router.get("/product", authenticateToken, ProductController.getAllProducts);
router.get("/product/:id", authenticateToken, ProductController.getProductById);
router.delete("/product/:id", authenticateToken, ProductController.deleteProduct);
router.put("/product/:id", authenticateToken, upload.single('avatar'), ProductController.updateProduct);

router.post("/likes", authenticateToken, LikeController.likeProduct);
router.delete("/likes", authenticateToken, LikeController.unlikeProduct);
router.delete("/deletelikeProduct", authenticateToken, LikeController.deletelikeProduct);


router.post("/comments/:id", authenticateToken, CommentController.createComment);
router.delete("/comments/:id", authenticateToken, CommentController.deleteComment);
router.delete("/deleteAdminComment/:id", authenticateToken, CommentController.deleteAdminComment);

router.put("/comments/:id", authenticateToken, CommentController.updateComment);
router.get('/:productid/comments', CommentController.getAllComments);

// router.post("/chat/:id", authenticateToken, ChatController.createChat);

// router.post("/message/:id", authenticateToken, MessageController.createMessage);
// router.put("/message/:id", authenticateToken, MessageController.updateMessage);

router.put('/cart', authenticateToken, CartController.addToCart);
router.delete('/cart', authenticateToken, CartController.removeFromCart);
router.get('/cart', authenticateToken, CartController.getCart);

module.exports = router;