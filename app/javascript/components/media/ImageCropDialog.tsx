import { useEffect, useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Cropper, CropperArea, type CropperAreaData, CropperImage, type CropperPoint, type CropperShape } from '@/components/ui/cropper'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { cropImage } from '@/lib/crop'

/**
 * Dice UI's cropper (registry @diceui) in a dialog: drag to frame, zoom with the slider,
 * then onCropped gets the cropped picture as a File (lib/crop.ts).
 */
export default function ImageCropDialog({
  file,
  onOpenChange,
  onCropped,
  aspectRatio = 1,
  shape = 'rectangle',
  title = 'Crop the picture',
}: {
  file: File | null
  onOpenChange: (open: boolean) => void
  onCropped: (file: File) => void
  aspectRatio?: number
  shape?: CropperShape
  title?: string
}) {
  const [crop, setCrop] = useState<CropperPoint>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [area, setArea] = useState<CropperAreaData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const url = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])

  useEffect(() => {
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setArea(null)
    setError(null)
    return () => {
      if (url) URL.revokeObjectURL(url)
    }
  }, [url])

  const apply = async () => {
    if (!file || !area) return
    try {
      onCropped(await cropImage(file, area))
      onOpenChange(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not crop the image.')
    }
  }

  return (
    <Dialog open={!!file} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Drag to frame it, and zoom with the slider.</DialogDescription>
        </DialogHeader>

        {file && url && (
          <div className="flex flex-col gap-4">
            <Cropper
              aspectRatio={aspectRatio}
              shape={shape}
              crop={crop}
              onCropChange={setCrop}
              zoom={zoom}
              onZoomChange={setZoom}
              onCropAreaChange={(_, pixels) => setArea(pixels)}
              onCropComplete={(_, pixels) => setArea(pixels)}
              className="h-80 rounded-md"
            >
              <CropperImage src={url} alt={file.name} />
              <CropperArea />
            </Cropper>
            <div className="flex flex-col gap-2">
              <Label className="text-sm">Zoom</Label>
              <Slider value={[zoom]} onValueChange={(value) => setZoom(value[0] ?? 1)} min={1} max={3} step={0.05} aria-label="Zoom" />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={apply} disabled={!area}>
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
