const { prisma } = require("../prisma/prisma-client");
const path = require("path");
const Jdenticon = require("jdenticon");
const fs = require("fs");

const ProductController = {
  createProduct: async (req, res) => {
    const { title, description, price } = req.body;
    const file = req.file;

    // const userId = req.user.userId;

    if (!title || !description || !price) {
      return res.status(400).json({ error: "Все поля обязательны" });
    }

    try {
      const userID = await prisma.user.findUnique({
        where: { id: req.user.userId },
        include: {
          email: false,
          products: true,
          likes: true,
          comments: true,
          chat: true,
          cart: true,
        },
      });

      // res.json(userID.role)
      if (userID.role !== "ADMIN" && userID.role !== "MANAGER") {
        return res.status(403).json({ error: "У вас нет прав для создания продукта" });
      }
        
      // res.send(file)
        if (file) {

          const avatarProduct = file.filename;
          const avatarUrl = `/uploads/${avatarProduct}`;
          
          const numericPrice = parseFloat(price);
          if (isNaN(numericPrice)) {
            return res.status(400).json({ error: "Цена должна быть числом" });
          }
          
          const product = await prisma.product.create({
          data: {
            title,
            description,
            price: numericPrice,
            avatarUrl, // Путь к файлу в базе данных
            userId: req.user.userId
          },
        });
        return res.json(product);
      }
    } catch (error) {
      console.error("Ошибка при создании продукта:", error);
      return res.status(500).json({ error: "Ошибка сервера" });
    }
  },

  getAllProducts: async (req, res) => {
    const userId = req.user.userId;
    try {
      const products = await prisma.product.findMany({
        include: {
          likes: true,
          user: true,
          comments: true,
        },
        orderBy: {
          createdAt: "desc", // 'desc' означает сортировку по убыванию, т.е. новые посты будут первыми
        },
      });

      const postsWithLikeInfo = products.map((product) => ({
        product,
        likedByUser: product.likes.some((like) => like.userId === userId),
      }));

      res.json(postsWithLikeInfo);
    } catch (err) {
      res
        .status(500)
        .json({ error: "Произошла ошибка при получении постов44" });
    }
  },

  getProductById: async (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;

    try {
      const product = await prisma.product.findUnique({
        where: { id },
        include: {
          comments: {
            include: {
              user: true,
            },
          },
          likes: true,
          user: true,
        }, // Include related posts
      });

      if (!product) {
        return res.status(404).json({ error: "Пост не найден" });
      }

      const productWithLikeInfo = {
        ...product,
        likedByUser: product.likes.some((like) => like.userId === userId),
      };

      res.json(productWithLikeInfo);
    } catch (error) {
      res.status(500).json({ error: "Произошла ошибка при получении поста" });
    }
  },

  deleteProduct: async (req, res) => {
    const { id } = req.params;

    const userID = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: {
        email: false,
        products: true,
        likes: true,
        comments: true,
        chat: true,
        cart: true,
      },
    });

    // res.json(userID.role)
    if (userID.role !== "ADMIN" && userID.role !== "MANAGER") {
      return res.status(403).json({ error: "У вас нет прав для создания продукта" });
    }
      

    const product = await prisma.product.findUnique({ where: { id } });

    if (!product) {
      return res.status(404).json({ error: "Пост не найден" });
    }

    // if (product.userId !== req.user.userId) {
    //   return res.status(403).json({ error: "Нет доступа" });
    // }

    try {
      await prisma.cartItem.deleteMany({
        where: { productId: id },
      });

      const avatarPath = path.join(__dirname, `/..${product.avatarUrl}`);
      fs.unlink(avatarPath, (err) => {
        if (err) {
          console.error("Ошибка при удалении файла:", err);
          return res.status(500).json({ error: "Ошибка при удалении файла" });
        }

        console.log("Файл успешно удален");
      });

      const transaction = await prisma.$transaction([
        prisma.comment.deleteMany({ where: { productId: id } }),
        prisma.like.deleteMany({ where: { productId: id } }),
        prisma.product.delete({ where: { id } }),
      ]);

      res.json(transaction);
    } catch (error) {
      res.status(500).json({ error: "Что-то пошло не так" });
    }
  },



  updateProduct: async (req, res) => {
    const { id } = req.params;
    const { title, description, price } = req.body;

    let filePath;

    if (req.file && req.file.path) {
      filePath = req.file.path;
    }

    // Проверка, что пользователь удаляет свой пост
    const product = await prisma.product.findUnique({ where: { id } });

    if (!product) {
      return res.status(404).json({ error: "Пост не найден" });
    }

    if (product.userId !== req.user.userId) {
      return res.status(403).json({ error: "Нет доступа" });
    }
    try {
      const numericPrice = parseFloat(price);
      // if (isNaN(numericPrice)) {
      //   return res.status(400).json({ error: 'Цена должна быть числом' });
      // }

      const product = await prisma.product.update({
        where: { id },
        data: {
          title: title || undefined,
          description: description || undefined,
          price: numericPrice || undefined,
          avatarUrl: filePath ? `/${filePath}` : undefined,
        },
      });
      res.json(product);
    } catch (error) {
      res.status(500).json({ error: "Что-то пошло не так" });
    }
  },
};

module.exports = ProductController;
