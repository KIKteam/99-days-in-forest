
console.log("Игра '99 Пиксельных Ночей в Лесу' загружена!");

document.addEventListener('DOMContentLoaded', () => {
    const gameContainer = document.getElementById('game-container');
    if (!gameContainer) {
        console.error('Элемент с ID "game-container" не найден!');
        return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    gameContainer.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    // Отключаем сглаживание для сохранения пиксельного стиля
    ctx.imageSmoothingEnabled = false;

    // --- Константы и данные ---
    const ITEM_NAMES = {
        'axe': 'Топор',
        'wood': 'Дерево',
        'seed': 'Семя',
        'garden_bed': 'Грядка',
        'map': 'Карта',
        'sundial': 'Солн. циферблат',
        'carrot': 'Морковь',
        'wood_pile': 'Лесопилка'
    };
    const SEED_GROWTH_TIME = 30000; // 30 секунд на рост дерева
    const DAY_NIGHT_DURATION = 120000; // 2 минуты в миллисекундах
    const CAMPFIRE_FUEL_BURN_RATE = 30000; // 30 секунд на сгорание 1 полена
    const CAMPFIRE_MAX_FUEL = 20; // Максимальный запас топлива в костре
    const HUNGER_DECREASE_RATE = 60000; // 1 минута на уменьшение голода
    const GARDEN_BED_GROW_RATE = 30000; // 30 секунд на рост моркови
    const WOOD_PILE_RATE = 60000; // 60 секунд на сбор 1 дерева

    const EAT_EFFECTS = {
        'carrot': { hunger: 2 }
    };

    const WOLF_STATS = { speed: 1.2, health: 3, damage: 1, attackCooldown: 1000 };
    const MAX_ENEMIES_PER_SCREEN = 5;
    const DEER_STATS = { speed: 1.4, health: 5, damage: 1, attackCooldown: 1500, lightFearRadius: 180 };

    const CRAFTING_RECIPES = {
        1: [
            { id: 'map', name: 'Карта', cost: [{ id: 'wood', count: 15 }], unlocks: 'hasMap' },
            { id: 'garden_bed', name: 'Грядка', cost: [{ id: 'wood', count: 10 }], gives: { id: 'garden_bed', count: 1 } },
            { id: 'wood_pile', name: 'Лесопилка', cost: [{ id: 'wood', count: 25 }], gives: { id: 'wood_pile', count: 1 } }
        ],
        2: [
            { id: 'placeholder1', name: 'Рецепт 2-го уровня', cost: [{ id: 'wood', count: 50 }], gives: { id: 'wood', count: 1 } }
        ],
        3: [
            { id: 'placeholder2', name: 'Рецепт 3-го уровня', cost: [{ id: 'wood', count: 100 }], gives: { id: 'wood', count: 1 } }
        ],
        4: [
            { id: 'placeholder3', name: 'Рецепт 4-го уровня', cost: [{ id: 'wood', count: 200 }], gives: { id: 'wood', count: 1 } }
        ]
    };
    const CRAFTER_UPGRADE_COST = { 2: 20, 3: 50, 4: 100 }; // Стоимость улучшения до уровня 2, 3, 4
    
    // --- Состояние игры ---
    const gameState = {
        currentScreen: 'lobby',
        mouse: {
            x: 0,
            y: 0,
        },
        controls: {
            type: 'pc', // 'pc' or 'mobile'
            joystick: {
                active: false,
                baseX: 0, baseY: 0,
                stickX: 0, stickY: 0,
                dx: 0, // normalized direction x
                dy: 0  // normalized direction y
            }
        },
        lobby: {
            buttons: [
                { id: 'chapter1', text: 'Глава 1: Начало Выживания', y: 200, active: true, chapter: 1 },
                { id: 'chapter2', text: 'Глава 2: Спасение детей', y: 280, active: false, chapter: 2 },
                { id: 'chapter3', text: 'Глава 3: Тайна леса', y: 360, active: false, chapter: 3 },
            ]
        },
        // Добавляем данные по бейджам, как вы и просили
        playerData: {
            badges: 0,
            diamonds: 0,
            allBadges: [
                { text: 'Первая Рубка: Срубить 1-е дерево', reward: 2, completed: false },
                { text: 'Начинающий Охотник: Убить 1-го кролика', reward: 2, completed: false },
                { text: 'Первый Костер: Разжечь костер', reward: 3, completed: false },
                { text: 'Мастер Костра I: Прокачать костер до 3 ур.', reward: 5, completed: false },
                { text: 'Мастер Костра II: Прокачать костер до 5 ур.', reward: 10, completed: false },
                { text: 'Волчий Охотник: Убить 10 волков', reward: 5, completed: false },
                { text: 'Первый Урожай: Собрать 1-ю морковку', reward: 3, completed: false },
                { text: 'Строитель: Создать 5 полок', reward: 4, completed: false },
            ]
        },
        // Определяем кликабельные области для интерфейса
        ui: {
            badgesButton: { x: 20, y: 570, width: 150, height: 30 },
            backButton: { x: 350, y: 550, width: 100, height: 40 },
            restartButton: { x: 350, y: 400, width: 100, height: 40 },
            controlsButton: { x: (800 - 230) / 2, y: 450, width: 230, height: 40 }
        },
        loading: {
            startTime: 0,
            duration: 2500 // 2.5 секунды загрузки
        },
        gameOver: {
            daysSurvived: 0
        },
        // Состояние непосредственно самой игры
        game: {
            daysSurvived: 1,
            enemies: [],
            lastHungerDamageTime: 0,
            currentChapter: 1,
            player: {
                x: 400,
                y: 300,
                width: 24,
                height: 24,
                health: 10,
                maxHealth: 10,
                hunger: 10,
                maxHunger: 10,
                hasMap: false,
                color: '#F5F5DC', // Игрок теперь бежевый
                speed: 3,
                // Отслеживание нажатых клавиш
                keys: {}
            },
            inventory: {
                slots: 5,
                items: [],
                selectedSlotIndex: null // Какой слот выбран
            },
            // Объекты в игровом мире
            // Мир теперь состоит из экранов (карт)
            world: {
                screens: {}, // 'x,y': { trees: [...] }
                currentScreenX: 0,
                currentScreenY: 0,
                plantedSeeds: [], // {x, y, startTime, screenKey}
                gardenBeds: [], // {x, y, screenKey, lastGrowthTime}
                woodPiles: [], // {x, y, screenKey, lastCollectionTime}
            },
            time: {
                isDay: true,
                lastHungerDecreaseTime: 0,
                cycleProgress: 0, // 0 to DAY_NIGHT_DURATION
                lastUpdateTime: 0
            },
            campfire: {
                x: 0,
                y: 0,
                radius: 20,
                level: 1,
                isLit: true, // Изначально костер горит для демонстрации
                xp: 0, // "Опыт" костра для повышения уровня
                xpToNextLevel: 5, // Сколько опыта нужно для следующего уровня
                fuel: 5, // Запас топлива (поленьев)
                lastFuelBurnTime: 0 // Время последнего сгорания
            },
            crafter: {
                x: 0,
                y: 0,
                size: 30,
                level: 1,
                isMenuOpen: false,
                viewingCraftLevel: 1
            }
        }
    };

    // --- Логика отрисовки Лобби ---
    function drawLobby() {
        // 1. Черный фон
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 2. Кнопки
        const buttonWidth = 400;
        const buttonHeight = 60;
        const buttonX = (canvas.width - buttonWidth) / 2;

        // Убедитесь, что шрифт "Pixelify Sans" подключен в вашем HTML, иначе будет использован monospace
        ctx.font = '24px "Pixelify Sans", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        gameState.lobby.buttons.forEach(button => {
            const isHovered = isMouseOver(buttonX, button.y, buttonWidth, buttonHeight);

            if (button.active) {
                // Активная кнопка
                ctx.fillStyle = isHovered ? '#FFFF66' : 'yellow'; // Ярче при наведении
                ctx.fillRect(buttonX, button.y, buttonWidth, buttonHeight);
                ctx.fillStyle = 'black';
                ctx.fillText(button.text, canvas.width / 2, button.y + buttonHeight / 2);
            } else {
                // Неактивная кнопка
                ctx.fillStyle = '#444444'; // Темно-серый фон
                ctx.fillRect(buttonX, button.y, buttonWidth, buttonHeight);
                ctx.fillStyle = '#888888'; // Светло-серый текст
                ctx.fillText(button.text, canvas.width / 2, button.y + buttonHeight / 2);
            }
        });

        // 3. Панель информации
        ctx.font = '18px "Pixelify Sans", monospace';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'left';
        
        const badgesText = `Бейджей: ${gameState.playerData.badges}/${gameState.playerData.allBadges.length}`;
        const { badgesButton } = gameState.ui;
        const isHovered = isMouseOver(badgesButton.x, badgesButton.y, badgesButton.width, badgesButton.height);
        ctx.fillStyle = isHovered ? 'yellow' : 'white'; // Подсветка при наведении
        ctx.fillText(badgesText, badgesButton.x, badgesButton.y + 10);

        ctx.textAlign = 'right';
        ctx.fillStyle = 'white';
        ctx.fillText(`Алмазы: ${gameState.playerData.diamonds}`, canvas.width - 20, canvas.height - 20);

        // Кнопка переключения управления
        const { controlsButton } = gameState.ui;
        const controlsText = `Управление: ${gameState.controls.type === 'pc' ? 'ПК' : 'Мобильное'}`;
        const isHoveredControls = isMouseOver(controlsButton.x, controlsButton.y, controlsButton.width, controlsButton.height);
        
        ctx.fillStyle = isHoveredControls ? '#66D9EF' : '#00BFFF'; // DeepSkyBlue
        ctx.fillRect(controlsButton.x, controlsButton.y, controlsButton.width, controlsButton.height);
        
        ctx.fillStyle = 'black';
        ctx.font = '18px "Pixelify Sans", monospace';
        ctx.fillText(controlsText, controlsButton.x + controlsButton.width / 2, controlsButton.y + controlsButton.height / 2);
    }

    // --- Логика отрисовки Экрана Бейджей ---
    function drawBadgesScreen() {
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Заголовок
        ctx.font = '36px "Pixelify Sans", monospace';
        ctx.fillStyle = 'yellow';
        ctx.textAlign = 'center';
        ctx.fillText('Задания (Бейджи)', canvas.width / 2, 60);

        // Список бейджей
        ctx.font = '20px "Pixelify Sans", monospace';
        ctx.textAlign = 'left';
        gameState.playerData.allBadges.forEach((badge, index) => {
            const y = 120 + index * 40;
            // Цвет в зависимости от выполнения
            ctx.fillStyle = badge.completed ? 'green' : '#AAAAAA';
            const status = badge.completed ? '[ВЫПОЛНЕНО]' : '[НЕ ВЫПОЛНЕНО]';
            ctx.fillText(`${status} ${badge.text}`, 50, y);

            // Награда
            ctx.fillStyle = 'cyan';
            ctx.textAlign = 'right';
            ctx.fillText(`+${badge.reward} Алмазов`, canvas.width - 50, y);
            ctx.textAlign = 'left';
        });

        // Кнопка "Назад"
        const { backButton } = gameState.ui;
        const isHovered = isMouseOver(backButton.x, backButton.y, backButton.width, backButton.height);
        ctx.fillStyle = isHovered ? '#FFFF66' : 'yellow';
        ctx.fillRect(backButton.x, backButton.y, backButton.width, backButton.height);
        ctx.fillStyle = 'black';
        ctx.font = '24px "Pixelify Sans", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Назад', backButton.x + backButton.width / 2, backButton.y + backButton.height / 2);
    }

    function drawGameOverScreen() {
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.font = '48px "Pixelify Sans", monospace';
        ctx.fillStyle = 'red';
        ctx.textAlign = 'center';
        ctx.fillText('ИГРА ОКОНЧЕНА', canvas.width / 2, 200);

        ctx.font = '24px "Pixelify Sans", monospace';
        ctx.fillStyle = 'white';
        ctx.fillText(`Вы выжили: ${gameState.gameOver.daysSurvived} дней`, canvas.width / 2, 280);

        const { restartButton } = gameState.ui;
        const isHovered = isMouseOver(restartButton.x, restartButton.y, restartButton.width, restartButton.height);
        ctx.fillStyle = isHovered ? '#FFFF66' : 'yellow';
        ctx.fillRect(restartButton.x, restartButton.y, restartButton.width, restartButton.height);
        ctx.fillStyle = 'black';
        ctx.fillText('В меню', restartButton.x + restartButton.width / 2, restartButton.y + restartButton.height / 2);
    }

    // --- Логика отрисовки Экрана Загрузки ---
    function drawLoadingScreen() {
        const elapsed = Date.now() - gameState.loading.startTime;
        const progress = Math.min(elapsed / gameState.loading.duration, 1);

        // Черный фон
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Текст
        ctx.font = '30px "Pixelify Sans", monospace';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.fillText('Загрузка...', canvas.width / 2, canvas.height / 2 - 30);

        // Полоса загрузки
        ctx.fillStyle = '#444';
        ctx.fillRect(200, canvas.height / 2, 400, 30);
        ctx.fillStyle = 'yellow';
        ctx.fillRect(200, canvas.height / 2, 400 * progress, 30);
    }

    // --- Логика отрисовки Игрового Экрана ---
    function drawGameScreen() {
        // 1. Фон (земля)
        ctx.fillStyle = '#2E8B57'; // Зеленый цвет травы из GDD
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const { player, world, campfire, crafter, inventory } = gameState.game;
        const currentScreenKey = `${world.currentScreenX},${world.currentScreenY}`;
        const currentScreen = world.screens[currentScreenKey] || { trees: [] };

        // 2. Деревья
        currentScreen.trees.forEach(tree => {
            // Ствол
            ctx.fillStyle = '#5C4033'; // Коричневый
            ctx.fillRect(tree.x, tree.y, tree.width, tree.height);
            // Крона
            ctx.fillStyle = '#006400'; // Темно-зеленый
            ctx.beginPath();
            ctx.arc(tree.x + tree.width / 2, tree.y + tree.height / 2, tree.width, 0, Math.PI * 2);
            ctx.fill();
        });

        // Отрисовка грядок
        world.gardenBeds.forEach(bed => {
            if (bed.screenKey === currentScreenKey) {
                ctx.fillStyle = '#654321'; // Темно-коричневый
                ctx.fillRect(bed.x, bed.y, 40, 40);
                ctx.strokeStyle = '#3D2B1F'; // Еще темнее для обводки
                ctx.strokeRect(bed.x, bed.y, 40, 40);
            }
        });

        // Отрисовка лесопилок
        world.woodPiles.forEach(pile => {
            if (pile.screenKey === currentScreenKey) {
                ctx.fillStyle = '#8B4513'; // SaddleBrown
                ctx.fillRect(pile.x, pile.y + 10, 40, 20); // Нижнее полено
                ctx.fillRect(pile.x + 5, pile.y, 30, 20); // Верхнее полено
                ctx.strokeStyle = '#3D2B1F';
                ctx.strokeRect(pile.x, pile.y + 10, 40, 20);
                ctx.strokeRect(pile.x + 5, pile.y, 30, 20);
            }
        });

        // Отрисовка врагов
        gameState.game.enemies.forEach(enemy => {
            if (enemy.screenKey === currentScreenKey) {
                if (enemy.type === 'deer') {
                    ctx.fillStyle = '#A0522D'; // Коричневый для оленя
                    ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
                } else {
                    ctx.fillStyle = '#696969'; // Серый для волка
                    ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
                }
            }
        });

        drawPlantedSeeds();

        // 3. Костер, крафтер и уровень рисуем только на центральном экране (0,0)
        if (world.currentScreenX === 0 && world.currentScreenY === 0) {
            // Костер
            ctx.fillStyle = '#808080'; // Серые камни
            ctx.beginPath();
            ctx.arc(campfire.x, campfire.y, campfire.radius, 0, Math.PI * 2);
            ctx.fill();
            
            // Анимация огня, если костер зажжен
            if (campfire.isLit) {
                const fireColors = ['#FF4500', '#FFA500', '#FFD700']; // Оранжево-красный, оранжевый, золотой
                const particleCount = 15;
                for (let i = 0; i < particleCount; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const radius = Math.random() * campfire.radius * 0.8;
                    const particleSize = Math.random() * 4 + 2;
                    const x = campfire.x + Math.cos(angle) * radius;
                    const y = campfire.y + Math.sin(angle) * radius - Math.random() * 10; // Смещение вверх
                    ctx.fillStyle = fireColors[Math.floor(Math.random() * fireColors.length)];
                    ctx.fillRect(x - particleSize / 2, y - particleSize / 2, particleSize, particleSize);
                }
            }

            // Уровень костра
            ctx.fillStyle = 'white';
            ctx.font = '16px "Pixelify Sans", monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`Lvl ${campfire.level}`, campfire.x, campfire.y - campfire.radius - 5);

            // Полоса топлива костра
            const barWidth = 80;
            const barHeight = 10;
            const barX = campfire.x - barWidth / 2;
            const barY = campfire.y + campfire.radius + 5; // Рисуем под костром

            // Фон полосы
            ctx.fillStyle = '#444';
            ctx.fillRect(barX, barY, barWidth, barHeight);

            // Заполнение полосы в зависимости от количества топлива
            if (campfire.fuel > 0) {
                const progressWidth = (campfire.fuel / CAMPFIRE_MAX_FUEL) * barWidth;
                ctx.fillStyle = '#FFA500'; // Оранжевый
                ctx.fillRect(barX, barY, progressWidth, barHeight);
            }

            // Текст с опытом
            ctx.font = '12px "Pixelify Sans", monospace';
            ctx.fillStyle = 'white';
            ctx.fillText(`Опыт: ${campfire.xp}/${campfire.xpToNextLevel}`, campfire.x, barY + barHeight + 12);

            // Крафтер (стол/пень)
            ctx.fillStyle = '#A0522D'; // Цвет пня/стола
            ctx.fillRect(crafter.x, crafter.y, crafter.size, crafter.size);
        }

        // 6. Игрок
        ctx.fillStyle = player.color;
        ctx.fillRect(player.x, player.y, player.width, player.height);

        // Ночное затемнение и свет от костра
        drawNightOverlay();

        // 7. Инвентарь
        drawInventory();

        // 8. UI Элементы (Карта, Статы)
        if (player.hasMap) drawMinimap();
        drawPlayerStats();

        // Рисуем UI поверх всего, кроме меню
        drawTopBarUI();

        // 9. Меню крафта (рисуется поверх всего)
        if (crafter.isMenuOpen) drawCraftingMenu();

        // 10. Подсказки по управлению и джойстик
        drawControlHint();
        drawJoystick();
    }

    function drawControlHint() {
        if (gameState.controls.type !== 'pc') return;

        ctx.font = '20px "Pixelify Sans", monospace';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillText('W', 40, canvas.height - 40);
        ctx.fillText('A S D', 20, canvas.height - 20);
    }

    function drawJoystick() {
        if (gameState.controls.type !== 'mobile' || !gameState.controls.joystick.active) return;

        const { joystick } = gameState.controls;
        const baseRadius = 60;
        const stickRadius = 30;

        // Base
        ctx.beginPath();
        ctx.arc(joystick.baseX, joystick.baseY, baseRadius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(128, 128, 128, 0.5)';
        ctx.fill();

        // Stick
        ctx.beginPath();
        ctx.arc(joystick.stickX, joystick.stickY, stickRadius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(80, 80, 80, 0.7)';
        ctx.fill();
    }

    function drawNightOverlay() {
        const { time, campfire, world } = gameState.game;
        if (time.isDay) return;

        // Сохраняем текущее состояние, чтобы не влиять на другие отрисовки
        ctx.save();

        // Сначала заливаем все темным цветом
        ctx.fillStyle = 'rgba(0, 0, 20, 0.8)'; // Сделаем ночь чуть темнее
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Рисуем желтый свет от костра, только на центральном экране
        if (world.currentScreenX === 0 && world.currentScreenY === 0) {
            const lightRadius = 150 + campfire.level * 20; // Свет увеличивается с уровнем костра
            
            // Создаем радиальный градиент для мягкого свечения
            const gradient = ctx.createRadialGradient(campfire.x, campfire.y, lightRadius * 0.1, campfire.x, campfire.y, lightRadius);
            gradient.addColorStop(0, 'rgba(255, 220, 100, 0.25)'); // Теплый желтый свет в центре
            gradient.addColorStop(1, 'rgba(255, 220, 100, 0)');   // Полностью прозрачный на краю

            // Используем 'lighter', чтобы свет "осветлял" темноту, а не просто перекрывал
            ctx.globalCompositeOperation = 'lighter';
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(campfire.x, campfire.y, lightRadius, 0, Math.PI * 2);
            ctx.fill();
        }

        // Возвращаем стандартный режим наложения
        ctx.restore();
    }

    function drawTopBarUI() {
        const { daysSurvived, currentChapter } = gameState.game;
        ctx.font = '22px "Pixelify Sans", monospace';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        const chapterText = gameState.lobby.buttons.find(b => b.chapter === currentChapter)?.text.split(':')[0] || `Глава ${currentChapter}`;
        ctx.fillText(`${chapterText} | День: ${daysSurvived}`, canvas.width / 2, 30);

    }

    function drawMinimap() {
        const { player } = gameState.game;
        const mapSize = 100;
        const mapX = canvas.width - mapSize - 20;
        const mapY = 140; // Сдвинем ниже статов

        // Фон карты
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.beginPath();
        ctx.arc(mapX + mapSize / 2, mapY + mapSize / 2, mapSize / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.stroke();

        // Игрок (желтая точка в центре карты)
        ctx.fillStyle = 'yellow';
        ctx.beginPath();
        ctx.arc(mapX + mapSize / 2, mapY + mapSize / 2, 3, 0, Math.PI * 2);
        ctx.fill();

        // Костер (красная точка, только если он на том же экране, что и игрок)
        if (gameState.game.world.currentScreenX === 0 && gameState.game.world.currentScreenY === 0) {
            const { campfire } = gameState.game;
            const relX = (campfire.x - player.x) / canvas.width * mapSize * 0.5;
            const relY = (campfire.y - player.y) / canvas.height * mapSize * 0.5;
            ctx.fillStyle = 'red';
            ctx.beginPath();
            ctx.arc(mapX + mapSize / 2 + relX, mapY + mapSize / 2 + relY, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawPlayerStats() {
        const { player } = gameState.game;
        const statX = canvas.width - 150;
        const statY = 20;

        // Здоровье (сердца)
        ctx.font = '16px "Pixelify Sans", monospace';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'left';
        ctx.fillText('HP:', statX, statY + 10);
        for (let i = 0; i < player.maxHealth; i++) {
            ctx.fillStyle = i < player.health ? 'red' : '#555';
            ctx.fillRect(statX + 40 + i * 10, statY, 8, 12);
        }

        // Голод
        ctx.fillText('Еда:', statX, statY + 35);
        for (let i = 0; i < player.maxHunger; i++) {
            ctx.fillStyle = i < player.hunger ? '#CD853F' : '#555'; // Перуанский (коричневый)
            ctx.fillRect(statX + 40 + i * 10, statY + 25, 8, 12);
        }
    }

    function drawCraftingMenu() {
        const { crafter } = gameState.game;
        const menuX = 150, menuY = 100, menuWidth = 500, menuHeight = 400;

        // Фон
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(menuX, menuY, menuWidth, menuHeight);
        ctx.strokeStyle = 'yellow';
        ctx.strokeRect(menuX, menuY, menuWidth, menuHeight);

        // Заголовок
        ctx.fillStyle = 'white';
        ctx.font = '24px "Pixelify Sans", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`Верстак (Ур. ${crafter.level})`, menuX + menuWidth / 2, menuY + 30);

        // Переключатель уровней
        ctx.font = '20px "Pixelify Sans", monospace';
        const levelSwitchY = menuY + 60;
        const canGoDown = crafter.viewingCraftLevel > 1;
        const canGoUp = crafter.viewingCraftLevel < crafter.level;

        ctx.fillStyle = canGoDown ? 'white' : 'gray';
        ctx.fillText('<', menuX + menuWidth / 2 - 100, levelSwitchY);

        ctx.fillStyle = 'yellow';
        ctx.fillText(`Просмотр: Ур. ${crafter.viewingCraftLevel}`, menuX + menuWidth / 2, levelSwitchY);

        ctx.fillStyle = canGoUp ? 'white' : 'gray';
        ctx.fillText('>', menuX + menuWidth / 2 + 100, levelSwitchY);

        // Инструкция
        ctx.fillStyle = '#aaa';
        ctx.font = '14px "Pixelify Sans", monospace';
        ctx.fillText('Нажмите на верстак снова, чтобы закрыть.', menuX + menuWidth / 2, menuY + menuHeight - 15);
        // Рецепты
        ctx.font = '18px "Pixelify Sans", monospace';
        ctx.textAlign = 'left';
        const recipes = CRAFTING_RECIPES[crafter.viewingCraftLevel] || [];
        recipes.forEach((recipe, index) => {
            const recipeY = menuY + 110 + index * 40; // Сдвигаем рецепты ниже
            const canCraft = hasResources(recipe.cost);
            ctx.fillStyle = canCraft ? 'white' : 'gray';
            const costText = recipe.cost.map(c => `${c.count} ${ITEM_NAMES[c.id]}`).join(', ');
            ctx.fillText(`[Скрафтить] ${recipe.name} - (${costText})`, menuX + 20, recipeY);
        });

        // Кнопка улучшения
        if (crafter.level < 4 && CRAFTER_UPGRADE_COST[crafter.level + 1]) {
            const upgradeCost = CRAFTER_UPGRADE_COST[crafter.level + 1];
            const canUpgrade = hasResources([{ id: 'wood', count: upgradeCost }]);
            const upgradeY = menuY + menuHeight - 50;
            ctx.fillStyle = canUpgrade ? 'yellow' : 'gray';
            ctx.fillText(`[Улучшить] до Ур. ${crafter.level + 1} (${upgradeCost} Дерево)`, menuX + 20, upgradeY);
        }
    }

    function drawPlantedSeeds() {
        const { world } = gameState.game;
        const currentScreenKey = `${world.currentScreenX},${world.currentScreenY}`;
    
        world.plantedSeeds.forEach(seed => {
            // Рисуем семена только на их экране
            if (seed.screenKey === currentScreenKey) {
                ctx.fillStyle = '#90EE90'; // Светло-зеленый росток
                ctx.beginPath();
                ctx.arc(seed.x, seed.y, 4, 0, Math.PI * 2);
                ctx.fill();
            }
        });
    }
    
    function drawInventory() {
        const { inventory } = gameState.game;
        const slotSize = 60;
        const inventoryX = (canvas.width - inventory.slots * slotSize) / 2;
        const inventoryY = canvas.height - 80;

        for (let i = 0; i < inventory.slots; i++) {
            const slotX = inventoryX + i * slotSize;
            // Если слот выбран, он становится серым
            if (inventory.selectedSlotIndex === i) {
                ctx.fillStyle = '#808080';
            } else {
                ctx.fillStyle = '#333';
            }
            ctx.fillRect(slotX, inventoryY, slotSize, slotSize);

            // Белая обводка
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.strokeRect(slotX, inventoryY, slotSize, slotSize);

            // Отображение предмета
            const item = inventory.items[i];
            if (item) {
                ctx.font = '16px "Pixelify Sans", monospace';
                ctx.fillStyle = 'white';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                const itemName = ITEM_NAMES[item.id] || item.id;
                ctx.fillText(itemName, slotX + slotSize / 2, inventoryY + slotSize / 2 - 8);
                ctx.font = '14px "Pixelify Sans", monospace';
                ctx.fillText(item.count, slotX + slotSize / 2, inventoryY + slotSize / 2 + 12);
            }
        }
    }

    // --- Логика обновления состояния игры ---
    function updateGame() {
        const now = Date.now();
        const { time } = gameState.game;

        // Инициализируем время в первом кадре
        if (time.lastUpdateTime === 0) {
            time.lastUpdateTime = now;
        }

        const deltaTime = now - time.lastUpdateTime;
        time.lastUpdateTime = now;

        updateTime(deltaTime);
        updatePlantedSeeds();
        updateCampfire();
        updateHunger();
        updateGardenBeds();
        updateWoodPiles();
        spawnEnemies();
        updateEnemies();

        const { player, world } = gameState.game;
        const { keys } = player;

        const originalX = player.x;
        const originalY = player.y;

        let dx = 0;
        let dy = 0;

        if (gameState.controls.type === 'pc') {
            // Управление на WASD и на русскую раскладку ЦФЫВ
            if (keys['w'] || keys['W'] || keys['ц'] || keys['Ц']) {
                dy = -player.speed;
            }
            if (keys['s'] || keys['S'] || keys['ы'] || keys['Ы']) {
                dy = player.speed;
            }
            if (keys['a'] || keys['A'] || keys['ф'] || keys['Ф']) {
                dx = -player.speed;
            }
            if (keys['d'] || keys['D'] || keys['в'] || keys['В']) {
                dx = player.speed;
            }
        } else if (gameState.controls.type === 'mobile') {
            const { joystick } = gameState.controls;
            if (joystick.active) {
                dx = joystick.dx * player.speed;
                dy = joystick.dy * player.speed;
            }
        }

        // Обновляем позицию по X и проверяем коллизии
        player.x += dx;
        if (checkAllCollisions()) {
            player.x = originalX; // Если есть коллизия, отменяем движение
        }

        // Обновляем позицию по Y и проверяем коллизии
        player.y += dy;
        if (checkAllCollisions()) {
            player.y = originalY; // Если есть коллизия, отменяем движение
        }

        // Проверка перехода на другую карту
        if (player.x > canvas.width) {
            world.currentScreenX++;
            player.x = 0;
            generateScreenIfNeeded(world.currentScreenX, world.currentScreenY);
        } else if (player.x < -player.width) {
            world.currentScreenX--;
            player.x = canvas.width - player.width;
            generateScreenIfNeeded(world.currentScreenX, world.currentScreenY);
        } else if (player.y > canvas.height) {
            world.currentScreenY++;
            player.y = 0;
            generateScreenIfNeeded(world.currentScreenX, world.currentScreenY);
        } else if (player.y < -player.height) {
            world.currentScreenY--;
            player.y = canvas.height - player.height;
            generateScreenIfNeeded(world.currentScreenX, world.currentScreenY);
        }
    }

    function updateTime(deltaTime) {
        const { time } = gameState.game;
        time.cycleProgress += deltaTime;

        if (time.cycleProgress >= DAY_NIGHT_DURATION) {
            time.isDay = !time.isDay;
            time.cycleProgress = 0;
            if (time.isDay) {
                gameState.game.daysSurvived++;
                console.log(`Наступил день ${gameState.game.daysSurvived}.`);
                checkChapterUnlocks();
            } else {
                console.log("Наступила ночь!");
            }
        }
    }

    function checkChapterUnlocks() {
        const { daysSurvived } = gameState.game;
        if (daysSurvived >= 30) gameState.lobby.buttons[1].active = true;
        if (daysSurvived >= 60) gameState.lobby.buttons[2].active = true;
    }

    function updateHunger() {
        const { time, player } = gameState.game;
        const now = Date.now();
        if (time.lastUpdateTime === 0) return; // Не обновляем, если игра не началась
        if (!time.lastHungerDecreaseTime) time.lastHungerDecreaseTime = now;

        if (now - time.lastHungerDecreaseTime > HUNGER_DECREASE_RATE) {
            time.lastHungerDecreaseTime = now;
            if (player.hunger > 0) {
                player.hunger--;
                console.log(`Голод уменьшился. Текущий голод: ${player.hunger}`);
            }
        }

        // Урон от голода
        if (player.hunger <= 0) {
            if (!gameState.game.lastHungerDamageTime || now - gameState.game.lastHungerDamageTime > 5000) { // Урон каждые 5 секунд
                player.health--;
                gameState.game.lastHungerDamageTime = now;
                console.log(`Вы голодаете! Потеряно здоровье. Осталось: ${player.health}`);
                if (player.health <= 0) {
                    endGame();
                }
            }
        }
    }

    function spawnEnemies() {
        const { time, world, enemies, daysSurvived } = gameState.game;
        const currentScreenKey = `${world.currentScreenX},${world.currentScreenY}`;

        // Спавним только ночью, не в центре и если врагов меньше максимума
        // Волки спавнятся с первой ночи
        if (time.isDay || (world.currentScreenX === 0 && world.currentScreenY === 0)) {
            return;
        }

        const enemiesOnScreen = enemies.filter(e => e.screenKey === currentScreenKey).length;
        if (enemiesOnScreen >= MAX_ENEMIES_PER_SCREEN) return;

        // Шанс спавна оленя (начиная со 2-го дня)
        if (daysSurvived > 1 && Math.random() < 0.003) {
            const x = Math.random() < 0.5 ? -20 : canvas.width + 20; // Спавн за экраном слева или справа
            const y = Math.random() * canvas.height;
            enemies.push({
                type: 'deer',
                x, y,
                width: 22, height: 22,
                speed: DEER_STATS.speed,
                health: DEER_STATS.health,
                damage: DEER_STATS.damage,
                attackCooldown: DEER_STATS.attackCooldown,
                lastAttackTime: 0,
                screenKey: currentScreenKey
            });
            console.log("Появился олень-антагонист!");
            return; // Спавним только одного за раз
        }

        // Шанс спавна волка
        if (Math.random() < 0.005) { // Реже, чтобы не было спам-атаки
            const x = Math.random() < 0.5 ? -20 : canvas.width + 20;
            const y = Math.random() * canvas.height;

            enemies.push({
                type: 'wolf',
                x, y,
                width: 22, height: 22,
                speed: WOLF_STATS.speed,
                health: WOLF_STATS.health,
                damage: WOLF_STATS.damage,
                attackCooldown: WOLF_STATS.attackCooldown,
                lastAttackTime: 0,
                screenKey: currentScreenKey
            });
            console.log("Появился волк!");
        }
    }

    function updateEnemies() {
        const { player, enemies, time, world, campfire } = gameState.game;
        const now = Date.now();
        const currentScreenKey = `${world.currentScreenX},${world.currentScreenY}`;

        if (time.isDay && enemies.length > 0) {
            enemies.length = 0; // Очищаем массив днем
            return;
        }

        enemies.filter(e => e.screenKey === currentScreenKey).forEach(enemy => {
            let targetX = player.x;
            let targetY = player.y;

            // Логика для оленя
            if (enemy.type === 'deer' && world.currentScreenX === 0 && world.currentScreenY === 0) {
                const distToCampfire = Math.hypot(enemy.x - campfire.x, enemy.y - campfire.y);
                if (distToCampfire < DEER_STATS.lightFearRadius) {
                    // Убегаем от костра
                    targetX = enemy.x + (enemy.x - campfire.x);
                    targetY = enemy.y + (enemy.y - campfire.y);
                }
            }
            const dx = targetX - enemy.x;
            const dy = targetY - enemy.y;
            const dist = Math.hypot(dx, dy);
            if (dist > 1) {
                enemy.x += (dx / dist) * enemy.speed;
                enemy.y += (dy / dist) * enemy.speed;
            }

            if (dist < player.width && (!enemy.lastAttackTime || now - enemy.lastAttackTime > enemy.attackCooldown)) {
                player.health -= enemy.damage;
                enemy.lastAttackTime = now;
                console.log(`Вас атаковал враг! Осталось здоровья: ${player.health}`);
                if (player.health <= 0) {
                    endGame();
                }
            }
        });
    }

    function updateGardenBeds() {
        const now = Date.now();
        gameState.game.world.gardenBeds.forEach(bed => {
            if (!bed.lastGrowthTime) bed.lastGrowthTime = now;

            if (now - bed.lastGrowthTime > GARDEN_BED_GROW_RATE) {
                addItemToInventory({ id: 'carrot', count: 1 });
                bed.lastGrowthTime = now;
                console.log("На грядке выросла морковь!");
            }
        });
    }

    function updateWoodPiles() {
        const now = Date.now();
        gameState.game.world.woodPiles.forEach(pile => {
            if (!pile.lastCollectionTime) pile.lastCollectionTime = now;

            if (now - pile.lastCollectionTime > WOOD_PILE_RATE) {
                addItemToInventory({ id: 'wood', count: 1 });
                pile.lastCollectionTime = now;
                console.log("Лесопилка принесла 1 дерево!");
            }
        });
    }

    function updateCampfire() {
        const { campfire } = gameState.game;
        if (!campfire.isLit) return; // Если костер не горит, ничего не делаем

        const now = Date.now();
        // Инициализация таймера при первом запуске или после розжига
        if (campfire.lastFuelBurnTime === 0) {
            campfire.lastFuelBurnTime = now;
        }

        if (now - campfire.lastFuelBurnTime > CAMPFIRE_FUEL_BURN_RATE) {
            campfire.fuel--;
            campfire.lastFuelBurnTime = now;
            console.log(`В костре сгорело полено. Осталось: ${campfire.fuel}`);

            if (campfire.fuel <= 0) {
                campfire.isLit = false;
                campfire.fuel = 0;
                console.log("Костер погас!");
            }
        }
    }

    function updatePlantedSeeds() {
        const { world } = gameState.game;
        const now = Date.now();

        // Идем с конца, чтобы безопасно удалять элементы
        for (let i = world.plantedSeeds.length - 1; i >= 0; i--) {
            const seed = world.plantedSeeds[i];
            if (now - seed.startTime > SEED_GROWTH_TIME) {
                // Семя выросло!
                const screen = world.screens[seed.screenKey];
                if (screen) {
                    const treeSize = 20;
                    // Добавляем новое дерево на его экран
                    screen.trees.push({ x: seed.x - treeSize / 2, y: seed.y - treeSize / 2, width: treeSize, height: treeSize });
                    console.log(`Дерево выросло на экране ${seed.screenKey}!`);
                }
                // Удаляем семя из списка
                world.plantedSeeds.splice(i, 1);
            }
        }
    }
    // --- Вспомогательные функции ---
    function isMouseOver(x, y, width, height) {
        const { mouse } = gameState;
        return mouse.x > x && mouse.x < x + width && mouse.y > y && mouse.y < y + height;
    }

    // Проверка наведения мыши на круг
    function isMouseOverCircle(circle) {
        const { mouse } = gameState;
        const distanceX = mouse.x - circle.x;
        const distanceY = mouse.y - circle.y;
        return (distanceX * distanceX) + (distanceY * distanceY) < (circle.radius * circle.radius);
    }

    function hasResources(costArray) {
        const { inventory } = gameState.game;
        return costArray.every(costItem => {
            const inventoryItem = inventory.items.find(i => i && i.id === costItem.id);
            return inventoryItem && inventoryItem.count >= costItem.count;
        });
    }

    function spendResources(costArray) {
        const { inventory } = gameState.game;
        if (!hasResources(costArray)) {
            console.log("Недостаточно ресурсов!");
            return false;
        }

        costArray.forEach(costItem => {
            for (let i = 0; i < inventory.items.length; i++) {
                const inventoryItem = inventory.items[i];
                if (inventoryItem && inventoryItem.id === costItem.id) {
                    inventoryItem.count -= costItem.count;
                    if (inventoryItem.count <= 0) {
                        if (inventory.selectedSlotIndex === i) {
                            inventory.selectedSlotIndex = null;
                        }
                        inventory.items[i] = null;
                    }
                    break; 
                }
            }
        });
        return true;
    }

    // Проверка коллизии игрока со всеми объектами
    function checkAllCollisions() { // Теперь проверяет коллизии только на текущем экране
        const { player, world, campfire, crafter } = gameState.game;
        const playerRect = { x: player.x, y: player.y, width: player.width, height: player.height };
        const currentScreenKey = `${world.currentScreenX},${world.currentScreenY}`;
        const currentScreen = world.screens[currentScreenKey];

        if (!currentScreen) return false; // Если экрана нет, коллизий нет

        // С деревьями
        for (const tree of currentScreen.trees) {
            if (isRectColliding(playerRect, tree)) return true;
        }

        // С грядками
        for (const bed of world.gardenBeds) {
            if (bed.screenKey === currentScreenKey && isRectColliding(playerRect, {x: bed.x, y: bed.y, width: 40, height: 40})) return true;
        }

        // С лесопилками
        for (const pile of world.woodPiles) {
            if (pile.screenKey === currentScreenKey && isRectColliding(playerRect, {x: pile.x, y: pile.y, width: 40, height: 30})) {
                return true;
            }
        }

        // Коллизии с костром и крафтером только на центральном экране
        if (world.currentScreenX === 0 && world.currentScreenY === 0) {
            // С крафтером
            const crafterRect = { x: crafter.x, y: crafter.y, width: crafter.size, height: crafter.size };
            if (isRectColliding(playerRect, crafterRect)) return true;

            // С костром (проверка круг-прямоугольник)
            const circle = { x: campfire.x, y: campfire.y, radius: campfire.radius };
            const closestX = Math.max(playerRect.x, Math.min(circle.x, playerRect.x + playerRect.width));
            const closestY = Math.max(playerRect.y, Math.min(circle.y, playerRect.y + playerRect.height));
            const distanceX = circle.x - closestX;
            const distanceY = circle.y - closestY;
            if ((distanceX * distanceX) + (distanceY * distanceY) < (circle.radius * circle.radius)) {
                return true;
            }
        }

        return false;
    }

    function endGame() {
        console.log("Игра окончена!");
        gameState.currentScreen = 'gameOver';
        gameState.gameOver = { daysSurvived: gameState.game.daysSurvived };
    }

    function isRectColliding(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width && rect1.x + rect1.width > rect2.x && rect1.y < rect2.y + rect2.height && rect1.y + rect1.height > rect2.y;
    }

    function addItemToInventory(newItem) {
        const { inventory } = gameState.game;

        // 1. Попытка сложить в существующий стак
        for (const item of inventory.items) {
            // Убедимся, что item не null/undefined
            if (item && item.id === newItem.id) {
                item.count += newItem.count;
                console.log(`Добавлено ${newItem.count} ${ITEM_NAMES[newItem.id] || newItem.id}. Всего: ${item.count}`);
                return; // Предмет добавлен в стак
            }
        }

        // 2. Поиск пустого слота
        for (let i = 0; i < inventory.slots; i++) {
            if (!inventory.items[i]) {
                inventory.items[i] = { ...newItem }; // Копируем объект, чтобы избежать проблем со ссылками
                console.log(`Предмет ${ITEM_NAMES[newItem.id] || newItem.id} добавлен в слот ${i}.`);
                return; // Предмет добавлен в новый слот
            }
        }

        // 3. Если инвентарь полон
        console.log('Инвентарь полон!');
    }
    // --- Обработчики событий ---
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        gameState.mouse.x = e.clientX - rect.left;
        gameState.mouse.y = e.clientY - rect.top;
    });

    canvas.addEventListener('click', (e) => {
        const { crafter } = gameState.game;

        // --- Обработка кликов в меню крафта (если оно открыто) ---
        if (crafter.isMenuOpen) {
            const menuX = 150, menuY = 100, menuHeight = 400, menuWidth = 500;
            const recipes = CRAFTING_RECIPES[crafter.viewingCraftLevel] || [];

            // Клик по переключателям уровня
            const levelSwitchY = menuY + 60;
            // Стрелка влево
            if (isMouseOver(menuX + menuWidth / 2 - 110, levelSwitchY - 15, 20, 30)) {
                if (crafter.viewingCraftLevel > 1) {
                    crafter.viewingCraftLevel--;
                }
            }
            // Стрелка вправо
            if (isMouseOver(menuX + menuWidth / 2 + 90, levelSwitchY - 15, 20, 30)) {
                if (crafter.viewingCraftLevel < crafter.level) {
                    crafter.viewingCraftLevel++;
                }
            }

            // Клик по рецептам
            recipes.forEach((recipe, index) => {
                const recipeY = menuY + 110 + index * 40;
                if (isMouseOver(menuX + 20, recipeY - 10, 460, 20)) {
                    console.log(`Попытка скрафтить: ${recipe.name}`);
                    if (spendResources(recipe.cost)) {
                        if (recipe.unlocks) {
                            gameState.game.player[recipe.unlocks] = true;
                            console.log(`Разблокировано: ${recipe.name}`);
                        }
                        if (recipe.gives) {
                            addItemToInventory(recipe.gives);
                        }
                    }
                }
            });

            // Клик по улучшению
            if (crafter.level < 4 && CRAFTER_UPGRADE_COST[crafter.level + 1]) {
                const upgradeY = menuY + menuHeight - 50;
                if (isMouseOver(menuX + 20, upgradeY - 10, 460, 20)) {
                    const cost = [{ id: 'wood', count: CRAFTER_UPGRADE_COST[crafter.level + 1] }];
                    if (spendResources(cost)) {
                        crafter.level++;
                        console.log(`Верстак улучшен до уровня ${crafter.level}!`);
                        crafter.viewingCraftLevel = crafter.level; // Автоматически переключаемся на новый уровень
                    }
                }
            }

            // Клик по верстаку для закрытия меню
            if (isMouseOver(crafter.x, crafter.y, crafter.size, crafter.size)) {
                crafter.isMenuOpen = false;
                crafter.viewingCraftLevel = crafter.level; // Сбрасываем просмотр на текущий уровень
            }
            return; // Прерываем дальнейшую обработку клика, т.к. меню было открыто
        }

        if (gameState.currentScreen === 'game') {
            const { inventory, world, campfire, player, crafter } = gameState.game;
            const selectedItem = inventory.items[inventory.selectedSlotIndex];
            const slotSize = 60;
            const inventoryX = (canvas.width - inventory.slots * slotSize) / 2;
            const inventoryY = canvas.height - 80;

            // Проверяем клик по инвентарю
            if (gameState.mouse.y >= inventoryY && gameState.mouse.y <= inventoryY + slotSize) {
                for (let i = 0; i < inventory.slots; i++) {
                    const slotX = inventoryX + i * slotSize;
                    if (gameState.mouse.x >= slotX && gameState.mouse.x <= slotX + slotSize) {
                        // Если кликнули по тому же слоту, снимаем выделение, иначе - выбираем новый
                        inventory.selectedSlotIndex = (inventory.selectedSlotIndex === i) ? null : i;
                        console.log(`Выбран слот инвентаря: ${inventory.selectedSlotIndex}`);
                        return; // Выходим, чтобы не обработать клик по дереву
                    }
                }
            }

            // Логика открытия меню крафта
            if (world.currentScreenX === 0 && world.currentScreenY === 0 && isMouseOver(crafter.x, crafter.y, crafter.size, crafter.size)) {
                crafter.isMenuOpen = true;
                crafter.viewingCraftLevel = crafter.level; // При открытии всегда показываем макс. уровень
                console.log("Открыто меню крафта");
                return;
            }

            // Логика поедания моркови
            if (selectedItem && selectedItem.id === 'carrot') {
                if (player.hunger < player.maxHunger) {
                    player.hunger += EAT_EFFECTS.carrot.hunger;
                    if (player.hunger > player.maxHunger) player.hunger = player.maxHunger;
                    const itemInSlot = inventory.items[inventory.selectedSlotIndex];
                    itemInSlot.count--;
                    if (itemInSlot.count <= 0) {
                        inventory.items[inventory.selectedSlotIndex] = null;
                    }
                    console.log("Вы съели морковь. Голод восстановлен.");
                    return; // Действие выполнено, выходим
                }
                // Если не голодны, ничего не делаем и позволяем другим действиям (рубка) произойти
            }

            // Логика рубки деревьев
            // Проверяем, что выбран предмет и это топор
            // Эта проверка теперь не в else if, чтобы можно было атаковать, даже если в руке морковь, но игрок не голоден
            if (selectedItem && selectedItem.id === 'axe') {
                const currentScreenKey = `${world.currentScreenX},${world.currentScreenY}`;
                const currentScreen = world.screens[currentScreenKey];
                if (!currentScreen) return;

                // Ищем, по какому дереву кликнули (идем с конца, чтобы безопасно удалять)
                for (let i = currentScreen.trees.length - 1; i >= 0; i--) {
                    const tree = currentScreen.trees[i];
                    if (isMouseOver(tree.x, tree.y, tree.width, tree.height)) {
                        console.log('Вы срубили дерево!');
                        currentScreen.trees.splice(i, 1); // Удаляем дерево
                        addItemToInventory({ id: 'wood', count: 3 }); // Добавляем 3 древесины
                        addItemToInventory({ id: 'seed', count: 1 }); // Добавляем 1 семя
                        return; // Срубили одно дерево за клик
                    }
                }

                // Логика атаки врагов
                for (let i = gameState.game.enemies.length - 1; i >= 0; i--) {
                    const enemy = gameState.game.enemies[i];
                    if (enemy.screenKey === currentScreenKey && isMouseOver(enemy.x, enemy.y, enemy.width, enemy.height)) {
                        console.log("Вы атаковали врага!");
                        enemy.health--;
                        if (enemy.health <= 0) {
                            gameState.game.enemies.splice(i, 1);
                            console.log("Враг побежден!");
                        }
                        return; // Атакуем одного врага за клик
                    }
                }
            }

            // Логика добавления дров в костер
            // Проверяем, что выбран предмет, это дерево и мы на центральном экране
            if (selectedItem && selectedItem.id === 'wood' && world.currentScreenX === 0 && world.currentScreenY === 0) {
                // Проверяем клик по костру
                if (isMouseOverCircle(campfire)) {
                    // Проверяем, есть ли место для топлива
                    if (campfire.fuel >= CAMPFIRE_MAX_FUEL) {
                        console.log("Костер полон, больше дров не помещается!");
                        return; // Выходим, не тратя дрова
                    }

                    console.log('Добавляем дрова в костер...');
                    // 1. Уменьшаем количество дров в инвентаре
                    selectedItem.count--;
                    if (selectedItem.count <= 0) {
                        // Если дрова закончились, убираем их из инвентаря
                        inventory.items[inventory.selectedSlotIndex] = null;
                    }

                    // 2. Добавляем топливо в костер
                    campfire.fuel++;

                    // 3. Если костер не горел, разжигаем его
                    if (!campfire.isLit) {
                        campfire.isLit = true;
                        campfire.lastFuelBurnTime = Date.now(); // Сбрасываем таймер сгорания
                        console.log("Костер снова зажжен!");
                    }

                    // 4. Добавляем "опыт" костру
                    campfire.xp++;

                    // 5. Проверяем, не пора ли повысить уровень
                    if (campfire.xp >= campfire.xpToNextLevel) {
                        campfire.level++;
                        campfire.xp = 0; // Сбрасываем опыт
                        campfire.xpToNextLevel = Math.floor(campfire.xpToNextLevel * 1.5); // Усложняем следующий уровень
                        console.log(`Костер достиг уровня ${campfire.level}!`);
                    }
                    return; // Завершаем обработку клика
                }
            }

            // Логика посадки семян
            if (selectedItem && selectedItem.id === 'seed') {
                console.log('Выбрано семя. Посадка...');
                // Уменьшаем количество семян
                selectedItem.count--;
                if (selectedItem.count <= 0) {
                    inventory.items[inventory.selectedSlotIndex] = null;
                }

                // Добавляем семя в мир для отслеживания роста
                const currentScreenKey = `${world.currentScreenX},${world.currentScreenY}`;
                world.plantedSeeds.push({ x: gameState.mouse.x, y: gameState.mouse.y, startTime: Date.now(), screenKey: currentScreenKey });
                return; // Завершаем обработку клика
            }

            // Логика размещения грядок
            if (selectedItem && selectedItem.id === 'garden_bed') {
                console.log('Размещение грядки...');
                selectedItem.count--;
                if (selectedItem.count <= 0) {
                    inventory.items[inventory.selectedSlotIndex] = null;
                }
                const currentScreenKey = `${world.currentScreenX},${world.currentScreenY}`;
                world.gardenBeds.push({ x: gameState.mouse.x - 20, y: gameState.mouse.y - 20, screenKey: currentScreenKey, lastGrowthTime: Date.now() });
                return;
            }

            // Логика размещения лесопилки
            if (selectedItem && selectedItem.id === 'wood_pile') {
                console.log('Размещение лесопилки...');
                selectedItem.count--;
                if (selectedItem.count <= 0) {
                    inventory.items[inventory.selectedSlotIndex] = null;
                }
                const currentScreenKey = `${world.currentScreenX},${world.currentScreenY}`;
                world.woodPiles.push({
                    x: gameState.mouse.x - 20,
                    y: gameState.mouse.y - 15,
                    screenKey: currentScreenKey,
                    lastCollectionTime: Date.now()
                });
                return;
            }
        }


        if (gameState.currentScreen === 'lobby') {
            // Проверяем клик по кнопкам глав
            const buttonWidth = 400;
            const buttonHeight = 60;
            const buttonX = (canvas.width - buttonWidth) / 2;

            gameState.lobby.buttons.forEach(button => {
                if (button.active && isMouseOver(buttonX, button.y, buttonWidth, buttonHeight)) {
                    handleButtonClick(button.id, button.chapter);
                }
            });

            // Проверяем клик по кнопке бейджей
            const { badgesButton } = gameState.ui;
            if (isMouseOver(badgesButton.x, badgesButton.y, badgesButton.width, badgesButton.height)) {
                gameState.currentScreen = 'badgesScreen';
            }

            // Проверяем клик по кнопке управления
            const { controlsButton } = gameState.ui;
            if (isMouseOver(controlsButton.x, controlsButton.y, controlsButton.width, controlsButton.height)) {
                gameState.controls.type = gameState.controls.type === 'pc' ? 'mobile' : 'pc';
                console.log(`Режим управления переключен на: ${gameState.controls.type}`);
            }
        } else if (gameState.currentScreen === 'badgesScreen') {
            // Проверяем клик по кнопке "Назад"
            const { backButton } = gameState.ui;
            if (isMouseOver(backButton.x, backButton.y, backButton.width, backButton.height)) {
                gameState.currentScreen = 'lobby';
            }
        } else if (gameState.currentScreen === 'gameOver') {
            const { restartButton } = gameState.ui;
            if (isMouseOver(restartButton.x, restartButton.y, restartButton.width, restartButton.height)) {
                gameState.currentScreen = 'lobby';
            }
        }
    });

    // Слушаем нажатия клавиш для управления персонажем
    document.addEventListener('keydown', (e) => {
        if (gameState.currentScreen === 'game') {
            gameState.game.player.keys[e.key] = true;
        }
    });
    document.addEventListener('keyup', (e) => {
        gameState.game.player.keys[e.key] = false;
    });

    // --- Обработчики для мобильного управления ---
    canvas.addEventListener('touchstart', (e) => {
        if (gameState.currentScreen !== 'game' || gameState.controls.type !== 'mobile') return;
        e.preventDefault(); // Предотвращаем скролл страницы

        const touch = e.touches[0];
        // Активируем джойстик только если касание в левой нижней четверти экрана
        if (touch.clientX < canvas.width / 2 && touch.clientY > canvas.height / 2) {
            const joystick = gameState.controls.joystick;
            joystick.active = true;
            joystick.baseX = touch.clientX;
            joystick.baseY = touch.clientY;
            joystick.stickX = touch.clientX;
            joystick.stickY = touch.clientY;
            joystick.dx = 0;
            joystick.dy = 0;
        }
    });

    canvas.addEventListener('touchmove', (e) => {
        if (gameState.currentScreen !== 'game' || gameState.controls.type !== 'mobile' || !gameState.controls.joystick.active) return;
        e.preventDefault();

        const touch = e.touches[0];
        const joystick = gameState.controls.joystick;
        
        const dx = touch.clientX - joystick.baseX;
        const dy = touch.clientY - joystick.baseY;
        const dist = Math.hypot(dx, dy);
        const baseRadius = 60;

        if (dist > baseRadius) {
            joystick.stickX = joystick.baseX + (dx / dist) * baseRadius;
            joystick.stickY = joystick.baseY + (dy / dist) * baseRadius;
        } else {
            joystick.stickX = touch.clientX;
            joystick.stickY = touch.clientY;
        }

        // Normalize direction
        const normalizedDist = Math.min(dist, baseRadius);
        const deadZone = 10;
        if (normalizedDist > deadZone) {
            joystick.dx = (joystick.stickX - joystick.baseX) / baseRadius;
            joystick.dy = (joystick.stickY - joystick.baseY) / baseRadius;
        } else {
            joystick.dx = 0;
            joystick.dy = 0;
        }
    });

    canvas.addEventListener('touchend', (e) => {
        if (gameState.currentScreen !== 'game' || gameState.controls.type !== 'mobile' || !gameState.controls.joystick.active) return;
        e.preventDefault();
        
        const joystick = gameState.controls.joystick;
        joystick.active = false;
        joystick.dx = 0;
        joystick.dy = 0;
    });

    function handleButtonClick(buttonId, chapter) {
        console.log(`Начинаем Главу ${chapter}...`);
        startLoadingGame(chapter);
    }

    // Инициализация новой игры
    function initGame(chapter = 1) {
        const { player, world, campfire, crafter, inventory, time } = gameState.game;
        gameState.game.enemies = []; // Очищаем врагов

        // Сбрасываем мир и инвентарь
        world.screens = {};
        world.currentScreenX = 0;
        world.currentScreenY = 0;
        world.plantedSeeds = [];
        world.gardenBeds = [];
        world.woodPiles = [];

        // Устанавливаем главу и день
        gameState.game.currentChapter = chapter;
        gameState.game.daysSurvived = (chapter - 1) * 30 + 1;
        checkChapterUnlocks();

        time.isDay = true;
        time.cycleProgress = 0;
        time.lastUpdateTime = 0;
        time.lastHungerDecreaseTime = 0;

        inventory.items = [{ id: 'axe', count: 1 }]; // Даем топор
        inventory.selectedSlotIndex = null;

        player.health = player.maxHealth;
        player.hunger = player.maxHunger;
        player.hasMap = false;
        player.keys = {};

        // Размещаем костер в центре, а крафтер рядом
        campfire.x = canvas.width / 2;
        campfire.y = canvas.height / 2;
        campfire.level = 1;
        campfire.isLit = true;
        campfire.xp = 0;
        campfire.xpToNextLevel = 5;
        campfire.fuel = 5; // Начальный запас топлива
        campfire.lastFuelBurnTime = 0; // Таймер сбросится при первом обновлении

        crafter.x = campfire.x + 50;
        crafter.y = campfire.y - crafter.size / 2;
        crafter.level = 1;
        crafter.isMenuOpen = false;
        crafter.viewingCraftLevel = 1;

        // Спавним игрока рядом с костром
        player.x = campfire.x - player.width / 2;
        player.y = campfire.y + 50;

        // Генерируем стартовый экран
        generateScreenIfNeeded(0, 0);
    }

    // Функция для генерации мира "на лету"
    function generateScreenIfNeeded(screenX, screenY) {
        const { world } = gameState.game;
        const screenKey = `${screenX},${screenY}`;

        // Если экран уже сгенерирован, ничего не делаем
        if (world.screens[screenKey]) {
            return;
        }

        console.log(`Генерация нового экрана: ${screenKey}`);
        const newScreen = { trees: [] };
        const treeSize = 20;
        const treeCount = (screenX === 0 && screenY === 0) ? 15 : 30; // Больше деревьев на новых картах

        for (let i = 0; i < treeCount; i++) {
            const x = Math.random() * (canvas.width - 100) + 50;
            const y = Math.random() * (canvas.height - 100) + 50;

            // На центральном экране не ставим деревья близко к костру
            if (screenX === 0 && screenY === 0) {
                if (Math.hypot(x - gameState.game.campfire.x, y - gameState.game.campfire.y) > 100) {
                    newScreen.trees.push({ x, y, width: treeSize, height: treeSize });
                }
            } else {
                newScreen.trees.push({ x, y, width: treeSize, height: treeSize });
            }
        }
        world.screens[screenKey] = newScreen;
    }

    function startLoadingGame(chapter) {
        gameState.currentScreen = 'loadingScreen';
        gameState.loading.startTime = Date.now();

        setTimeout(() => {
            console.log("Загрузка завершена! Переход в игру.");
            initGame(chapter); // Подготавливаем новую игру для выбранной главы
            gameState.currentScreen = 'game'; // Переключаемся на игровой экран
        }, gameState.loading.duration);
    }

    // --- Главный игровой цикл ---
    function gameLoop() {
        if (gameState.currentScreen === 'lobby') {
            drawLobby();
        } else if (gameState.currentScreen === 'badgesScreen') {
            drawBadgesScreen();
        } else if (gameState.currentScreen === 'loadingScreen') {
            drawLoadingScreen();
        } else if (gameState.currentScreen === 'game') {
            updateGame(); // Сначала обновляем логику (движение)
            drawGameScreen(); // Затем рисуем результат
        } else if (gameState.currentScreen === 'gameOver') {
            drawGameOverScreen();
        }
        requestAnimationFrame(gameLoop);
    }

    // Запуск игры
    console.log("Инициализация игрового цикла...");
    gameLoop();
});