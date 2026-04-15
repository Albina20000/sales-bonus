/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
    // Коэффициент для расчета суммы без скидки в десятичном формате
    const discount = 1 - (purchase.discount / 100);
    // Выручка: sale_price × количество × коэффициент скидки
    return purchase.sale_price * purchase.quantity * discount;
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
    const { profit } = seller;
    
    // Первое место — бонус 15%
    if (index === 0) {
        return profit * 0.15;
    }
    // Второе и третье место — бонус 10%
    if (index === 1 || index === 2) {
        return profit * 0.10;
    }
    // Последнее место — бонус 0%
    if (index === total - 1) {
        return 0;
    }
    // Все остальные — бонус 5%
    return profit * 0.05;
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
    // ===== ПРОВЕРКИ =====
    if (!data
        || !Array.isArray(data.sellers)
        || data.sellers.length === 0
        || !Array.isArray(data.products)
        || data.products.length === 0
        || !Array.isArray(data.purchase_records)
        || data.purchase_records.length === 0
    ) {
        throw new Error('Некорректные входные данные');
    }
    
    const { calculateRevenue, calculateBonus } = options || {};
    
    if (!calculateRevenue || !calculateBonus) {
        throw new Error('Чего-то не хватает');
    }
    
    // ===== ПРОМЕЖУТОЧНЫЕ ДАННЫЕ =====
    const sellerStats = data.sellers.map(seller => ({
        seller_id: seller.id,
        name: `${seller.first_name} ${seller.last_name}`,
        revenue: 0,
        profit: 0,
        sales_count: 0,
        products_sold: {},
        total_cost: 0
    }));
    
    // ===== ИНДЕКСЫ =====
    const sellerIndex = Object.fromEntries(
        sellerStats.map(stat => [stat.seller_id, stat])
    );
    
    const productIndex = Object.fromEntries(
        data.products.map(product => [product.sku, product])
    );
    
    // ===== ОБРАБОТКА ЧЕКОВ =====
    for (const record of data.purchase_records) {
        const seller = sellerIndex[record.seller_id];
        if (!seller) continue;
        
        seller.sales_count++;
        
        for (const item of record.items) {
            const product = productIndex[item.sku];
            if (!product) continue;
            
            // Округляем КАЖДЫЙ товар до 2 знаков
            const revenue = Math.round(calculateRevenue(item, product) * 100) / 100;
            const cost = Math.round(product.purchase_price * item.quantity * 100) / 100;
            
            seller.revenue = Math.round((seller.revenue + revenue) * 100) / 100;
            seller.total_cost = Math.round((seller.total_cost + cost) * 100) / 100;
            
            if (!seller.products_sold[item.sku]) {
                seller.products_sold[item.sku] = 0;
            }
            seller.products_sold[item.sku] += item.quantity;
        }
    }
    
    // ===== РАСЧЁТ ПРИБЫЛИ =====
    for (const seller of sellerStats) {
        seller.profit = Math.round((seller.revenue - seller.total_cost) * 100) / 100;
    }
    
    // ===== СОРТИРОВКА =====
    sellerStats.sort((a, b) => b.profit - a.profit);
    
    // ===== ФОРМИРОВАНИЕ РЕЗУЛЬТАТА =====
    const total = sellerStats.length;
    
    for (let i = 0; i < sellerStats.length; i++) {
        const seller = sellerStats[i];
        seller.bonus = Math.round(calculateBonus(i, total, seller) * 100) / 100;
        seller.top_products = Object.entries(seller.products_sold)
            .map(([sku, quantity]) => ({ sku, quantity }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);
    }
    
    return sellerStats.map(seller => ({
        seller_id: seller.seller_id,
        name: seller.name,
        revenue: seller.revenue,
        profit: seller.profit,
        sales_count: seller.sales_count,
        top_products: seller.top_products,
        bonus: seller.bonus
    }));
}
