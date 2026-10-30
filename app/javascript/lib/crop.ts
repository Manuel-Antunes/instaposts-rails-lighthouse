import type { CropperAreaData } from '@/components/ui/cropper'

/**
 * The part of an image the cropper selected, as a new File: drawn on a canvas in the
 * browser, so only the cropped picture is uploaded. PNGs stay PNGs (transparency), the
 * rest becomes JPEG.
 */
export function cropImage(file: File, area: CropperAreaData): Promise<File> {
  const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
  const url = URL.createObjectURL(file)
  const image = new Image()

  return new Promise<File>((resolve, reject) => {
    image.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(area.width)
      canvas.height = Math.round(area.height)
      const context = canvas.getContext('2d')
      if (!context) return reject(new Error('This browser cannot crop images.'))

      context.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(
        (blob) => (blob ? resolve(new File([blob], file.name.replace(/\.\w+$/, type === 'image/png' ? '.png' : '.jpg'), { type })) : reject(new Error('Could not crop the image.'))),
        type,
        0.9,
      )
    }
    image.onerror = () => reject(new Error('Could not read the image.'))
    image.src = url
  }).finally(() => URL.revokeObjectURL(url))
}
