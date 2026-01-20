import { NseApi } from "../../http-common"

export const MainBoardData = async (sort) => {
    return await NseApi.get(`/mainboard/sort/${sort}`, {

    })
}

export const SMEData = async (sort) => {
    return await NseApi.get(`/sme/sort/${sort}`, {

    })
}

export const ETFSData = async (sort) => {
    return await NseApi.get(`/etf/sort/${sort}`, {

    })
}

export const PriceSpurts = async (priceFilter) => {
    return await NseApi.get(`/price-spurts/${priceFilter}`, {

    })
}

export const VolumeSpurts = async()=>{
    return await NseApi.get(`/volume-spurts/top-gainers`, {

    })
}