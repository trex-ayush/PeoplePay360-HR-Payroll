const DEFAULT_PAGE_SIZE = 25
const MAX_PAGE_SIZE = 200

// Lists are capped rather than returned whole. Serialising a full collection is a
// synchronous step, so one oversized response would hold up every other request
// behind it on the event loop.
export async function paginate(model, filter, { sort, populate = [], page, pageSize }) {
  const size = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(pageSize) || DEFAULT_PAGE_SIZE))
  const current = Math.max(1, Number(page) || 1)

  const [rows, total] = await Promise.all([
    model
      .find(filter)
      .populate(populate)
      .sort(sort)
      .skip((current - 1) * size)
      .limit(size),
    model.countDocuments(filter),
  ])

  return { rows, page: current, pageSize: size, total }
}
