import { Form, Head, Link } from '@inertiajs/react'
import type { ReactNode } from 'react'

import FieldError from '@/components/FieldError'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import AppLayout from '@/layouts/AppLayout'

export default function New() {
  return (
    <>
      <Head title="New post" />

      <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
        ← All posts
      </Link>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>New post</CardTitle>
        </CardHeader>

        <CardContent>
          <Form action="/posts" method="post" className="space-y-4">
            {({ errors, processing }) => (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">Title</Label>
                  <Input id="name" name="name" />
                  <FieldError label="Title" messages={errors.name} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content">Content</Label>
                  <Textarea id="content" name="content" rows={10} />
                  <FieldError label="Content" messages={errors.content} />
                </div>

                <Button type="submit" disabled={processing}>
                  {processing ? 'Publishing…' : 'Publish'}
                </Button>
              </>
            )}
          </Form>
        </CardContent>
      </Card>
    </>
  )
}

New.layout = (page: ReactNode) => <AppLayout>{page}</AppLayout>
