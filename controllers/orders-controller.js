const { prisma } = require("../prisma/prisma-client");

const OrderController = {
  // 📦 Создание заказа
  createOrder: async (req, res) => {
    try {
      const userId = req.user.userId;
      const { items } = req.body; // items: [{ productId, quantity }]

      if (!userId || !Array.isArray(items) || items.length === 0) {
        return res
          .status(400)
          .json({ error: "Неверные данные для создания заказа" });
      }

      let totalPrice = 0;

      // Сначала проверим все товары и их остатки
      for (const item of items) {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
        });

        if (!product) {
          return res
            .status(404)
            .json({ error: `Товар с ID ${item.productId} не найден` });
        }

        if (product.quantity < item.quantity) {
          return res.status(400).json({
            error: `Недостаточное количество товара "${product.title}". В наличии: ${product.quantity}, запрошено: ${item.quantity}`,
          });
        }

        totalPrice += product.price * item.quantity;
      }

      // Создаём заказ
      const order = await prisma.order.create({
        data: {
          userId,
          totalPrice,
          status: "pending",
          items: {
            create: items.map(({ productId, quantity }) => ({
              productId,
              quantity,
            })),
          },
        },
        include: {
          items: true,
        },
      });

      // Обновляем остатки товара
      for (const item of items) {
        await prisma.product.update({
          where: { id: item.productId },
          data: {
            quantity: {
              decrement: item.quantity,
            },
          },
        });
      }

      res.json(order);
    } catch (error) {
      console.error("Ошибка при создании заказа:", error.message, error);
      res.status(500).json({ error: "Не удалось создать заказ" });
    }
  },

  // ❌ Удаление заказа
  deleteOrder: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      // Найти заказ с привязкой к пользователю
      const order = await prisma.order.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!order) {
        return res.status(404).json({ error: "Заказ не найден" });
      }

      if (order.userId !== userId) {
        return res
          .status(403)
          .json({ error: "Вы не авторизованы для удаления этого заказа" });
      }

      // Возврат остатков товаров
      for (const item of order.items) {
        await prisma.product.update({
          where: { id: item.productId },
          data: {
            quantity: {
              increment: item.quantity,
            },
          },
        });
      }

      // Удалить все связанные позиции заказа
      await prisma.orderItem.deleteMany({ where: { orderId: id } });

      // Удалить сам заказ
      await prisma.order.delete({ where: { id } });

      res.json({ message: "Заказ успешно удалён", orderId: id });
    } catch (error) {
      console.error("Ошибка при удалении заказа:", error.message, error);
      res.status(500).json({ error: "Не удалось удалить заказ" });
    }
  },

  getUserOrders: async (req, res) => {
    try {
      const userId = req.user.userId;

      const orders = await prisma.order.findMany({
        where: { userId },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      res.json(orders);
    } catch (error) {
      console.error("Ошибка при получении заказов:", error.message, error);
      res.status(500).json({ error: "Не удалось получить заказы" });
    }
  },

  // Получить один заказ по ID
  getOrderById: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      const order = await prisma.order.findUnique({
        where: { id },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      if (!order) {
        return res.status(404).json({ error: "Заказ не найден" });
      }

      if (order.userId !== userId) {
        return res
          .status(403)
          .json({ error: "Вы не авторизованы для просмотра этого заказа" });
      }

      res.json(order);
    } catch (error) {
      console.error("Ошибка при получении заказа по ID:", error.message, error);
      res.status(500).json({ error: "Не удалось получить заказ" });
    }
  },

  getAllOrders: async (req, res) => {
    try {
      const userId = req.user.userId;

      // Получить текущего пользователя
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user || user.role !== "ADMIN") {
        return res
          .status(403)
          .json({ error: "Доступ запрещён. Только для админа." });
      }

      const orders = await prisma.order.findMany({
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          items: {
            include: {
              product: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      res.json(orders);
    } catch (error) {
      console.error("Ошибка при получении всех заказов:", error.message, error);
      res.status(500).json({ error: "Не удалось получить все заказы" });
    }
  },

  getOrdersByUserId: async (req, res) => {
    try {
      const adminId = req.user.userId;
      const { userId } = req.params;

      // Проверка прав
      const admin = await prisma.user.findUnique({
        where: { id: adminId },
      });

      if (!admin || admin.role !== "ADMIN") {
        return res
          .status(403)
          .json({ error: "Доступ запрещён. Только для администратора." });
      }

      // Получаем заказы указанного пользователя
      const orders = await prisma.order.findMany({
        where: { userId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          items: {
            include: {
              product: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      res.json(orders);
    } catch (error) {
      console.error(
        "Ошибка при получении заказов пользователя:",
        error.message,
        error
      );
      res
        .status(500)
        .json({ error: "Не удалось получить заказы пользователя" });
    }
  },
};

module.exports = OrderController;
