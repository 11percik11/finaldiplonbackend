const { prisma } = require("../prisma/prisma-client");

const ChatController = {
  createChat: async (req, res) => {
    const userId = req.user.userId;
    const { id } = req.params;

    if (!userId || !id) {
      return res.status(400).json({ error: "Идентификаторы пользователей обязательны." });
    }

    if (userId === id) {
      return res.status(400).json({ error: "Нельзя создать чат с самим собой." });
    }

    try {
      const users = await prisma.user.findMany({
        where: {
          id: { in: [userId, id] },
        },
      });

      if (users.length !== 2) {
        return res
          .status(400)
          .json({ error: "Один или оба пользователя не найдены." });
      }

      // Создание записи чата
      const chat = await prisma.chat.create({
        data: {
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Создание записей UserChat для текущего пользователя и другого пользователя
      await Promise.all([
        prisma.userChat.create({
          data: {
            userId: userId,
            chatId: chat.id,
          },
        }),
        prisma.userChat.create({
          data: {
            userId: id,
            chatId: chat.id,
          },
        }),
      ]);

      res.json({ chatId: chat.id, message: "Чат успешно создан." });
    } catch (error) {
      console.error("Ошибка при создании чата:", error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  },

  unlikeProduct: async (req, res) => {},
};

module.exports = ChatController;
