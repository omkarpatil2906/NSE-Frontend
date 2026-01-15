import { resortApi } from "../../http-common"

export const MainBoardData = async (symbol) => {
    return await resortApi.get(`/mainboard/symbol/${symbol}`, {

    })
}

export const SMEData = async (symbol) => {
    return await resortApi.get(`/sme/symbol/${symbol}`, {

    })
}

export const ETFSData = async (symbol) => {
    return await resortApi.get(`/etf/symbol/${symbol}`, {

    })
}

export const PriceSpurts = async (symbol) => {
    return await resortApi.get(`/pricespurts/symbol/${symbol}`, {

    })
}

export const VolumeSpurts = async()=>{
    return await resortApi.get(`/volume-spurts/top-gainers`, {

    })
}