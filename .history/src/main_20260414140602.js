/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
    // Расчёт коэффициента скидки в десятичном формате
    const discount = 1 - (purchase.discount / 100);
    
    // Расчёт выручки: sale_price × quantity × discount
    const revenue = purchase.sale_price * purchase.quantity * discount;
    
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
    // Первое место (индекс 0) — бонус 15%
    if (index === 0) {
        return 15;
    } 
    // Второе и третье место (индексы 1 и 2) — бонус 10%
    else if (index === 1 || index === 2) {
        return 10;
    } 
    // Последнее место (индекс total - 1) — бонус 0%
    else if (index === total - 1) {
        return 0;
    } 
    // Все остальные продавцы — бонус 5%
    else {
        return 5;
    }
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
    
    // ===== ПОДГОТОВКА ПРОМЕЖУТОЧНЫХ ДАННЫХ =====
    const sellerStats = data.sellers.map(seller => ({
        seller_id: seller.id,
        name: `${seller.first_name} ${seller.last_name}`,
        revenue: 0,
        profit: 0,
        total_cost: 0,
        sales_count: 0,
        products_sold: {}
    }));
    
    // ===== СОЗДАНИЕ ИНДЕКСОВ =====
    const sellerIndex = Object.fromEntries(
        sellerStats.map(stat => [stat.seller_id, stat])
    );
    
    const productIndex = Object.fromEntries(
        data.products.map(product => [product.sku, product])
    );
    
    // ===== ДВОЙНОЙ ЦИКЛ ПЕРЕБОРА ЧЕКОВ И ПОКУПОК =====
    data.purchase_records.forEach(record => {
        const seller = sellerIndex[record.seller_id];
        
        if (!seller) {
            return;
        }
        
        seller.sales_count++;
        
        let receiptRevenue = 0;
        let receiptCost = 0;
        
        record.items.forEach(item => {
            const product = productIndex[item.sku];
            
            if (!product) {
                return;
            }
            
            const cost = product.purchase_price * item.quantity;
            receiptCost += cost;
            
            const revenue = calculateRevenue(item, product);
            receiptRevenue += revenue;
            
            seller.profit += (revenue - cost);
            
            if (!seller.products_sold[item.sku]) {
                seller.products_sold[item.sku] = 0;
            }
            seller.products_sold[item.sku] += item.quantity;
        });
        
        seller.revenue += receiptRevenue;
        seller.total_cost += receiptCost;
    });
    
    // ===== СОРТИРУЕМ ПРОДАВЦОВ ПО ПРИБЫЛИ =====
    const sortedSellerStats = sellerStats.toSorted((a, b) => b.profit - a.profit);
    
    // ===== ШАГ 4: ФОРМИРОВАНИЕ ИТОГОВОГО ОТЧЁТА =====
    const total = sortedSellerStats.length;
    
    return sortedSellerStats.map((seller, index) => {
        // Рассчитываем бонус
        const bonusPercent = calculateBonus(index, total, seller);
        const bonus = seller.profit * bonusPercent / 100;
        
        // Формируем топ-10 продуктов
        const topProducts = Object.entries(seller.products_sold)
            .map(([sku, quantity]) => ({ sku, quantity }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);
        
        // Возвращаем отформатированный результат
        return {
            seller_id: seller.seller_id,
            name: seller.name,
            revenue: +seller.revenue.toFixed(2),
            profit: +seller.profit.toFixed(2),
            sales_count: seller.sales_count,
            top_products: topProducts,
            bonus: +bonus.toFixed(2)
        };
    });
}
