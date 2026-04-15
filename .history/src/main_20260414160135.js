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
    if (index === 0) return seller.profit * 0.15;
    if (index === 1 || index === 2) return seller.profit * 0.10;
    if (index === total - 1) return 0;
    return seller.profit * 0.05;
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
    // ===== ПРОВЕРКИ =====
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
    
    // Создаем карты для быстрого доступа
    const productsMap = new Map(products.map(p => [p.sku, p]));
    const sellersMap = new Map(sellers.map(s => [s.id, {
        seller_id: s.id,
        name: `${s.first_name} ${s.last_name}`,
        revenue: 0,
        profit: 0,
        sales_count: 0,
        products_sold: {},
        total_cost: 0
    }]));
    
    // Обрабатываем чеки
    for (const receipt of purchase_records) {
        const seller = sellersMap.get(receipt.seller_id);
        if (!seller) continue;
        
        seller.sales_count++;
        
        for (const item of receipt.items) {
            const product = productsMap.get(item.sku);
            if (!product) continue;
            
            const revenue = calculateRevenue(item, product);
            const cost = product.purchase_price * item.quantity;
            
            seller.revenue += revenue;
            seller.total_cost += cost;
            seller.products_sold[item.sku] = (seller.products_sold[item.sku] || 0) + item.quantity;
        }
    }
    
    // Вычисляем прибыль
    for (const seller of sellersMap.values()) {
        seller.profit = seller.revenue - seller.total_cost;
    }
    
    // Сортируем
    const sellersList = Array.from(sellersMap.values());
    sellersList.sort((a, b) => b.profit - a.profit);
    
    // Формируем результат
    const total = sellersList.length;
    return sellersList.map((seller, index) => ({
        seller_id: seller.seller_id,
        name: seller.name,
        revenue: Math.round(seller.revenue * 100) / 100,
        profit: Math.round(seller.profit * 100) / 100,
        sales_count: seller.sales_count,
        top_products: Object.entries(seller.products_sold)
            .map(([sku, quantity]) => ({ sku, quantity }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10),
        bonus: Math.round(calculateBonus(index, total, seller) * 100) / 100
    }));
}
