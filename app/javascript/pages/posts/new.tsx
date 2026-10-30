import { Head, Link, router } from '@inertiajs/react'
import type { ReactNode } from 'react'
import { Controller } from 'react-hook-form'

import MediaPicker, { filesToUpload } from '@/components/media/MediaPicker'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useCreatePost } from '@/hooks/use-posts'
import { useZodForm } from '@/hooks/use-zod-form'
import AppLayout from '@/layouts/AppLayout'
import { postSchema } from '@/schemas/post'

export default function New() {
  // The server's errors for the files (`assets[1].file`) go under the picker.
  const { form, submit } = useZodForm(postSchema, {
    defaultValues: { name: '', content: '', media: [] },
    serverErrors: { fields: { assets: 'media' }, fallback: 'Could not publish the post.' },
  })
  const [createPost] = useCreatePost()

  const onSubmit = submit(async ({ name, content, media }) => {
    const { data } = await createPost({ variables: { name, content, files: filesToUpload(media) } })
    if (data?.createPost) router.visit(data.createPost.path)
  })

  return (
    <>
      <Head title="New post" />

      <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
        ← Feed
      </Link>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>New post</CardTitle>
        </CardHeader>

        <CardContent>
          <form onSubmit={onSubmit}>
            <FieldGroup>
              <Controller
                name="media"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>Photos and videos</FieldLabel>
                    <MediaPicker value={field.value} onChange={field.onChange} disabled={form.formState.isSubmitting} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                name="name"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="name">Title</FieldLabel>
                    <Input {...field} id="name" aria-invalid={fieldState.invalid} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                name="content"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="content">Caption</FieldLabel>
                    <Textarea {...field} id="content" rows={6} aria-invalid={fieldState.invalid} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <FieldError errors={[form.formState.errors.root?.server]} />

              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Publishing…' : 'Publish'}
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </>
  )
}

New.layout = (page: ReactNode) => <AppLayout>{page}</AppLayout>
