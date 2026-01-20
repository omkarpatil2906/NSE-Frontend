import { NseApi } from "../../http-common"

export const StockChartData = async (symbol, duration) => {
    return await NseApi.get(`/stock-details/chart/${symbol}/${duration}`, {

    })
}