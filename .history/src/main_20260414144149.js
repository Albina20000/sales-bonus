/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
    const discountFactor = 1 - (purchase.discount / 100);
    const revenue = purchase.sale_price * purchase.quantity * discountFactor;
    // Округляем до 2 знаков
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
    // Округляем до 2 знаков
    return Math.round(bonus * 100) / 100;
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
