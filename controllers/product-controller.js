const { prisma } = require("../prisma/prisma-client");
const path = require("path");
const Jdenticon = require("jdenticon");
const fs = require("fs");

const ProductController = {
  createProduct: async (req, res) => {
    const {
      title,
      description,
      price,
      quantity,
      color,
      size,
      sex,
      model,
      age,
    } = req.body;

    const file = req.file;

    if (!title || !description || !price) {
      return res.status(400).json({ error: "Все поля обязательны" });
    }

    try {
      const userID = await prisma.user.findUnique({
        where: { id: req.user.userId },
      });

      if (userID.role !== "ADMIN" && userID.role !== "MANAGER") {
        return res.status(403).json({ error: "Нет прав для создания товара" });
      }

      if (!file) {
        return res.status(400).json({ error: "Файл не загружен" });
      }

      const avatarUrl = `/uploads/${file.filename}`;
      const numericPrice = parseFloat(price);
      const numericQuantity = parseInt(quantity);

      if (isNaN(numericPrice)) {
        return res.status(400).json({ error: "Цена должна быть числом" });
      }

      const product = await prisma.product.create({
        data: {
          title,
          description,
          price: numericPrice,
          quantity: isNaN(numericQuantity) ? 1 : numericQuantity,
          color,
          size,
          sex,
          model,
          age,
          avatarUrl,
          userId: req.user.userId,
        },
      });

      res.json(product);
    } catch (error) {
      console.error("Ошибка при создании продукта:", error);
      res.status(500).json({ error: "Ошибка сервера" });
    }
  },

  // getAllProducts: async (req, res) => {
  //   const userId = req.user.userId;
  //   try {
  //     const products = await prisma.product.findMany({
  //       include: {
  //         likes: true,
  //         user: true,
  //         comments: true,
  //       },
  //       orderBy: {
  //         createdAt: "desc", // 'desc' означает сортировку по убыванию, т.е. новые посты будут первыми
  //       },
  //     });

  //     const postsWithLikeInfo = products.map((product) => ({
  //       product,
  //       likedByUser: product.likes.some((like) => like.userId === userId),
  //     }));

  //     res.json(postsWithLikeInfo);
  //   } catch (err) {
  //     res
  //       .status(500)
  //       .json({ error: "Произошла ошибка при получении постов44" });
  //   }
  // },

  getAllProducts: async (req, res) => {
    const userId = req.user?.userId;

    const { minPrice, maxPrice, color, size, sex, model, age, search } =
      req.query;

    try {
      const filters = {};

      if (minPrice || maxPrice) {
        filters.price = {
          ...(minPrice && { gte: parseFloat(minPrice) }),
          ...(maxPrice && { lte: parseFloat(maxPrice) }),
        };
      }

      if (color) filters.color = color;
      if (size) filters.size = size;
      if (sex) filters.sex = sex;
      if (model) filters.model = model;
      if (age) filters.age = age;

      if (search) {
        filters.OR = [
          { title: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ];
      }

      const products = await prisma.product.findMany({
        where: filters,
        include: {
          likes: true,
          user: true,
          comments: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      const postsWithLikeInfo = products.map((product) => ({
        product,
        likedByUser: userId
          ? product.likes.some((like) => like.userId === userId)
          : false,
      }));

      res.json(postsWithLikeInfo);
    } catch (err) {
      console.error("Ошибка при получении продуктов:", err.message, err);
      res
        .status(500)
        .json({ error: "Произошла ошибка при получении продуктов" });
    }
  },

  getProductById: async (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;

    try {
      const product = await prisma.product.findUnique({
        where: { id },
        include: {
          likes: true,
          user: true,
        },
      });

      if (!product) {
        return res.status(404).json({ error: "Пост не найден" });
      }

      // Получаем комментарии отдельно
      const comments = await prisma.comment.findMany({
        where: {
          productId: id,
          OR: [
            { visible: true },
            { userId: userId }, // всегда показываем свои
          ],
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      const productWithLikeInfo = {
        ...product,
        likedByUser: product.likes.some((like) => like.userId === userId),
        comments, // добавляем отдельно загруженные комментарии
      };

      res.json(productWithLikeInfo);
    } catch (error) {
      console.error("Ошибка при получении поста:", error.message, error);
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
      return res
        .status(403)
        .json({ error: "У вас нет прав для создания продукта" });
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
      
      await prisma.orderItem.deleteMany({ where: { productId: id } });

      const transaction = await prisma.$transaction([
        prisma.comment.deleteMany({ where: { productId: id } }),
        prisma.like.deleteMany({ where: { productId: id } }),
        prisma.cartItem.deleteMany({ where: { productId: id } }),
        prisma.orderItem.deleteMany({ where: { productId: id } }), // ← 🔥 добавь это
        prisma.product.delete({ where: { id } }),
      ]);

      res.json(transaction);
    } catch (error) {
      res.status(500).json({ error: "Что-то пошло не так" });
    }
  },

  
  

  updateProduct: async (req, res) => {
    const { id } = req.params;
    const {
      title,
      description,
      price,
      quantity,
      color,
      size,
      sex,
      model,
      age,
    } = req.body;

    const file = req.file;

    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
      });

      if (!user || (user.role !== "ADMIN" && user.role !== "MANAGER")) {
        return res.status(403).json({ error: "Нет прав для изменения товара" });
      }

      const existingProduct = await prisma.product.findUnique({
        where: { id },
      });

      if (!existingProduct) {
        return res.status(404).json({ error: "Товар не найден" });
      }

      const numericPrice = parseFloat(price);
      const numericQuantity = parseInt(quantity);

      if (price && isNaN(numericPrice)) {
        return res.status(400).json({ error: "Цена должна быть числом" });
      }

      // Обновим путь к файлу, если он есть
      let avatarUrl;
      if (file) {
        avatarUrl = `/uploads/${file.filename}`;

        // Удалим старый файл, если он был
        if (existingProduct.avatarUrl) {
          const oldPath = path.join(
            __dirname,
            `/..${existingProduct.avatarUrl}`
          );
          fs.unlink(oldPath, (err) => {
            if (err) {
              console.warn("Не удалось удалить старый файл:", err.message);
            }
          });
        }
      }

      const updatedProduct = await prisma.product.update({
        where: { id },
        data: {
          title: title || existingProduct.title,
          description: description || existingProduct.description,
          price: !isNaN(numericPrice) ? numericPrice : existingProduct.price,
          quantity: !isNaN(numericQuantity)
            ? numericQuantity
            : existingProduct.quantity,
          color: color || existingProduct.color,
          size: size || existingProduct.size,
          sex: sex || existingProduct.sex,
          model: model || existingProduct.model,
          age: age || existingProduct.age,
          avatarUrl: avatarUrl || existingProduct.avatarUrl,
        },
      });

      res.json(updatedProduct);
    } catch (error) {
      console.error("Ошибка при обновлении товара:", error.message);
      res.status(500).json({ error: "Ошибка сервера при обновлении товара" });
    }
  },

  
};

module.exports = ProductController;
