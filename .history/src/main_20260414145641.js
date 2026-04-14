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
    // Возвращаем сумму бонуса в рублях, а не проценты
    return (seller.profit * percent) / 100;
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
    // Проверки
    if (!data || !options) {
        throw new Error('Некорректные входные данные');
    }
    
    const { calculateRevenue, calculateBonus } = options;
    if (!calculateRevenue || !calculateBonus) {
        throw new Error('Чего-то не хватает');
    }
    
    const { sellers, products, purchase_records } = data;
    if (!Array.isArray(sellers) || sellers.length === 0 ||
        !Array.isArray(products) || products.length === 0 ||
        !Array.isArray(purchase_records) || purchase_records.length === 0) {
        throw new Error('Некорректные входные данные');
    }
    
    // Индексы
    const sellerMap = new Map();
    const productMap = new Map();
    products.forEach(p => productMap.set(p.sku, p));
    
    // Статистика продавцов
    const stats = sellers.map(s => ({
        seller_id: s.id,
        name: `${s.first_name} ${s.last_name}`,
        revenue: 0,
        profit: 0,
        sales_count: 0,
        products_sold: {},
        total_cost: 0
    }));
    stats.forEach(s => sellerMap.set(s.seller_id, s));
    
    // Обработка чеков
    for (const receipt of purchase_records) {
        const seller = sellerMap.get(receipt.seller_id);
        if (!seller) continue;
        seller.sales_count++;
        
        for (const item of receipt.items) {
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
    for (const seller of stats) {
        seller.profit = seller.revenue - seller.total_cost;
    }
    
    // Сортировка по прибыли
    stats.sort((a, b) => b.profit - a.profit);
    
    // Формирование результата
    const total = stats.length;
    return stats.map((seller, index) => {
        const topProducts = Object.entries(seller.products_sold)
            .map(([sku, quantity]) => ({ sku, quantity }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);
        
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
