import { CameraIcon } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import ImageCropDialog from '@/components/media/ImageCropDialog'
import UserAvatar from '@/components/UserAvatar'
import { Button } from '@/components/ui/button'
import { FileUpload, FileUploadTrigger } from '@/components/ui/file-upload'
import { AVATAR_MAX_SIZE } from '@/schemas/profile'

/**
 * The picture of a user as a form field: pick one (Dice UI's file upload), crop it to a
 * circle (Dice UI's cropper), and see it in place before saving. `value` is the new,
 * cropped picture, or undefined to keep `currentUrl`.
 */
export default function AvatarField({
  name,
  currentUrl,
  value,
  onChange,
  onRemove,
  removing,
}: {
  name: string
  currentUrl: string | null
  value: File | undefined
  onChange: (file: File | undefined) => void
  // Removing is its own mutation (removeAvatar): it happens at once.
  onRemove: () => void
  removing?: boolean
}) {
  const [picked, setPicked] = useState<File | null>(null)
  const preview = useMemo(() => (value ? URL.createObjectURL(value) : null), [value])
  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview])

  return (
    <div className="flex items-center gap-4">
      <UserAvatar name={name || '?'} src={preview ?? currentUrl} className="size-20 text-xl" />

      <div className="flex flex-col items-start gap-1">
        <FileUpload value={[]} onValueChange={(files) => files[0] && setPicked(files[0])} accept="image/*" maxFiles={1} maxSize={AVATAR_MAX_SIZE}>
          <FileUploadTrigger asChild>
            <Button type="button" variant="outline" size="sm">
              <CameraIcon />
              Change photo
            </Button>
          </FileUploadTrigger>
        </FileUpload>

        {value ? (
          <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={() => onChange(undefined)}>
            Keep the current one
          </Button>
        ) : (
          currentUrl && (
            <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" disabled={removing} onClick={onRemove}>
              Remove photo
            </Button>
          )
        )}
      </div>

      <ImageCropDialog file={picked} onOpenChange={(open) => !open && setPicked(null)} onCropped={onChange} shape="circle" title="Crop your photo" />
    </div>
  )
}
