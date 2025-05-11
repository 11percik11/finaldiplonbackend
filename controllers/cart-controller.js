const { prisma } = require('../prisma/prisma-client');

const CartController = {
  // Добавление продукта в корзину
  addToCart: async (req, res) => {
    const { productId } = req.body;
    const userId = req.user.userId;

    if (!productId) {
      return res.status(400).json({ error: 'Не указан ID продукта' });
    }

    try {
      // Находим или создаем корзину пользователя
      let cart = await prisma.cart.findFirst({
        where: { userId },
        include: { items: true },
      });

      if (!cart) {
        // Если корзины нет - создаем новую
        cart = await prisma.cart.create({
          data: {
            userId,
            items: {
              create: []
            }
          },
          include: {
            items: true
          }
        });
      }

      // Проверяем, есть ли уже продукт в корзине
      const existingItem = cart.items.find(item => item.productId === productId);

      if (existingItem) {
        // Если продукт уже в корзине, увеличиваем количество
        await prisma.cartItem.update({
          where: { id: existingItem.id },
          data: { quantity: existingItem.quantity + 1 },
        });
      } else {
        // Если продукта еще нет в корзине, добавляем его
        await prisma.cartItem.create({
          data: {
            cartId: cart.id,
            productId,
            quantity: 1,
          },
        });
      }

      // Обновляем корзину после добавления товара
      const updatedCart = await prisma.cart.findUnique({
        where: { id: cart.id },
        include: { items: true },
      });

      res.json(updatedCart);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Ошибка при добавлении продукта в корзину' });
    }
  },

  // Удаление продукта из корзины
  removeFromCart: async (req, res) => {
    const { productId } = req.body;
    const userId = req.user.userId;

    if (!productId) {
      return res.status(400).json({ error: 'Не указан ID продукта' });
    }

    try {
      // Получаем корзину пользователя
      const cart = await prisma.cart.findUnique({
        where: { userId },
        include: { items: true },
      });

      if (!cart) {
        return res.status(400).json({ error: 'Корзина не найдена' });
      }

      const existingItem = cart.items.find(item => item.productId === productId);

      if (!existingItem) {
        return res.status(400).json({ error: 'Продукта нет в корзине' });
      }

      if (existingItem.quantity > 1) {
        // Если количество больше одного, уменьшаем количество
        await prisma.cartItem.update({
          where: { id: existingItem.id },
          data: { quantity: existingItem.quantity - 1 },
        });
      } else {
        // Если количество равно одному, удаляем элемент из корзины
        await prisma.cartItem.delete({
          where: { id: existingItem.id },
        });
      }

      res.json({ message: 'Продукт успешно удален из корзины' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Ошибка при удалении продукта из корзины' });
    }
  },

  // Получение корзины пользователя
  getCart: async (req, res) => {
    const userId = req.user.userId;

    try {
      const cart = await prisma.cart.findUnique({
        where: { userId },
        include: {
          items: {
            include: {
              product: true, // Включаем информацию о продукте
            },
          },
        },
      });

      if (!cart) {
        return res.status(404).json({ error: 'Корзина не найдена' });
      }

      res.json(cart);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Ошибка при получении корзины' });
    }
  },
};

module.exports = CartController;
