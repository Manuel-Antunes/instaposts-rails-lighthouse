import { CropIcon, ImagePlusIcon, XIcon } from 'lucide-react'
import { useState } from 'react'

import ImageCropDialog from '@/components/media/ImageCropDialog'
import { Button } from '@/components/ui/button'
import {
  FileUpload,
  FileUploadDropzone,
  FileUploadItem,
  FileUploadItemDelete,
  FileUploadItemMetadata,
  FileUploadItemPreview,
  FileUploadList,
  FileUploadTrigger,
} from '@/components/ui/file-upload'
import { MAX_MEDIA_FILES, MAX_MEDIA_SIZE, type PickedMedia } from '@/schemas/post'

// What to upload: the crop when there is one, in the order picked.
export const filesToUpload = (media: PickedMedia[]) => media.map((item) => item.cropped ?? item.file)

/**
 * Dice UI's file upload (registry @diceui): drop or pick up to 10 images and videos, see
 * them, crop an image to a square as Instagram shows it, remove one.
 */
export default function MediaPicker({ value, onChange, disabled }: { value: PickedMedia[]; onChange: (media: PickedMedia[]) => void; disabled?: boolean }) {
  const [cropping, setCropping] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const croppedOf = new Map(value.map((item) => [item.file, item.cropped]))

  const onFilesChange = (files: File[]) => {
    setError(null)
    onChange(files.map((file) => ({ file, cropped: croppedOf.get(file) })))
  }

  return (
    <>
      <FileUpload
        value={value.map((item) => item.file)}
        onValueChange={onFilesChange}
        onFileReject={(file, message) => setError(`${file.name}: ${message}`)}
        accept="image/*,video/*"
        maxFiles={MAX_MEDIA_FILES}
        maxSize={MAX_MEDIA_SIZE}
        multiple
        disabled={disabled}
        className="w-full"
      >
        <FileUploadDropzone className="min-h-32">
          <div className="flex flex-col items-center gap-2 text-center">
            <ImagePlusIcon className="size-8 text-muted-foreground" />
            <p className="text-sm font-medium">Drop photos and videos here</p>
            <p className="text-xs text-muted-foreground">Up to {MAX_MEDIA_FILES} files, 50 MB each</p>
            <FileUploadTrigger asChild>
              <Button type="button" variant="outline" size="sm">
                Choose files
              </Button>
            </FileUploadTrigger>
          </div>
        </FileUploadDropzone>

        <FileUploadList>
          {value.map(({ file, cropped }) => (
            <FileUploadItem key={`${file.name}-${file.lastModified}-${file.size}`} value={file}>
              <FileUploadItemPreview
                render={(original, fallback) =>
                  cropped ? <img src={URL.createObjectURL(cropped)} alt={original.name} className="size-full object-cover" /> : fallback()
                }
              />
              <FileUploadItemMetadata />
              <div className="flex gap-1">
                {file.type.startsWith('image/') && (
                  <Button type="button" variant="ghost" size="icon" className="size-8" aria-label={`Crop ${file.name}`} onClick={() => setCropping(file)}>
                    <CropIcon />
                  </Button>
                )}
                <FileUploadItemDelete asChild>
                  <Button type="button" variant="ghost" size="icon" className="size-8" aria-label={`Remove ${file.name}`}>
                    <XIcon />
                  </Button>
                </FileUploadItemDelete>
              </div>
            </FileUploadItem>
          ))}
        </FileUploadList>
      </FileUpload>
      {error && <p className="text-sm text-destructive">{error}</p>}

      <ImageCropDialog
        file={cropping}
        onOpenChange={(open) => !open && setCropping(null)}
        onCropped={(croppedFile) => onChange(value.map((item) => (item.file === cropping ? { ...item, cropped: croppedFile } : item)))}
        title="Crop to a square"
      />
    </>
  )
}
