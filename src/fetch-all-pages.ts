export interface PaginationParams extends Record<string, any> {
  per_page?: number
  page?: number
}

export async function fetchAllPages<P, R> (
  fetchFunction: (params: P & PaginationParams) => Promise<{ data: R[] }>,
  params: P
) {
  const per_page = 50
  let page = 1
  const result: R[] = []
  while (true) {
    const { data } = await fetchFunction({
      ...params,
      per_page,
      page
    })
    result.push(...data)

    if (data.length < per_page) {
      break
    }
    page++
  }

  return result
}
