import { NseApi } from "../../http-common"


export const MainBoardData = async (sort) => {
    return await NseApi.get(`/mainboard/sort/${sort}`, {

    })
}