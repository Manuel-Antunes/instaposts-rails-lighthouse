// What the forms accept before anything is sent: the zod schemas, as the browser runs them.
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { COMMENT_MAX_LENGTH, commentSchema } from '../../app/javascript/schemas/comment.ts'
import { MAX_MEDIA_FILES, postSchema } from '../../app/javascript/schemas/post.ts'
import { AVATAR_MAX_SIZE, profileSchema } from '../../app/javascript/schemas/profile.ts'

const messages = (result: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } }) =>
  result.error?.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`) ?? []

test('a comment is trimmed, and neither blank nor longer than Instagram allows', () => {
  assert.deepEqual(commentSchema.parse({ body: '  Nice!  ' }), { body: 'Nice!' })
  assert.deepEqual(messages(commentSchema.safeParse({ body: '   ' })), ['body: Write something to comment.'])
  assert.equal(commentSchema.safeParse({ body: 'x'.repeat(COMMENT_MAX_LENGTH) }).success, true)
  assert.deepEqual(messages(commentSchema.safeParse({ body: 'x'.repeat(COMMENT_MAX_LENGTH + 1) })), [`body: A comment has at most ${COMMENT_MAX_LENGTH} characters.`])
})

test('a post needs a title and a caption, and takes at most 10 files', () => {
  const file = (name: string) => ({ file: new File(['x'], name, { type: 'image/png' }) })

  assert.equal(postSchema.safeParse({ name: ' Trip ', content: 'Pictures', media: [file('a.png')] }).success, true)
  assert.deepEqual(postSchema.parse({ name: ' Trip ', content: ' Pictures ', media: [] }), { name: 'Trip', content: 'Pictures', media: [] })
  assert.deepEqual(messages(postSchema.safeParse({ name: '', content: '  ', media: [] })), ['name: Give the post a title.', 'content: Write a caption.'])
  assert.deepEqual(messages(postSchema.safeParse({ name: 'x'.repeat(256), content: 'c', media: [] })), ['name: The title has at most 255 characters.'])

  const many = Array.from({ length: MAX_MEDIA_FILES + 1 }, (_, i) => file(`${i}.png`))
  assert.deepEqual(messages(postSchema.safeParse({ name: 'x', content: 'c', media: many })), [`media: A post has at most ${MAX_MEDIA_FILES} files.`])
  assert.equal(postSchema.safeParse({ name: 'x', content: 'c', media: ['not a file'] }).success, false)
})

test('a profile has a name, a username like Instagram\'s, and a new picture that is a small image', () => {
  const picture = (type: string, size = 10) => new File([new Uint8Array(size)], 'me', { type })
  const profile = { name: 'Alice', username: 'alice' }

  assert.equal(profileSchema.safeParse(profile).success, true)
  assert.equal(profileSchema.safeParse({ ...profile, avatar: picture('image/png') }).success, true)
  assert.deepEqual(messages(profileSchema.safeParse({ ...profile, name: ' ' })), ['name: Your name cannot be blank.'])
  assert.deepEqual(messages(profileSchema.safeParse({ ...profile, avatar: picture('text/plain') })), ['avatar: The picture must be an image.'])
  assert.deepEqual(messages(profileSchema.safeParse({ ...profile, avatar: picture('image/png', AVATAR_MAX_SIZE + 1) })), ['avatar: The picture must be smaller than 5 MB.'])
})

test('a username is lowercase, trimmed, of letters, numbers, underscores and periods, up to 30', () => {
  const parse = (username: string) => profileSchema.safeParse({ name: 'A', username })

  assert.equal(parse('  Ana.Souza ').data?.username, 'ana.souza')
  for (const valid of ['a', 'ana_souza', '_ana', 'ana_', 'x.y.z', '1ana', 'a'.repeat(30)]) assert.equal(parse(valid).success, true, valid)
  for (const invalid of ['ana souza', 'ana-souza', 'ana@', 'ana..souza', 'ana.', '.ana', 'ünï', 'a'.repeat(31), '   ']) assert.equal(parse(invalid).success, false, invalid)
  // A form shows the first message of a field: the one that says what is missing.
  assert.equal(messages(parse('   '))[0], 'username: Pick a username.')
})
