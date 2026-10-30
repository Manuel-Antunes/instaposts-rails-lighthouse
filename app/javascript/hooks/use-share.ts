import { usePage } from '@inertiajs/react'
import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Share a page of the site: its absolute URL is the site's address (`site_url`, shared by
 * Rails: APP_URL, else the request's) plus the path Rails gave. On phones this opens the
 * system share sheet; elsewhere it copies the link, and `copied` is true for a moment.
 */
export function useShare(path: string, title: string) {
  const { site_url } = usePage().props
  const url = `${site_url}${path}`
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])

  const share = useCallback(async () => {
    // Copy where the Clipboard API is missing (a page on plain http that is not localhost).
    const copyWithSelection = (text: string) => {
      const field = document.createElement('textarea')
      field.value = text
      field.style.position = 'fixed'
      field.style.opacity = '0'
      document.body.append(field)
      field.select()
      const copied = document.execCommand('copy')
      field.remove()
      return copied
    }

    try {
      // Desktop browsers that have share() open a sheet nobody expects: copy instead.
      if (typeof navigator.share === 'function' && window.matchMedia('(pointer: coarse)').matches) {
        await navigator.share({ title, url })
        return
      }
      if (navigator.clipboard) await navigator.clipboard.writeText(url)
      else if (!copyWithSelection(url)) return

      setCopied(true)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setCopied(false), 2000)
    } catch {
      // The user closed the share sheet, or the browser refused to copy.
    }
  }, [title, url])

  return { url, share, copied }
}
