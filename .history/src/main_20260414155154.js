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
    let percent;
    if (index === 0) percent = 15;
    else if (index === 1 || index === 2) percent = 10;
    else if (index === total - 1) percent = 0;
    else percent = 5;
    
    const bonus = (seller.profit * percent) / 100;
    return Math.round(bonus * 100) / 100;
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
    
    // ===== СОЗДАНИЕ ИНДЕКСОВ =====
    const productsMap = new Map();
    products.forEach(product => {
        productsMap.set(product.sku, product);
    });
    
    // ===== ИНИЦИАЛИЗАЦИЯ СТАТИСТИКИ ПРОДАВЦОВ (В КОПЕЙКАХ) =====
    const sellersStats = [];
    const sellersMap = new Map();
    
    sellers.forEach(seller => {
        const stats = {
            seller_id: seller.id,
            name: `${seller.first_name} ${seller.last_name}`,
            revenue_kop: 0,
            profit_kop: 0,
            sales_count: 0,
            products_sold: {},
            total_cost_kop: 0
        };
        sellersStats.push(stats);
        sellersMap.set(seller.id, stats);
    });
    
    // ===== ОБРАБОТКА ЧЕКОВ =====
    for (const receipt of purchase_records) {
        const seller = sellersMap.get(receipt.seller_id);
        if (!seller) continue;
        
        seller.sales_count++;
        
        for (const item of receipt.items) {
            const product = productsMap.get(item.sku);
            if (!product) continue;
            
            // Выручка в рублях -> переводим в копейки
            const revenue_rub = calculateRevenue(item, product);
            const revenue_kop = Math.round(revenue_rub * 100);
            
            // Себестоимость в копейках
            const cost_kop = Math.round(product.purchase_price * item.quantity * 100);
            
            seller.revenue_kop += revenue_kop;
            seller.total_cost_kop += cost_kop;
            
            if (!seller.products_sold[item.sku]) {
                seller.products_sold[item.sku] = 0;
            }
            seller.products_sold[item.sku] += item.quantity;
        }
    }
    
    // ===== РАСЧЁТ ПРИБЫЛИ В КОПЕЙКАХ =====
    for (const seller of sellersStats) {
        seller.profit_kop = seller.revenue_kop - seller.total_cost_kop;
    }
    
    // ===== СОРТИРОВКА =====
    sellersStats.sort((a, b) => b.profit_kop - a.profit_kop);
    
    // ===== ФОРМИРОВАНИЕ РЕЗУЛЬТАТА =====
    const total = sellersStats.length;
    
    return sellersStats.map((seller, index) => {
        const topProducts = Object.entries(seller.products_sold)
            .map(([sku, quantity]) => ({ sku, quantity }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);
        
        // Переводим прибыль в рубли для передачи в calculateBonus
        const sellerForBonus = {
            profit: seller.profit_kop / 100
        };
        
        // Бонус в рублях
        const bonus_rub = calculateBonus(index, total, sellerForBonus);
        const bonus_kop = Math.round(bonus_rub * 100);
        
        return {
            seller_id: seller.seller_id,
            name: seller.name,
            revenue: seller.revenue_kop / 100,
            profit: seller.profit_kop / 100,
            sales_count: seller.sales_count,
            top_products: topProducts,
            // bonus: bonus_kop / 100
        };
    });
}
