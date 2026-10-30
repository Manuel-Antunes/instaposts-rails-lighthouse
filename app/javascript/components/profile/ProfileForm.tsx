import { Controller } from 'react-hook-form'

import AvatarField from '@/components/media/AvatarField'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useRemoveAvatar, useUpdateProfile } from '@/hooks/use-profile'
import { useZodForm } from '@/hooks/use-zod-form'
import { userPath } from '@/lib/paths'
import { profileSchema } from '@/schemas/profile'

/**
 * How others see the user: name and picture, saved with updateProfile on /graphql (the
 * picture as a multipart upload). Removing the picture is its own mutation, and at once.
 */
export default function ProfileForm({ user }: { user: { name: string; username: string; avatarUrl?: string | null } }) {
  const { form, submit } = useZodForm(profileSchema, { defaultValues: { name: user.name, username: user.username, avatar: undefined } })
  const [updateProfile] = useUpdateProfile()
  const [removeAvatar, { loading: removing }] = useRemoveAvatar()

  const onSubmit = submit(async ({ name, username, avatar }) => {
    // Without a new picture the avatar is left out: null would reach @update and remove the current one.
    await updateProfile({ variables: { name, username, avatar } })
    form.reset({ name, username, avatar: undefined })
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>How others see you on your posts and comments.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit}>
          <FieldGroup>
            <Controller
              name="avatar"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <AvatarField
                    name={form.watch('name')}
                    currentUrl={user.avatarUrl ?? null}
                    value={field.value}
                    onChange={field.onChange}
                    onRemove={() => void removeAvatar().catch(() => undefined)}
                    removing={removing}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="profile-name">Name</FieldLabel>
                  <Input {...field} id="profile-name" autoComplete="name" aria-invalid={fieldState.invalid} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Controller
              name="username"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="profile-username">Username</FieldLabel>
                  <div className="relative">
                    <span aria-hidden className="absolute inset-y-0 left-2.5 flex items-center text-sm text-muted-foreground">
                      @
                    </span>
                    <Input {...field} id="profile-username" autoCapitalize="none" autoComplete="username" spellCheck={false} aria-invalid={fieldState.invalid} className="pl-6" />
                  </div>
                  <FieldDescription>Your page is {userPath(field.value || 'username')}. Lowercase letters, numbers, underscores and periods.</FieldDescription>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <FieldError errors={[form.formState.errors.root?.server]} />

            <div className="flex items-center gap-3">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Saving…' : 'Save profile'}
              </Button>
              {form.formState.isSubmitSuccessful && <span className="text-sm text-muted-foreground">Saved.</span>}
            </div>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}
