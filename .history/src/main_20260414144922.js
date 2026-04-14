/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
    const discountDecimal = purchase.discount / 100;
    const revenue = purchase.sale_price * purchase.quantity * (1 - discountDecimal);
    return Math.round(revenue * 100) / 100;
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
    if (index === 0) return 15;
    if (index === 1 || index === 2) return 10;
    if (index === total - 1) return 0;
    return 5;
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
    // Проверка наличия данных
    if (!data) {
        throw new Error('Ошибка: параметр data не передан или равен null/undefined');
    }
    
    if (!options) {
        throw new Error('Ошибка: параметр options не передан или равен null/undefined');
    }
    
    const { calculateRevenue, calculateBonus } = options;
    
    if (!calculateRevenue || typeof calculateRevenue !== 'function') {
        throw new Error('Ошибка: в options не передана функция calculateRevenue или она не является функцией');
    }
    
    if (!calculateBonus || typeof calculateBonus !== 'function') {
        throw new Error('Ошибка: в options не передана функция calculateBonus или она не является функцией');
    }
    
    const { sellers, products, purchase_records } = data;
    
    if (!sellers || !Array.isArray(sellers) || sellers.length === 0) {
        throw new Error('Ошибка: в data отсутствует коллекция sellers или она пуста');
    }
    
    if (!products || !Array.isArray(products) || products.length === 0) {
        throw new Error('Ошибка: в data отсутствует коллекция products или она пуста');
    }
    
    if (!purchase_records || !Array.isArray(purchase_records) || purchase_records.length === 0) {
        throw new Error('Ошибка: в data отсутствует коллекция purchase_records или она пуста');
    }
    
    // Создаём индексы для быстрого доступа
    const productsMap = new Map();
    products.forEach(product => {
        productsMap.set(product.sku, product);
    });
    
    // Инициализируем статистику продавцов
    const sellersStats = new Map();
    sellers.forEach(seller => {
        sellersStats.set(seller.id, {
            seller_id: seller.id,
            name: `${seller.first_name} ${seller.last_name}`,
            revenue: 0,
            profit: 0,
            sales_count: 0,
            products_sold: {},
            total_cost: 0
        });
    });
    
    // Обрабатываем чеки
    for (const receipt of purchase_records) {
        const sellerStat = sellersStats.get(receipt.seller_id);
        if (!sellerStat) continue;
        
        sellerStat.sales_count++;
        
        for (const item of receipt.items) {
            const product = productsMap.get(item.sku);
            if (!product) continue;
            
            // Вычисляем выручку через переданную функцию
            const revenue = calculateRevenue(item, product);
            sellerStat.revenue += revenue;
            
            // Вычисляем себестоимость
            const cost = product.purchase_price * item.quantity;
            sellerStat.total_cost += cost;
            
            // Обновляем количество проданных товаров
            if (!sellerStat.products_sold[item.sku]) {
                sellerStat.products_sold[item.sku] = 0;
            }
            sellerStat.products_sold[item.sku] += item.quantity;
        }
    }
    
    // Вычисляем прибыль
    for (const [_, stat] of sellersStats) {
        stat.profit = stat.revenue - stat.total_cost;
    }
    
    // Преобразуем в массив и сортируем по прибыли
    let sellersList = Array.from(sellersStats.values());
    sellersList.sort((a, b) => b.profit - a.profit);
    
    // Формируем топ-10 товаров и рассчитываем бонусы
    const total = sellersList.length;
    sellersList = sellersList.map((seller, index) => {
        // Формируем топ-10 товаров
        const topProducts = Object.entries(seller.products_sold)
            .map(([sku, quantity]) => ({ sku, quantity }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);
        
        // Рассчитываем бонус
        const bonusPercent = calculateBonus(index, total, seller);
        const bonus = (seller.profit * bonusPercent) / 100;
        
        return {
            seller_id: seller.seller_id,
            name: seller.name,
            revenue: Math.round(seller.revenue * 100) / 100,
            profit: Math.round(seller.profit * 100) / 100,
            sales_count: seller.sales_count,
            top_products: topProducts,
            bonus: Math.round(bonus * 100) / 100
        };
    });
    
    return sellersList;
}
