/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
   // @TODO: Расчет выручки от операции
   const { discount, sale_price, quantity } = purchase;
    
    // Переводим скидку из процентов в десятичное число
    const discountDecimal = discount / 100;
    
    // Считаем полную стоимость без скидки
    const fullPrice = sale_price * quantity;
    
    // Считаем выручку с учетом скидки
    const revenue = fullPrice * (1 - discountDecimal);
    
    return revenue;
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
    // @TODO: Расчет бонуса от позиции в рейтинге
    const { profit } = seller;

     // Последнее место (индекс = total - 1) — бонус 0%
    if (index === total - 1) {
        return 0;
    }
    
    // Первое место — бонус 15%
    if (index === 0) {
        return 15;
    }
    
    // Второе и третье место — бонус 10%
    if (index === 1 || index === 2) {
        return 10;
    }
    
    // Все остальные (с 4-го места и до предпоследнего) — бонус 5%
    return 5;
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
    // @TODO: Проверка входных данных

    // @TODO: Проверка наличия опций

    // @TODO: Подготовка промежуточных данных для сбора статистики

    // @TODO: Индексация продавцов и товаров для быстрого доступа

    // @TODO: Расчет выручки и прибыли для каждого продавца

    // @TODO: Сортировка продавцов по прибыли

    // @TODO: Назначение премий на основе ранжирования

    // @TODO: Подготовка итоговой коллекции с нужными полями
}

/**
 * Главная функция анализа данных продаж
 * @param {Object} data - объект с коллекциями (customers, products, sellers, purchase_records)
 * @param {Object} options - настройки с функциями расчёта
 * @param {Function} options.calculateRevenue - функция расчёта выручки
 * @param {Function} options.calculateBonus - функция расчёта бонуса
 * @returns {Array} массив объектов продавцов с рассчитанными показателями
 */
function analyzeSalesData(data, options) {
    // Шаг 1: Проверим входящие данные
    if (!data || !options) {
        console.error('Отсутствуют обязательные параметры');
        return [];
    }
    
    const { calculateRevenue, calculateBonus } = options;
    
    if (typeof calculateRevenue !== 'function' || typeof calculateBonus !== 'function') {
        console.error('Неверные функции расчёта');
        return [];
    }
    
    const { sellers, products, purchase_records } = data;
    
    if (!sellers || !products || !purchase_records) {
        console.error('Отсутствуют необходимые коллекции данных');
        return [];
    }
    
    // Шаг 2: Создадим карту товаров для быстрого доступа по SKU
    const productsMap = new Map();
    products.forEach(product => {
        productsMap.set(product.sku, product);
    });
    
    // Шаг 3: Соберём промежуточные данные по продавцам
    const sellersStats = new Map();
    
    // Инициализируем статистику для каждого продавца
    sellers.forEach(seller => {
        sellersStats.set(seller.id, {
            seller_id: seller.id,
            name: `${seller.first_name} ${seller.last_name}`,
            revenue: 0,
            profit: 0,
            sales_count: 0,
            top_products: new Map(), // временное хранилище для подсчёта товаров
            purchase_costs: 0,       // себестоимость проданных товаров
        });
    });
    
    // Шаг 4: Обработаем все чеки (покупки)
    for (const receipt of purchase_records) {
        const sellerId = receipt.seller_id;
        const sellerStat = sellersStats.get(sellerId);
        
        if (!sellerStat) continue; // если продавец не найден, пропускаем
        
        // Увеличиваем количество продаж (чеков)
        sellerStat.sales_count++;
        
        // Обрабатываем каждую позицию в чеке
        for (const item of receipt.items) {
            const { sku, quantity } = item;
            
            // Получаем информацию о товаре из каталога
            const product = productsMap.get(sku);
            if (!product) continue;
            
            // Рассчитываем выручку по позиции
            const revenue = calculateRevenue(item, product);
            sellerStat.revenue += revenue;
            
            // Рассчитываем себестоимость (затраты магазина)
            const cost = product.purchase_price * quantity;
            sellerStat.purchase_costs += cost;
            
            // Считаем количество проданных товаров для топа
            const currentQuantity = sellerStat.top_products.get(sku) || 0;
            sellerStat.top_products.set(sku, currentQuantity + quantity);
        }
    }
    
    // Шаг 5: Рассчитаем прибыль и подготовим топ товаров
    const sellersList = [];
    
    for (const [sellerId, stat] of sellersStats) {
        // Прибыль = выручка - себестоимость
        const profit = stat.revenue - stat.purchase_costs;
        stat.profit = profit;
        
        // Формируем топ-10 товаров
        const topProducts = Array.from(stat.top_products.entries())
            .map(([sku, quantity]) => ({ sku, quantity }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);
        
        // Создаём финальный объект продавца
        sellersList.push({
            seller_id: stat.seller_id,
            name: stat.name,
            revenue: Math.round(stat.revenue * 100) / 100,  // округляем до 2 знаков
            profit: Math.round(stat.profit * 100) / 100,
            sales_count: stat.sales_count,
            top_products: topProducts,
            bonus: 0,  // временно, рассчитаем позже
        });
    }
    
    // Шаг 6: Отсортируем продавцов по убыванию прибыли
    sellersList.sort((a, b) => b.profit - a.profit);
    
    // Шаг 7: Рассчитаем бонус для каждого продавца
    const total = sellersList.length;
    sellersList.forEach((seller, index) => {
        const bonusPercent = calculateBonus(index, total, seller);
        seller.bonus = Math.round((seller.profit * bonusPercent / 100) * 100) / 100;
    });
    
    // Шаг 8: Вернём итоговый отчёт
    return sellersList;
}