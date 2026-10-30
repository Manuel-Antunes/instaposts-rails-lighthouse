import { useWindowVirtualizer, type VirtualItem } from '@tanstack/react-virtual'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'

/**
 * A list as long as the window scrolls, with only the rows in view in the DOM, that asks
 * for its next page (`fetchNext`) as the last rows come into view. Put `listRef` and the
 * `totalSize` height on the container, and each row `absolute`, measured with
 * `virtualizer.measureElement` and moved by `rowStyle`.
 *
 * `initialRect` is the window the server renders for: the browser's first render uses the
 * same, so both show the same first rows and hydration matches.
 */
export function useWindowVirtualList({
  count,
  estimateSize,
  getItemKey,
  initialRect,
  overscan = 2,
  hasNext,
  fetchNext,
  loadAhead = 2,
}: {
  count: number
  // What a row takes before it is measured.
  estimateSize: number
  getItemKey: (index: number) => string
  initialRect: { width: number; height: number }
  overscan?: number
  hasNext: boolean
  fetchNext: () => Promise<void>
  // Load the next page when the last row in view is this near the end.
  loadAhead?: number
}) {
  const listRef = useRef<HTMLDivElement>(null)
  const [scrollMargin, setScrollMargin] = useState(0)
  useLayoutEffect(() => setScrollMargin(listRef.current?.offsetTop ?? 0), [])

  const virtualizer = useWindowVirtualizer({
    count,
    estimateSize: () => estimateSize,
    overscan,
    scrollMargin,
    initialRect,
    initialOffset: 0,
    getItemKey,
  })

  // By the rows in view, not by the ones rendered ahead of them (overscan): a first page
  // that fits in the window asks for nothing.
  const lastInView = virtualizer.range?.endIndex ?? -1
  useEffect(() => {
    if (hasNext && lastInView >= count - loadAhead) void fetchNext()
  }, [hasNext, fetchNext, lastInView, count, loadAhead])

  return {
    listRef,
    virtualizer,
    rows: virtualizer.getVirtualItems(),
    totalSize: virtualizer.getTotalSize(),
    rowStyle: (row: VirtualItem) => ({ transform: `translateY(${row.start - scrollMargin}px)` }),
  }
}
