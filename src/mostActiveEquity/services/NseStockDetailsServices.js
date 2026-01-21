import { NseApi } from "../../http-common"

export const StockChartData = async (symbol, duration) => {
    return await NseApi.get(`/stock-details/chart/${symbol}/${duration}`, {

    })
}

export const StockInfoData = async (symbol) => {
    return await NseApi.get(`/stock-details/quote/${symbol}`, {
    })
}