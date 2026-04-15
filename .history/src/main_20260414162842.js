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
    // ПРОВЕРКИ
    if (!data) {
        throw new Error('Ошибка: параметр data не передан или равен null/undefined');
    }
    if (!options) {
        throw new Error('Ошибка: параметр options не передан или равен null/undefined');
    }
    
    const { calculateRevenue, calculateBonus } = options;
    
    if (!calculateRevenue) {
        throw new Error('Ошибка: в options не передана функция calculateRevenue');
    }
    if (typeof calculateRevenue !== 'function') {
        throw new Error('Ошибка: calculateRevenue должна быть функцией');
    }
    if (!calculateBonus) {
        throw new Error('Ошибка: в options не передана функция calculateBonus');
    }
    if (typeof calculateBonus !== 'function') {
        throw new Error('Ошибка: calculateBonus должна быть функцией');
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
    
    // Индексы для быстрого доступа
    const productMap = new Map();
    products.forEach(product => {
        productMap.set(product.sku, product);
    });
    
    // Статистика продавцов
    const stats = new Map();
    sellers.forEach(seller => {
        stats.set(seller.id, {
            seller_id: seller.id,
            name: `${seller.first_name} ${seller.last_name}`,
            revenue: 0,
            profit: 0,
            sales_count: 0,
            products_sold: {},
            total_cost: 0
        });
    });
    
    // Обработка чеков
    for (const record of purchase_records) {
        const seller = stats.get(record.seller_id);
        if (!seller) continue;
        
        seller.sales_count++;
        
        for (const item of record.items) {
            const product = productMap.get(item.sku);
            if (!product) continue;
            
            const revenue = calculateRevenue(item, product);
            const cost = product.purchase_price * item.quantity;
            
            seller.revenue += revenue;
            seller.total_cost += cost;
            
            seller.products_sold[item.sku] = (seller.products_sold[item.sku] || 0) + item.quantity;
        }
    }
    
    // Расчёт прибыли
    for (const seller of stats.values()) {
        seller.profit = seller.revenue - seller.total_cost;
    }
    
    // Сортировка
    const sellersList = Array.from(stats.values());
    sellersList.sort((a, b) => b.profit - a.profit);
    
    // Формирование результата
    const total = sellersList.length;
    const result = [];
    
    for (let i = 0; i < sellersList.length; i++) {
        const seller = sellersList[i];
        
        // Топ-10 товаров
        const topProducts = Object.entries(seller.products_sold)
            .map(([sku, quantity]) => ({ sku, quantity }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);
        
        // Бонус
        const bonusPercent = calculateBonus(i, total, seller);
        const bonus = (seller.profit * bonusPercent) / 100;
        
        result.push({
            seller_id: seller.seller_id,
            name: seller.name,
            revenue: Number(seller.revenue.toFixed(2)),
            profit: Number(seller.profit.toFixed(2)),
            sales_count: seller.sales_count,
            top_products: topProducts,
            bonus: Number(bonus.toFixed(2))
        });
    }
    
    return result;
}
