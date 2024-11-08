# Видеочат ReCode

Проект представляет собой веб-приложение
для видеозвонков с текстовым чатом,
разработанное для Академии современных цифровых навыков ReCode.

## Функциональность

- Видео и аудио звонки между двумя пользователями
- Текстовый чат с историей сообщений
- Создание приватных комнат по ID
- Индикация статуса подключения
- Адаптивный дизайн для мобильных устройств

## Технологии

- TypeScript
- WebRTC для P2P видео/аудио связи
- Socket.IO для обмена сообщениями
- Express для серверной части
- HTML5/CSS3 для пользовательского интерфейса

## Установка и запуск

1. Установите зависимости:
   npm install

2. Соберите проект:
   npm run build

3. Запустите сервер:
   npm run start

4. Откройте в браузере:
   http://localhost:3000

## Использование

1. Откройте приложение в двух разных вкладках браузера
2. В обеих вкладках введите одинаковый ID комнаты
3. Нажмите "Присоединиться"
4. Разрешите доступ к камере и микрофону
5. Начните общение через видео и чат

## Требования

- Node.js 16+
- Современный браузер с поддержкой WebRTC
- Веб-камера и микрофон

### Если не работает видео/аудио:

1. Проверьте доступ к камере и микрофону в настройках браузера
2. Убедитесь, что устройства подключены и работают
3. Обновите страницу и попробуйте подключиться снова

## Скрипты

- `npm run build` - сборка проекта
- `npm run dev` - запуск сервера разработки
- `npm start` - запуск production сервера
- `npm run clean` - очистка сборки


## Автор

Garaev Vitaly
