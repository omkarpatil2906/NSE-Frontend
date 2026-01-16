import { resortApi } from "../../http-common"

export const MainBoardData = async (sort) => {
    return await resortApi.get(`/mainboard/sort/${sort}`, {

    })
}

export const SMEData = async (sort) => {
    return await resortApi.get(`/sme/sort/${sort}`, {

    })
}

export const ETFSData = async (sort) => {
    return await resortApi.get(`/etf/sort/${sort}`, {

    })
}

export const PriceSpurts = async (priceFilter) => {
    return await resortApi.get(`/price-spurts/${priceFilter}`, {

    })
}

export const VolumeSpurts = async()=>{
    return await resortApi.get(`/volume-spurts/top-gainers`, {

    })
}