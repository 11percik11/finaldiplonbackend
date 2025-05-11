const { prisma } = require("../prisma/prisma-client");

const MessageController = {
  createMessage: async (req, res) => {
    // Получаем идентификатор текущего пользователя из `req.user.userId`
    const userId = req.user.userId;
    const { text } = req.body;

    // Получаем идентификатор другого пользователя из параметров запроса
    const { id } = req.params;

    if (!text) {
      return res.status(400).json({ error: "Все поля обязательны" });
    }

    if (!userId || !id) {
      return res
        .status(400)
        .json({ error: "Идентификаторы пользователей обязательны." });
    }

    try {
      // Проверка существующих пользователей
      const chat = await prisma.chat.findMany({
        where: { id },
      });

      if (!chat) {
        return res.status(400).json({ error: "Chat не найден" });
      }

      //   Создание записи чата
      const message = await prisma.message.create({
        data: {
          text,
          userId,
          chatId: id,
        },
      });
      res.json(message);
    } catch (error) {
      console.error("Ошибка при создании сообщения:", error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  },

  updateMessage: async (req, res) => {
    try {
      const { id } = req.params;
      const { text, messageId } = req.body;
      const userId = req.user.userId;
  
      // Проверка существования чата
      const chat = await prisma.chat.findUnique({ where: { id } });
  
      if (!chat) {
        return res.status(404).json({ error: 'Чат не найден' });
      }
  
      // Проверка существования сообщения
      const message = await prisma.message.findUnique({ where: { id: messageId } });
  
      if (!message) {
        return res.status(404).json({ error: 'Сообщение не найдено' });
      }
  
      // Проверка, является ли сообщение частью указанного чата
      if (message.chatId !== id) {
        return res.status(400).json({ error: 'Сообщение не принадлежит этому чату' });
      }
  
      // Проверка, является ли пользователь владельцем сообщения
      if (message.userId !== userId) {
        return res.status(403).json({ error: 'Вы не авторизованы для изменения этого сообщения' });
      }
  
      // Обновление сообщения
      const updatedMessage = await prisma.message.update({
        where: { id: messageId },
        data: { text: text || undefined },
      });
  
      res.json(updatedMessage);
    } catch (error) {
      console.error('Ошибка при обновлении сообщения:', error);
      res.status(500).json({ error: 'Не удалось обновить сообщение' });
    }
  }
};

module.exports = MessageController;
