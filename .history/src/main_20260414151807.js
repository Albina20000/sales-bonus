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
    if (index === 0) {
        percent = 15;
    } else if (index === 1 || index === 2) {
        percent = 10;
    } else if (index === total - 1) {
        percent = 0;
    } else {
        percent = 5;
    }
    // Возвращаем сумму бонуса в рублях
    return (seller.profit * percent) / 100;
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
    
    if (!sellers) {
        throw new Error('Ошибка: в data отсутствует коллекция sellers');
    }
    if (!products) {
        throw new Error('Ошибка: в data отсутствует коллекция products');
    }
    if (!purchase_records) {
        throw new Error('Ошибка: в data отсутствует коллекция purchase_records');
    }
    if (!Array.isArray(sellers)) {
        throw new Error('Ошибка: sellers должен быть массивом');
    }
    if (!Array.isArray(products)) {
        throw new Error('Ошибка: products должен быть массивом');
    }
    if (!Array.isArray(purchase_records)) {
        throw new Error('Ошибка: purchase_records должен быть массивом');
    }
    if (sellers.length === 0) {
        throw new Error('Ошибка: массив sellers пуст');
    }
    if (products.length === 0) {
        throw new Error('Ошибка: массив products пуст');
    }
    if (purchase_records.length === 0) {
        throw new Error('Ошибка: массив purchase_records пуст');
    }
    
    // ===== СОЗДАНИЕ ИНДЕКСОВ =====
    const sellersMap = new Map();
    sellers.forEach(seller => {
        sellersMap.set(seller.id, {
            seller_id: seller.id,
            name: `${seller.first_name} ${seller.last_name}`,
            revenue: 0,
            profit: 0,
            sales_count: 0,
            products_sold: {},
            total_cost: 0
        });
    });
    
    const productsMap = new Map();
    products.forEach(product => {
        productsMap.set(product.sku, product);
    });
    
    // ===== ОБРАБОТКА ЧЕКОВ =====
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
            
            if (!seller.products_sold[item.sku]) {
                seller.products_sold[item.sku] = 0;
            }
            seller.products_sold[item.sku] += item.quantity;
        }
    }
    
    // ===== РАСЧЁТ ПРИБЫЛИ =====
    for (const seller of sellersMap.values()) {
        seller.profit = seller.revenue - seller.total_cost;
    }
    
    // ===== СОРТИРОВКА =====
    const sellersList = Array.from(sellersMap.values());
    sellersList.sort((a, b) => b.profit - a.profit);
    
    // ===== ФОРМИРОВАНИЕ РЕЗУЛЬТАТА =====
    const total = sellersList.length;
    
    return sellersList.map((seller, index) => {
        const topProducts = Object.entries(seller.products_sold)
            .map(([sku, quantity]) => ({ sku, quantity }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);
        
        // calculateBonus уже возвращает сумму бонуса
        const bonus = calculateBonus(index, total, seller);
        
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
}
