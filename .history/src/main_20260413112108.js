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
    // Проверка данных
    if (!data || !options) return [];
    
    const { calculateRevenue, calculateBonus } = options;
    const { sellers, products, purchase_records } = data;
    
    // ===== СОЗДАЁМ ИНДЕКСЫ ДЛЯ БЫСТРОГО ДОСТУПА =====
    
    // 1. Map продавцов по id
    const sellersMap = new Map();
    sellers.forEach(seller => {
        sellersMap.set(seller.id, seller);
    });
    
    // 2. Map товаров по sku
    const productsMap = new Map();
    products.forEach(product => {
        productsMap.set(product.sku, product);
    });
    
    // ===== СОЗДАЁМ ПРОМЕЖУТОЧНЫЕ ДАННЫЕ ДЛЯ СТАТИСТИКИ =====
    
    const sellersStats = new Map(); // ключ: seller_id, значение: объект статистики
    
    // Инициализируем статистику для каждого продавца
    sellers.forEach(seller => {
        sellersStats.set(seller.id, {
            id: seller.id,
            name: `${seller.first_name} ${seller.last_name}`,
            revenue: 0,
            profit: 0,
            sales_count: 0,
            products_sold: {}  // пустой объект для накопления товаров
        });
    });
    
    // ===== ОБРАБАТЫВАЕМ ЧЕКИ =====
    
    for (const receipt of purchase_records) {
        const sellerId = receipt.seller_id;
        const sellerStat = sellersStats.get(sellerId);
        
        if (!sellerStat) continue; // продавец не найден
        
        // Увеличиваем счётчик чеков
        sellerStat.sales_count++;
        
        // Обрабатываем каждую позицию в чеке
        for (const item of receipt.items) {
            const { sku, quantity } = item;
            
            // Получаем товар из Map (быстрый доступ)
            const product = productsMap.get(sku);
            if (!product) continue;
            
            // 1. Рассчитываем выручку для этой позиции
            const revenue = calculateRevenue(item, product);
            sellerStat.revenue += revenue;
            
            // 2. Накопливаем количество проданных товаров
            if (sellerStat.products_sold[sku]) {
                sellerStat.products_sold[sku] += quantity;
            } else {
                sellerStat.products_sold[sku] = quantity;
            }
            
            // 3. Себестоимость (понадобится для прибыли)
            // можно накапливать в отдельном поле или вычислить позже
            if (!sellerStat.total_cost) sellerStat.total_cost = 0;
            sellerStat.total_cost += product.purchase_price * quantity;
        }
    }
    
    // ===== РАССЧИТЫВАЕМ ПРИБЫЛЬ =====
    
    for (const [sellerId, stat] of sellersStats) {
        stat.profit = stat.revenue - (stat.total_cost || 0);
    }
    
    // ===== ФОРМИРУЕМ ТОП-10 ТОВАРОВ =====
    
    const sellersList = [];
    
    for (const [sellerId, stat] of sellersStats) {
        // Преобразуем products_sold в массив и сортируем
        const topProducts = Object.entries(stat.products_sold)
            .map(([sku, quantity]) => ({ sku, quantity }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);
        
        sellersList.push({
            seller_id: sellerId,
            name: stat.name,
            revenue: Math.round(stat.revenue * 100) / 100,
            profit: Math.round(stat.profit * 100) / 100,
            sales_count: stat.sales_count,
            top_products: topProducts,
            bonus: 0  // временно
        });
    }
    
    // ===== СОРТИРУЕМ И РАССЧИТЫВАЕМ БОНУСЫ =====
    
    sellersList.sort((a, b) => b.profit - a.profit);
    
    const total = sellersList.length;
    sellersList.forEach((seller, index) => {
        const bonusPercent = calculateBonus(index, total, seller);
        seller.bonus = Math.round((seller.profit * bonusPercent / 100) * 100) / 100;
    });
    
    return sellersList;
}
